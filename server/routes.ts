import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLetterSchema } from "@shared/schema";
import { emailService } from './emailService';
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// Comprehensive content filtering for correctional facility compliance
function filterContent(content: string): { flaggedWords: string[], severity: 'low' | 'medium' | 'high', requiresReview: boolean, reasons: string[] } {
  const text = content.toLowerCase();
  const words = text.split(/\s+/);
  const flaggedWords: string[] = [];
  const reasons: string[] = [];
  
  // High-risk categories (automatic rejection/review)
  const highRiskPatterns = {
    // Sexually explicit or suggestive content
    sexual: ['sexual', 'nude', 'naked', 'intimate', 'erotic', 'porn', 'masturbate', 'orgasm', 'climax', 'aroused', 'horny', 'seductive', 'seduce'],
    
    // Violent or threatening statements
    violence: ['kill', 'murder', 'stab', 'shoot', 'attack', 'assault', 'beat', 'hurt', 'harm', 'threaten', 'revenge', 'retaliate', 'payback'],
    
    // Weapons, drugs, gangs, illegal activities
    illegal: ['weapon', 'gun', 'knife', 'blade', 'pistol', 'rifle', 'drug', 'cocaine', 'heroin', 'meth', 'marijuana', 'weed', 'gang', 'dealer', 'smuggle', 'contraband'],
    
    // Escape plans and security threats
    security: ['escape', 'breakout', 'flee', 'run away', 'guard schedule', 'security', 'camera', 'patrol', 'fence', 'wall', 'exit', 'blueprint', 'layout'],
    
    // Financial transactions
    financial: ['send money', 'wire transfer', 'bank account', 'deposit', 'withdraw', 'paypal', 'venmo', 'cashapp', 'bitcoin', 'cryptocurrency']
  };
  
  // Medium-risk categories (requires review)
  const mediumRiskPatterns = {
    // Coded language indicators
    coded: ['code word', 'our friend', 'you know who', 'that thing', 'the package', 'business', 'take care of'],
    
    // Derogatory language (sample - would need extensive list)
    derogatory: ['hate', 'racist', 'stupid', 'idiot', 'scumbag', 'trash'],
    
    // Mentions of other inmates/staff
    people: ['inmate', 'prisoner', 'guard', 'officer', 'warden', 'staff member', 'co', 'cellmate'],
    
    // Contact information
    contact: ['http', 'www', 'facebook', 'instagram', 'twitter', 'snapchat', 'tiktok', '@', 'email', 'phone number', 'call me']
  };
  
  // Low-risk categories (flagged but may not require review)
  const lowRiskPatterns = {
    // Excessive legal discussion
    legal: ['lawsuit', 'appeal', 'court', 'judge', 'lawyer', 'attorney', 'legal', 'case', 'trial', 'sentence'],
    
    // General concern words
    concern: ['worried', 'scared', 'anxious', 'depressed', 'sad', 'angry', 'frustrated', 'upset']
  };
  
  let severity: 'low' | 'medium' | 'high' = 'low';
  let requiresReview = false;
  
  // Check high-risk patterns
  Object.entries(highRiskPatterns).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        flaggedWords.push(pattern);
        severity = 'high';
        requiresReview = true;
        reasons.push(`High-risk content detected: ${category}`);
      }
    });
  });
  
  // Check medium-risk patterns
  Object.entries(mediumRiskPatterns).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        flaggedWords.push(pattern);
        if (severity !== 'high') severity = 'medium';
        requiresReview = true;
        reasons.push(`Medium-risk content detected: ${category}`);
      }
    });
  });
  
  // Check low-risk patterns
  Object.entries(lowRiskPatterns).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        flaggedWords.push(pattern);
        if (severity === 'low') reasons.push(`Low-risk content detected: ${category}`);
      }
    });
  });
  
  // Additional pattern checks
  
  // Check for URLs and QR codes
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9.-]+\.(com|org|net|gov|edu|co|uk|ca|au)\b)/gi;
  const qrPattern = /qr\s*code/gi;
  if (urlPattern.test(text) || qrPattern.test(text)) {
    flaggedWords.push('URL/QR code detected');
    severity = 'medium';
    requiresReview = true;
    reasons.push('Medium-risk content detected: URLs or QR codes');
  }
  
  // Check for encrypted/coded messages (simple detection)
  const suspiciousPatterns = /([A-Z]{3,}\s){3,}|[0-9]{4,}[A-Z]{2,}|[A-Z][0-9][A-Z][0-9]/g;
  if (suspiciousPatterns.test(content)) {
    flaggedWords.push('Possible coded message');
    severity = 'high';
    requiresReview = true;
    reasons.push('High-risk content detected: Possible coded language');
  }
  
  // Check for excessive caps (could indicate yelling/aggression)
  const capsWords = content.match(/[A-Z]{4,}/g);
  if (capsWords && capsWords.length > 3) {
    flaggedWords.push('Excessive capitalization');
    if (severity === 'low') severity = 'medium';
    requiresReview = true;
    reasons.push('Medium-risk content detected: Excessive capitalization');
  }
  
  return { flaggedWords, severity, requiresReview, reasons };
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

  // Stripe subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found" });
      }

      const { priceId } = req.body;

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        });
        customerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1QaJ6OL1V6ZkZRf2ZfRp2w3p', // Monthly subscription price ID from Stripe dashboard
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/subscribe`,
        metadata: {
          userId: userId,
        },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error('Subscription creation error:', error);
      res.status(500).json({ message: 'Failed to create subscription' });
    }
  });

  // Stripe webhook handler
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          if (session.mode === 'subscription') {
            const userId = session.metadata?.userId;
            if (userId) {
              await storage.updateUser(userId, {
                stripeSubscriptionId: session.subscription as string,
                subscriptionStatus: 'active',
                lettersThisMonth: 0, // Reset letter count
              });
            }
          }
          break;

        case 'customer.subscription.updated':
          const subscription = event.data.object;
          // Find user by customer ID and update status
          const users = await storage.getAllUsers();
          const user = users.find((u: any) => u.stripeCustomerId === subscription.customer);
          if (user) {
            await storage.updateUser(user.id, {
              subscriptionStatus: subscription.status === 'active' ? 'active' : 'inactive',
            });
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object;
          const allUsers = await storage.getAllUsers();
          const canceledUser = allUsers.find((u: any) => u.stripeCustomerId === deletedSubscription.customer);
          if (canceledUser) {
            await storage.updateUser(canceledUser.id, {
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
            });
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
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
      } as any);

      // Create content filter record with detailed reasons
      await storage.createContentFilter({
        letterId: letter.id,
        flaggedWords: contentFilter.flaggedWords,
        severity: contentFilter.severity,
        requiresReview: contentFilter.requiresReview,
        reasons: contentFilter.reasons,
      });

      // Update user letter count if subscription
      if (letterData.paymentType === 'subscription') {
        await storage.updateUserLetterCount(userId, (user.lettersThisMonth || 0) + 1);
      }

      // Send confirmation email to user and notification to admin
      try {
        await emailService.sendStatusUpdate(user, letter, letter.status);
        await emailService.sendNewLetterNotification(user, letter);
      } catch (emailError) {
        console.error('Failed to send emails:', emailError);
        // Don't fail the request if email fails
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

        const latestInvoice = subscription.latest_invoice;
        const clientSecret = (latestInvoice && typeof latestInvoice === 'object' && 'payment_intent' in latestInvoice && latestInvoice.payment_intent && typeof latestInvoice.payment_intent === 'object' && 'client_secret' in latestInvoice.payment_intent) 
          ? latestInvoice.payment_intent.client_secret 
          : null;

        res.send({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
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
            product: 'prod_monthly_letters',
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
  
      const latestInvoice = subscription.latest_invoice;
      const clientSecret = (latestInvoice && typeof latestInvoice === 'object' && 'payment_intent' in latestInvoice && latestInvoice.payment_intent && typeof latestInvoice.payment_intent === 'object' && 'client_secret' in latestInvoice.payment_intent) 
        ? latestInvoice.payment_intent.client_secret 
        : null;

      res.send({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
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

  // Get detailed content filter information for admin review
  app.get('/api/admin/letters/:id/filter', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const filterDetails = await storage.getContentFilterWithLetterDetails(id);
      
      if (!filterDetails) {
        return res.status(404).json({ message: "Content filter not found" });
      }

      res.json(filterDetails);
    } catch (error) {
      console.error("Error fetching content filter details:", error);
      res.status(500).json({ message: "Failed to fetch content filter details" });
    }
  });

  // Test email endpoint for admins
  app.post('/api/admin/test-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!user.email) {
        return res.status(400).json({ message: "No email address on file" });
      }

      await emailService.sendWelcomeEmail(user);
      res.json({ message: "Test email sent successfully" });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email", error: error instanceof Error ? error.message : 'Unknown error' });
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
      
      // Send status update email
      try {
        const letterUser = await storage.getUserByLetterId(id);
        if (letterUser) {
          await emailService.sendStatusUpdate(letterUser, letter, status, rejectionReason);
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the request if email fails
      }

      res.json(letter);
    } catch (error) {
      console.error("Error updating letter status:", error);
      res.status(500).json({ message: "Failed to update letter status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
