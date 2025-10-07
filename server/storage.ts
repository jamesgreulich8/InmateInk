import {
  users,
  letters,
  contentFilters,
  passwordResetTokens,
  emailVerificationTokens,
  loginAttempts,
  type User,
  type UpsertUser,
  type Letter,
  type InsertLetter,
  type ContentFilter,
  type InsertContentFilter,
  type PasswordResetToken,
  type EmailVerificationToken,
  type LoginAttempt,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, lt, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByLetterId(letterId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  updateUserSubscriptionStatus(id: string, status: string): Promise<User>;
  updateUserLetterCount(id: string, count: number): Promise<User>;
  updateUser(userId: string, data: Partial<User>): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Local auth operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: UpsertUser): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  markUserEmailVerified(userId: string): Promise<User | undefined>;
  
  // Password reset tokens
  createPasswordResetToken(data: { userId: string; token: string; expiresAt: Date; used: boolean }): Promise<void>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: string): Promise<void>;
  deletePasswordResetToken(tokenId: string): Promise<void>;
  invalidatePasswordResetTokensForUser(userId: string): Promise<void>;
  
  // Email verification tokens
  createEmailVerificationToken(data: { userId: string; token: string; expiresAt: Date; used: boolean }): Promise<void>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(tokenId: string): Promise<void>;
  getEmailVerificationTokensByUserId(userId: string): Promise<EmailVerificationToken[]>;
  deleteEmailVerificationTokensByUserId(userId: string): Promise<void>;
  
  // Login attempts tracking
  getLoginAttempts(email: string): Promise<LoginAttempt | undefined>;
  recordLoginAttempt(email: string): Promise<LoginAttempt>;
  resetLoginAttempts(email: string): Promise<void>;
  clearExpiredLoginAttempts(): Promise<void>;
  
  // Letter operations
  createLetter(letter: InsertLetter & { userId: string }): Promise<Letter>;
  getLettersByUserId(userId: string): Promise<Letter[]>;
  getLetter(id: string): Promise<Letter | undefined>;
  updateLetterStatus(id: string, status: string, rejectionReason?: string): Promise<Letter>;
  getAllLetters(): Promise<Letter[]>;
  getPendingLetters(): Promise<Letter[]>;
  
  // Content filter operations
  createContentFilter(filter: InsertContentFilter): Promise<ContentFilter>;
  getContentFiltersByLetterId(letterId: string): Promise<ContentFilter[]>;
  getContentFilterWithLetterDetails(letterId: string): Promise<{contentFilter: ContentFilter, letter: Letter} | undefined>;
  
  // Admin operations
  getUserCount(): Promise<number>;
  getLetterCount(): Promise<number>;
  getPendingReviewCount(): Promise<number>;
  getRevenue(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByLetterId(letterId: string): Promise<User | undefined> {
    const result = await db
      .select({ user: users })
      .from(users)
      .innerJoin(letters, eq(users.id, letters.userId))
      .where(eq(letters.id, letterId));
    
    return result.length > 0 ? result[0].user : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSubscriptionStatus(id: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLetterCount(id: string, count: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        lettersThisMonth: count,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Local auth operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id ?? uuidv4(),
        ...userData,
      })
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async markUserEmailVerified(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Password reset tokens
  async createPasswordResetToken(data: { userId: string; token: string; expiresAt: Date; used: boolean }): Promise<void> {
    await db.insert(passwordResetTokens).values({ id: uuidv4(), ...data });
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async deletePasswordResetToken(tokenId: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async invalidatePasswordResetTokensForUser(userId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.userId, userId));
  }

  // Email verification tokens
  async createEmailVerificationToken(data: { userId: string; token: string; expiresAt: Date; used: boolean }): Promise<void> {
    await db.insert(emailVerificationTokens).values({ id: uuidv4(), ...data });
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async markEmailVerificationTokenUsed(tokenId: string): Promise<void> {
    await db
      .update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.id, tokenId));
  }

  async getEmailVerificationTokensByUserId(userId: string): Promise<EmailVerificationToken[]> {
    return await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId))
      .orderBy(desc(emailVerificationTokens.createdAt));
  }

  async deleteEmailVerificationTokensByUserId(userId: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId));
  }

  // Letter operations
  async createLetter(letter: InsertLetter & { userId: string }): Promise<Letter> {
    const [newLetter] = await db.insert(letters).values({ id: uuidv4(), ...letter }).returning();
    return newLetter;
  }

  async getLettersByUserId(userId: string): Promise<Letter[]> {
    return await db
      .select()
      .from(letters)
      .where(eq(letters.userId, userId))
      .orderBy(desc(letters.createdAt));
  }

  async getLetter(id: string): Promise<Letter | undefined> {
    const [letter] = await db.select().from(letters).where(eq(letters.id, id));
    return letter;
  }

  async updateLetterStatus(id: string, status: string, rejectionReason?: string): Promise<Letter> {
    const [letter] = await db
      .update(letters)
      .set({
        status,
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(letters.id, id))
      .returning();
    return letter;
  }

  async getAllLetters(): Promise<Letter[]> {
    return await db.select().from(letters).orderBy(desc(letters.createdAt));
  }

  async getPendingLetters(): Promise<Letter[]> {
    return await db
      .select()
      .from(letters)
      .where(eq(letters.status, "pending"))
      .orderBy(desc(letters.createdAt));
  }

  // Content filter operations
  async createContentFilter(filter: InsertContentFilter): Promise<ContentFilter> {
    const [newFilter] = await db.insert(contentFilters).values({ id: uuidv4(), ...filter }).returning();
    return newFilter;
  }

  async getContentFiltersByLetterId(letterId: string): Promise<ContentFilter[]> {
    return await db
      .select()
      .from(contentFilters)
      .where(eq(contentFilters.letterId, letterId));
  }

  async getContentFilterWithLetterDetails(letterId: string): Promise<{contentFilter: ContentFilter, letter: Letter} | undefined> {
    const result = await db
      .select()
      .from(contentFilters)
      .innerJoin(letters, eq(contentFilters.letterId, letters.id))
      .where(eq(contentFilters.letterId, letterId));
    
    if (result.length === 0) return undefined;
    
    return {
      contentFilter: result[0].content_filters,
      letter: result[0].letters
    };
  }

  // Admin operations
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0].count;
  }

  async getLetterCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(letters);
    return result[0].count;
  }

  async getPendingReviewCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(letters)
      .where(eq(letters.status, "pending"));
    return result[0].count;
  }

  async getRevenue(): Promise<number> {
    // Calculate total revenue from completed letters
    const result = await db
      .select()
      .from(letters)
      .where(eq(letters.status, "delivered"));
    
    return result.reduce((total, letter) => {
      return total + (letter.amount ? parseFloat(letter.amount) : 0);
    }, 0);
  }

  // Login attempts tracking
  async getLoginAttempts(email: string): Promise<LoginAttempt | undefined> {
    // Clean up expired attempts first
    await this.clearExpiredLoginAttempts();
    
    const [attempt] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.email, email.toLowerCase()));
    
    return attempt;
  }

  async recordLoginAttempt(email: string): Promise<LoginAttempt> {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.getLoginAttempts(normalizedEmail);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(loginAttempts)
        .set({
          attemptCount: (existing.attemptCount || 0) + 1,
          lastAttemptAt: new Date(),
        })
        .where(eq(loginAttempts.email, normalizedEmail))
        .returning();
      return updated;
    } else {
      // Create new record
      const [newAttempt] = await db
        .insert(loginAttempts)
        .values({
          id: uuidv4(),
          email: normalizedEmail,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          resetAt: new Date(Date.now() + 15 * 60 * 1000), // Reset after 15 minutes
        })
        .returning();
      return newAttempt;
    }
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await db
      .delete(loginAttempts)
      .where(eq(loginAttempts.email, email.toLowerCase()));
  }

  async clearExpiredLoginAttempts(): Promise<void> {
    const now = new Date();
    await db
      .delete(loginAttempts)
      .where(
        and(
          isNotNull(loginAttempts.resetAt),
          lt(loginAttempts.resetAt, now)
        )
      );
  }
}

export const storage = new DatabaseStorage();
