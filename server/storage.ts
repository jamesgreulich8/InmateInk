import {
  users,
  letters,
  contentFilters,
  type User,
  type UpsertUser,
  type Letter,
  type InsertLetter,
  type ContentFilter,
  type InsertContentFilter,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  updateUserSubscriptionStatus(id: string, status: string): Promise<User>;
  updateUserLetterCount(id: string, count: number): Promise<User>;
  
  // Letter operations
  createLetter(letter: InsertLetter): Promise<Letter>;
  getLettersByUserId(userId: string): Promise<Letter[]>;
  getLetter(id: string): Promise<Letter | undefined>;
  updateLetterStatus(id: string, status: string, rejectionReason?: string): Promise<Letter>;
  getAllLetters(): Promise<Letter[]>;
  getPendingLetters(): Promise<Letter[]>;
  
  // Content filter operations
  createContentFilter(filter: InsertContentFilter): Promise<ContentFilter>;
  getContentFiltersByLetterId(letterId: string): Promise<ContentFilter[]>;
  
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

  // Letter operations
  async createLetter(letter: InsertLetter): Promise<Letter> {
    const [newLetter] = await db.insert(letters).values(letter).returning();
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
    const [newFilter] = await db.insert(contentFilters).values(filter).returning();
    return newFilter;
  }

  async getContentFiltersByLetterId(letterId: string): Promise<ContentFilter[]> {
    return await db
      .select()
      .from(contentFilters)
      .where(eq(contentFilters.letterId, letterId));
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
}

export const storage = new DatabaseStorage();
