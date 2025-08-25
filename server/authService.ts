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
  private static readonly TOKEN_EXPIRY_HOURS = 24;

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
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email.toLowerCase());
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user with capitalized names
    const user = await storage.createUser({
      email: data.email.toLowerCase(),
      firstName: capitalizeNames(data.firstName),
      lastName: capitalizeNames(data.lastName),
      passwordHash,
      isEmailVerified: false,
      authProvider: 'local',
    });

    // Generate email verification token
    const verificationToken = await this.createEmailVerificationToken(user.id);

    // Send verification email
    try {
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    return { user, verificationToken };
  }

  async login(data: LoginData): Promise<User> {
    console.log('AuthService: Looking up user by email:', data.email.toLowerCase());
    const user = await storage.getUserByEmail(data.email.toLowerCase());
    
    if (!user) {
      console.log('AuthService: User not found');
      throw new Error('Invalid email or password');
    }
    
    if (!user.passwordHash) {
      console.log('AuthService: User has no password hash');
      throw new Error('Invalid email or password');
    }

    console.log('AuthService: Verifying password for user:', user.id);
    const isPasswordValid = await this.verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('AuthService: Password verification failed');
      throw new Error('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      console.log('AuthService: Email not verified for user:', user.id);
      throw new Error('Please verify your email address before logging in');
    }

    console.log('AuthService: Login successful for user:', user.id);
    return user;
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists, but return success
      return '';
    }

    // First, invalidate any existing password reset tokens for this user
    await storage.invalidatePasswordResetTokensForUser(user.id);

    // Create a fresh token with proper expiry
    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + AuthService.TOKEN_EXPIRY_HOURS);

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
    console.log('3. BACKEND SERVICE - Token received:', token);
    console.log('Token length in service:', token.length);
    
    const resetToken = await storage.getPasswordResetToken(token);
    console.log('4. TOKEN LOOKUP result:', resetToken ? 'Found' : 'Not found');
    
    if (resetToken) {
      console.log('Token details:', {
        used: resetToken.used,
        expiresAt: resetToken.expiresAt,
        isExpired: new Date() > resetToken.expiresAt,
        currentTime: new Date(),
      });
    }
    
    if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);
    
    // Update user password
    await storage.updateUserPassword(resetToken.userId, passwordHash);
    
    // Mark token as used
    await storage.markPasswordResetTokenUsed(resetToken.id);
  }

  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + AuthService.TOKEN_EXPIRY_HOURS);

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