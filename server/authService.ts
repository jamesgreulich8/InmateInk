import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import emailService from './emailService';
import type { RegisterData, LoginData, User } from '@shared/schema';

// Utility function to capitalize first letter of each word
const capitalizeNames = (name: string): string => {
  if (!name || typeof name !== 'string') return name;
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_EXPIRY_MINUTES = 30; // Short TTL for security

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AuthService.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(data: RegisterData): Promise<{ user: User; verificationToken: string }> {
    // Normalize email
    const normalizedEmail = data.email.toLowerCase().trim();
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    // Validate and sanitize inputs
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      throw new Error('First name and last name are required');
    }

    // Hash password with timing attack protection
    const passwordHash = await this.hashPassword(data.password);

    // Create user with capitalized names
    const user = await storage.createUser({
      email: normalizedEmail,
      firstName: capitalizeNames(data.firstName.trim()),
      lastName: capitalizeNames(data.lastName.trim()),
      passwordHash,
      isEmailVerified: false,
      authProvider: 'local',
    });

    // Generate email verification token
    const verificationToken = await this.createEmailVerificationToken(user.id);

    // Send verification email (non-blocking)
    try {
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Continue with registration - user can request resend
    }

    return { user, verificationToken };
  }

  async login(data: LoginData): Promise<{ user: User; attemptCount?: number; showPasswordReset?: boolean }> {
    // Normalize email
    const normalizedEmail = data.email.toLowerCase().trim();
    
    // Always hash the password to prevent timing attacks
    const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attacks.abcdefghijklmnopqrstuvwxyz';
    
    const user = await storage.getUserByEmail(normalizedEmail);
    
    if (!user || !user.passwordHash) {
      // Record failed attempt and still verify against dummy hash to prevent timing attacks
      const attempt = await storage.recordLoginAttempt(normalizedEmail);
      await this.verifyPassword(data.password, dummyHash);
      
      const showPasswordReset = attempt.attemptCount >= 5;
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await this.verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed attempt
      const attempt = await storage.recordLoginAttempt(normalizedEmail);
      const showPasswordReset = attempt.attemptCount >= 5;
      
      const error = new Error('Invalid email or password') as any;
      error.attemptCount = attempt.attemptCount;
      error.showPasswordReset = showPasswordReset;
      throw error;
    }

    if (!user.isEmailVerified) {
      throw new Error('Please verify your email address before logging in. Check your inbox for the verification link.');
    }

    // Clear login attempts on successful login
    await storage.resetLoginAttempts(normalizedEmail);

    return { user };
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists, but return success
      return '';
    }

    // First, invalidate any existing password reset tokens for this user
    await storage.invalidatePasswordResetTokensForUser(user.id);

    // Create a fresh token with short expiry (30 minutes)
    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + AuthService.TOKEN_EXPIRY_MINUTES);

    await storage.createPasswordResetToken({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    // Send password reset email
    try {
      await emailService.sendPasswordReset(user, token);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);
    
    // Update user password
    await storage.updateUserPassword(resetToken.userId, passwordHash);
    
    // Delete token immediately after use for security
    await storage.deletePasswordResetToken(resetToken.id);
  }

  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + AuthService.TOKEN_EXPIRY_MINUTES);

    await storage.createEmailVerificationToken({
      userId,
      token,
      expiresAt,
      used: false,
    });

    return token;
  }

  async verifyEmail(token: string): Promise<User> {
    const verificationToken = await storage.getEmailVerificationToken(token);
    if (!verificationToken || verificationToken.used || new Date() > verificationToken.expiresAt) {
      throw new Error('Invalid or expired verification token');
    }

    // Mark user as verified
    const user = await storage.markUserEmailVerified(verificationToken.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Mark token as used
    await storage.markEmailVerificationTokenUsed(verificationToken.id);

    return user;
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // Check rate limiting - ensure user can't spam verification requests
    const existingTokens = await storage.getEmailVerificationTokensByUserId(user.id);
    if (existingTokens.length > 0) {
      const latestToken = existingTokens[0];
      if (latestToken.createdAt) {
        const tokenAge = Date.now() - latestToken.createdAt.getTime();
        const oneMinute = 60 * 1000;
        
        if (tokenAge < oneMinute) {
          const remainingSeconds = Math.ceil((oneMinute - tokenAge) / 1000);
          throw new Error(`Please wait ${remainingSeconds} seconds before requesting another verification email`);
        }
      }
    }

    // Remove old verification tokens before creating new one (only after rate limit check)
    await storage.deleteEmailVerificationTokensByUserId(user.id);
    
    const token = await this.createEmailVerificationToken(user.id);
    await emailService.sendEmailVerification(user, token);
  }
}

export const authService = new AuthService();