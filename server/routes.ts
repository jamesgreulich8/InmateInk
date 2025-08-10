import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLetterSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Basic content filtering - checks for inappropriate words
function filterContent(content: string): { flaggedWords: string[], severity: 'low' | 'medium' | 'high', requiresReview: boolean } {
  const highRiskWords = ['weapon', 'drug', 'escape', 'violence', 'threat'];
  const mediumRiskWords = ['money', 'transfer', 'payment', 'contraband'];
  const lowRiskWords = ['angry', 'upset', 'frustrated'];
  
  const words = content.toLowerCase().split(/\s+/);
  const flaggedWords: string[] = [];
  
  words.forEach(word => {
    if (highRiskWords.some(risk => word.includes(risk))) {
      flaggedWords.push(word);
    } else if (mediumRiskWords.some(risk => word.includes(risk))) {
      flaggedWords.push(word);
    } else if (lowRiskWords.some(risk => word.includes(risk))) {
      flaggedWords.push(word);
    }
  });
  
  let severity: 'low' | 'medium' | 'high' = 'low';
  let requiresReview = false;
  
  if (flaggedWords.some(word => highRiskWords.some(risk => word.includes(risk)))) {
    severity = 'high';
    requiresReview = true;
  } else if (flaggedWords.some(word => mediumRiskWords.some(risk => word.includes(risk)))) {
    severity = 'medium';
    requiresReview = true;
  } else if (flaggedWords.length > 0) {
    severity = 'low';
    requiresReview = false;
  }
  
  return { flaggedWords, severity, requiresReview };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Letter routes
  app.post('/api/letters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const letterData = insertLetterSchema.parse(req.body);
      
      // Check subscription limits
      if (letterData.paymentType === 'subscription') {
        if (user.subscriptionStatus !== 'active') {
          return res.status(400).json({ message: "Active subscription required" });
        }
        
        if ((user.lettersThisMonth || 0) >= 4) {
          return res.status(400).json({ message: "Monthly letter limit reached" });
        }
      }

      // Filter content
      const contentFilter = filterContent(letterData.content);
      
      // Create letter
      const letter = await storage.createLetter({
        ...letterData,
        userId,
        status: contentFilter.requiresReview ? 'pending' : 'approved',
      });

      // Create content filter record
      await storage.createContentFilter({
        letterId: letter.id,
        ...contentFilter,
      });

      // Update user letter count if subscription
      if (letterData.paymentType === 'subscription') {
        await storage.updateUserLetterCount(userId, (user.lettersThisMonth || 0) + 1);
      }

      res.json(letter);
    } catch (error) {
      console.error("Error creating letter:", error);
      res.status(500).json({ message: "Failed to create letter" });
    }
  });

  app.get('/api/letters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const letters = await storage.getLettersByUserId(userId);
      res.json(letters);
    } catch (error) {
      console.error("Error fetching letters:", error);
      res.status(500).json({ message: "Failed to fetch letters" });
    }
  });

  app.get('/api/letters/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const letter = await storage.getLetter(id);
      
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }

      // Check if user owns the letter or is admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (letter.userId !== userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(letter);
    } catch (error) {
      console.error("Error fetching letter:", error);
      res.status(500).json({ message: "Failed to fetch letter" });
    }
  });

  // Payment routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user.claims.sub,
          type: 'one-time-letter'
        }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        res.send({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        });

        return;
      }
      
      if (!user.email) {
        throw new Error('No user email on file');
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      });

      user = await storage.updateUserStripeInfo(user.id, customer.id);

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Monthly Letter Service',
              description: 'Up to 4 letters per month (1 per week)'
            },
            unit_amount: 999, // $9.99
            recurring: {
              interval: 'month'
            }
          }
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);
      await storage.updateUserSubscriptionStatus(user.id, 'active');
  
      res.send({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [userCount, letterCount, pendingCount, revenue] = await Promise.all([
        storage.getUserCount(),
        storage.getLetterCount(),
        storage.getPendingReviewCount(),
        storage.getRevenue(),
      ]);

      res.json({
        totalUsers: userCount,
        totalLetters: letterCount,
        pendingReview: pendingCount,
        revenue: revenue,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/letters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const letters = await storage.getAllLetters();
      res.json(letters);
    } catch (error) {
      console.error("Error fetching admin letters:", error);
      res.status(500).json({ message: "Failed to fetch letters" });
    }
  });

  app.patch('/api/admin/letters/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      const letter = await storage.updateLetterStatus(id, status, rejectionReason);
      res.json(letter);
    } catch (error) {
      console.error("Error updating letter status:", error);
      res.status(500).json({ message: "Failed to update letter status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
