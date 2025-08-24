import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// Enhanced to support both Replit Auth and local password auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For local auth
  isEmailVerified: boolean("is_email_verified").default(false),
  authProvider: varchar("auth_provider").default("local"), // 'local' or 'replit'
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // active, inactive, canceled
  lettersThisMonth: integer("letters_this_month").default(0),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Letters table
export const letters = pgTable("letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject"),
  content: text("content").notNull(),
  recipientFirstName: varchar("recipient_first_name").notNull(),
  recipientLastName: varchar("recipient_last_name").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  facilityName: varchar("facility_name").notNull(),
  facilityAddress: text("facility_address").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, printed, mailed, delivered, rejected
  paymentType: varchar("payment_type").notNull(), // subscription, one-time
  amount: decimal("amount", { precision: 10, scale: 2 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content filters for compliance
export const contentFilters = pgTable("content_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  letterId: varchar("letter_id").notNull().references(() => letters.id),
  flaggedWords: text("flagged_words").array(),
  severity: varchar("severity").notNull(), // low, medium, high
  requiresReview: boolean("requires_review").default(false),
  reasons: text("reasons").array(), // detailed reasons for flagging
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Auth schemas
export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ResetPasswordRequestData = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const insertLetterSchema = createInsertSchema(letters).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  rejectionReason: true,
});

export type InsertLetter = z.infer<typeof insertLetterSchema>;
export type Letter = typeof letters.$inferSelect;

export const insertContentFilterSchema = createInsertSchema(contentFilters).omit({
  id: true,
  createdAt: true,
});

export type InsertContentFilter = z.infer<typeof insertContentFilterSchema>;
export type ContentFilter = typeof contentFilters.$inferSelect;
