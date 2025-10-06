import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import csrf from "csurf";
import { setupVite, serveStatic, log } from "./vite";
import emailService from "./emailService";

const app = express();

// Trust reverse proxy (required for secure cookies and HSTS behind proxies)
app.set("trust proxy", 1);

// Capture raw body for Stripe webhooks while parsing JSON elsewhere
app.use(
  express.json({
    limit: "100kb",
    verify: (req: any, _res, buf) => {
      if (req.originalUrl?.startsWith("/api/stripe-webhook")) {
        req.rawBody = Buffer.from(buf);
      }
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Security headers (apply strongest in production)
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                // Stripe
                "https://js.stripe.com",
                "https://checkout.stripe.com",
              ],
              connectSrc: [
                "'self'",
                "https://api.stripe.com",
                "https://checkout.stripe.com",
              ],
              frameSrc: [
                "'self'",
                "https://js.stripe.com",
                "https://checkout.stripe.com",
              ],
              imgSrc: ["'self'", "data:"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              fontSrc: ["'self'", "data:"],
            },
          }
        : false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : undefined,
  })
);

// Minimal CORS for API (allow same-origin and explicit APP_ORIGIN)
const corsLike: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  const allowed = new Set<string>();
  if (process.env.APP_ORIGIN) allowed.add(process.env.APP_ORIGIN);
  if (req.headers.host) {
    const proto = (req.headers["x-forwarded-proto"] as string) || (process.env.NODE_ENV === "production" ? "https" : "http");
    allowed.add(`${proto}://${req.headers.host}`);
  }
  if (origin && allowed.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
};
app.use("/api", corsLike);

// Basic API rate limiting (fine-grained limits added on sensitive routes)
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Enforce Origin checks for mutating requests to mitigate CSRF
app.use((req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return next();
  }

  const origin = req.headers.origin;
  // Allow same-origin requests; optionally allow explicit APP_ORIGIN
  const allowedOrigins = new Set<string>();
  if (process.env.APP_ORIGIN) allowedOrigins.add(process.env.APP_ORIGIN);
  if (req.headers.host) {
    const proto = req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http");
    allowedOrigins.add(`${proto}://${req.headers.host}`);
  }
  if (!origin || allowedOrigins.has(origin)) {
    return next();
  }
  return res.status(403).json({ message: "Invalid request origin" });
});

// CSRF protection for state-changing endpoints (skip Stripe webhook)
const csrfProtection = csrf({ cookie: false, ignoreMethods: ["GET", "HEAD", "OPTIONS"] });
app.use((req, res, next) => {
  if (req.originalUrl?.startsWith("/api/stripe-webhook")) return next();
  const method = req.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Test email service connection on startup
    try {
      const isConnected = await emailService.testConnection();
      log(`Email service: ${isConnected ? 'Connected' : 'Connection failed'}`);
    } catch (error) {
      log(`Email service error: ${(error as Error).message}`);
    }
  });
})();
