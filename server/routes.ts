import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLetterSchema, registerSchema, loginSchema, resetPasswordRequestSchema, resetPasswordSchema } from "@shared/schema";
import emailService from './emailService';
import { generateLetterPDF, generateLetterPreview } from './pdfGenerator';
import { authService } from './authService';
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// Add capitalization utility function
const capitalizeNames = (name: string): string => {
  if (!name || typeof name !== 'string') return name;
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to get user ID from either authentication method
const getUserId = (req: any): string | null => {
  // Check local auth session first
  if (req.session?.user?.id) {
    return req.session.user.id;
  }
  // Check Replit auth
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  return null;
};

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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Local authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { user, verificationToken } = await authService.register(validatedData);
      
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
        email: user.email,
        requiresVerification: true
      });
    } catch (error: any) {
      if (error.message.includes('email already exists')) {
        return res.status(409).json({ 
          message: 'An account with this email already exists. Please sign in instead.',
          action: 'redirect_to_login'
        });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Please check your input and try again.',
          errors: error.errors
        });
      }
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Registration failed. Please try again.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);
      
      // Create session (compatible with existing session structure)
      (req.session as any).user = {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        authProvider: 'local',
      };
      
      res.json({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          isAdmin: result.user.isAdmin || false
        },
        redirectTo: '/dashboard'
      });
    } catch (error: any) {
      if (error.message.includes('verify your email')) {
        return res.status(403).json({ 
          message: error.message,
          action: 'email_verification_required',
          email: req.body.email
        });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Please check your email and password.',
          errors: error.errors
        });
      }
      
      // Include login attempt information in error response
      const errorResponse: any = { 
        message: error.message || 'Invalid email or password' 
      };
      
      if (error.attemptCount) {
        errorResponse.attemptCount = error.attemptCount;
      }
      
      if (error.showPasswordReset) {
        errorResponse.showPasswordReset = true;
        errorResponse.message = `Invalid email or password. After ${error.attemptCount} failed attempts, you may want to reset your password.`;
      }
      
      res.status(401).json(errorResponse);
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      res.status(204).end();
    });
  });

  app.post('/api/auth/request-password-reset', async (req, res) => {
    try {
      const validatedData = resetPasswordRequestSchema.parse(req.body);
      await authService.createPasswordResetToken(validatedData.email);
      
      // Always return success to prevent email enumeration
      res.json({
        message: 'If an account with this email exists, you will receive a password reset link.',
      });
    } catch (error: any) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      // Validate required fields
      if (!token) {
        return res.status(400).json({ message: 'Missing reset token' });
      }
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      const validatedData = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(validatedData.token.trim(), validatedData.password);
      
      res.json({ 
        message: 'Password reset successful. You can now log in with your new password.',
        redirectTo: '/auth/login'
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Please check your input and try again.',
          errors: error.errors
        });
      }
      res.status(400).json({ message: error.message || 'Password reset failed' });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      const user = await authService.verifyEmail(token);
      res.json({
        message: 'Email verified successfully. You can now log in.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(400).json({ message: error.message || 'Email verification failed' });
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      await authService.resendEmailVerification(email);
      res.json({ message: 'Verification email sent successfully.' });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(400).json({ message: error.message || 'Failed to resend verification email' });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found" });
      }

      const { type } = req.body;

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

      // Create checkout session with dynamic price
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Monthly Letter Service',
                description: 'Send up to 4 letters per month to your loved ones'
              },
              unit_amount: 999, // $9.99
              recurring: {
                interval: 'month'
              }
            },
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
              
              // Send subscription confirmation email
              try {
                const user = await storage.getUser(userId);
                if (user && user.email) {
                  await emailService.sendSubscriptionConfirmation(user);
                }
              } catch (emailError) {
                console.error('Failed to send subscription confirmation email:', emailError);
              }
            }
          } else if (session.mode === 'payment' && session.metadata?.type === 'single_letter') {
            // Handle single letter payment completion
            const userId = session.metadata?.userId;
            if (userId) {
              try {
                const user = await storage.getUser(userId);
                if (user && user.email) {
                  await emailService.sendPaymentConfirmation(user);
                }
              } catch (emailError) {
                console.error('Failed to send payment confirmation email:', emailError);
              }
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

  // One-time payment for single letters
  app.post('/api/create-payment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found" });
      }

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

      // Create checkout session for one-time payment
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Single Letter Service',
                description: 'Send one letter to your loved one'
              },
              unit_amount: 0, // $0.00 for testing
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/compose?payment_success=true`,
        cancel_url: `${req.headers.origin}/subscribe`,
        metadata: {
          userId: userId,
          type: 'single_letter'
        },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({ message: 'Failed to create payment session' });
    }
  });

  // Letter routes
  app.post('/api/letters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      
      // Automatically capitalize names before creating letter
      const formattedLetterData = {
        ...letterData,
        recipientFirstName: capitalizeNames(letterData.recipientFirstName),
        recipientLastName: capitalizeNames(letterData.recipientLastName),
      };
      
      // Create letter
      const letter = await storage.createLetter({
        ...formattedLetterData,
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
          userId: getUserId(req),
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
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

  // PDF Generation routes
  app.post('/api/letters/:id/preview', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const letter = await storage.getLetter(id);
      
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }

      // Check if user owns the letter or is admin
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (letter.userId !== userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const letterData = {
        senderFirstName: user?.firstName || null,
        senderLastName: user?.lastName || null,
        senderAddress: undefined, // Address field not in schema
        recipientFirstName: capitalizeNames(letter.recipientFirstName),
        recipientLastName: capitalizeNames(letter.recipientLastName),
        recipientId: letter.recipientId,
        facilityName: letter.facilityName,
        facilityAddress: letter.facilityAddress,
        subject: letter.subject,
        content: letter.content,
        date: letter.createdAt ? new Date(letter.createdAt) : new Date()
      };

      const previewHtml = generateLetterPreview(letterData);
      res.setHeader('Content-Type', 'text/html');
      res.send(previewHtml);
    } catch (error) {
      console.error("Error generating letter preview:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  app.post('/api/letters/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const letter = await storage.getLetter(id);
      
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }

      // Check if user owns the letter or is admin
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (letter.userId !== userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const letterData = {
        senderFirstName: user?.firstName || null,
        senderLastName: user?.lastName || null,
        senderAddress: undefined, // Address field not in schema
        recipientFirstName: capitalizeNames(letter.recipientFirstName),
        recipientLastName: capitalizeNames(letter.recipientLastName),
        recipientId: letter.recipientId,
        facilityName: letter.facilityName,
        facilityAddress: letter.facilityAddress,
        subject: letter.subject,
        content: letter.content,
        date: letter.createdAt ? new Date(letter.createdAt) : new Date()
      };

      const pdfBuffer = generateLetterPDF(letterData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="letter-${letter.id.slice(-8)}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Live preview route for compose page
  app.post('/api/preview-letter', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        subject,
        content,
        recipientFirstName,
        recipientLastName,
        recipientId,
        facilityName,
        facilityAddress
      } = req.body;

      const letterData = {
        senderFirstName: user?.firstName || null,
        senderLastName: user?.lastName || null,
        senderAddress: undefined, // Address field not in schema
        recipientFirstName: capitalizeNames(recipientFirstName),
        recipientLastName: capitalizeNames(recipientLastName),
        recipientId,
        facilityName,
        facilityAddress,
        subject,
        content,
        date: new Date()
      };

      const previewHtml = generateLetterPreview(letterData);
      res.setHeader('Content-Type', 'text/html');
      res.send(previewHtml);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  // API 404 handler - only for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
