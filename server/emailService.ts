import nodemailer from 'nodemailer';
import { User, Letter } from '../shared/schema';

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
}

// Create reusable transporter object using GMAIL SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const emailService = {
  // Send letter status update to user
  async sendStatusUpdate(user: User, letter: Letter, newStatus: string, rejectionReason?: string) {
    if (!user.email) return;

    const statusMessages: Record<string, string> = {
      pending: 'Your letter is being reviewed and will be processed soon.',
      approved: 'Your letter has been approved and is being prepared for delivery.',
      delivered: 'Your letter has been successfully delivered to the recipient.',
      rejected: `Your letter could not be processed. ${rejectionReason || 'Please review our content guidelines and try again.'}`,
    };

    const statusColors: Record<string, string> = {
      pending: '#F59E0B',
      approved: '#10B981', 
      delivered: '#059669',
      rejected: '#EF4444',
    };

    const subject = `Letter Update: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - #${letter.id.slice(-8)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Letter Status Update</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h1 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">Letter Status Update</h1>
          <div style="background: white; border-radius: 6px; padding: 20px; border-left: 4px solid ${statusColors[newStatus] || '#6B7280'};">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="background: ${statusColors[newStatus] || '#6B7280'}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500;">
                ${newStatus.toUpperCase()}
              </div>
            </div>
            <p style="margin: 0; font-size: 16px;">${statusMessages[newStatus] || 'Your letter status has been updated.'}</p>
          </div>
        </div>
        
        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Letter Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Order ID:</td>
              <td style="padding: 8px 0; color: #111827;">#${letter.id.slice(-8)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Recipient:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.recipientFirstName} ${letter.recipientLastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Facility:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.facilityName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Date Submitted:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.createdAt ? new Date(letter.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'N/A'}</td>
            </tr>
          </table>
        </div>

        ${newStatus === 'rejected' ? `
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #DC2626; margin: 0 0 8px 0; font-size: 16px;">What's Next?</h3>
          <p style="margin: 0; color: #7F1D1D;">You can submit a new letter with appropriate content. Please review our content guidelines to ensure your message meets facility requirements.</p>
        </div>
        ` : ''}

        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #E5E7EB;">
          <a href="${process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
            : 'https://jail-mail.com'}/dashboard" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            View Dashboard
          </a>
        </div>

        <div style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>This is an automated message from your Inmate Mail Service.<br>
          If you have questions, please contact support.</p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  },

  // Send new letter notification to admin
  async sendNewLetterNotification(user: User, letter: Letter) {
    const adminEmail = process.env.GMAIL_USER; // Send to the Gmail account owner
    
    const subject = `New Letter Submitted - #${letter.id.slice(-8)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Letter Notification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h1 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">New Letter Submitted</h1>
          <div style="background: white; border-radius: 6px; padding: 20px; border-left: 4px solid #F59E0B;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="background: #F59E0B; color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500;">
                PENDING REVIEW
              </div>
            </div>
            <p style="margin: 0; font-size: 16px;">A new letter has been submitted and is awaiting review.</p>
          </div>
        </div>
        
        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Letter Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Order ID:</td>
              <td style="padding: 8px 0; color: #111827;">#${letter.id.slice(-8)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">From:</td>
              <td style="padding: 8px 0; color: #111827;">${user.firstName} ${user.lastName} (${user.email})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">To:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.recipientFirstName} ${letter.recipientLastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Inmate ID:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.recipientId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Facility:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.facilityName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Payment:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.paymentType} ${letter.amount ? `($${letter.amount})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Subject:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.subject || 'No subject'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Date:</td>
              <td style="padding: 8px 0; color: #111827;">${letter.createdAt ? new Date(letter.createdAt).toLocaleString('en-US') : 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Letter Content</h2>
          <div style="background: #F9FAFB; padding: 16px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 14px; line-height: 1.5; max-height: 300px; overflow-y: auto;">
${letter.content}
          </div>
        </div>

        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #E5E7EB;">
          <a href="${process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
            : 'https://jail-mail.com'}/admin" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Review in Admin Panel
          </a>
        </div>

        <div style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>This is an automated notification from your Inmate Mail Service admin panel.</p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: adminEmail!,
      subject,
      html,
    });
  },

  // Send welcome email for new users
  async sendWelcomeEmail(user: User) {
    if (!user.email) return;

    const subject = 'Welcome to Inmate Mail Service';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Inmate Mail Service</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #111827; margin: 0; font-size: 28px;">Welcome to Inmate Mail Service</h1>
          <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 16px;">Connecting you with your loved ones</p>
        </div>

        <div style="background: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">Getting Started</h2>
          <div style="space-y: 12px;">
            <div style="margin-bottom: 12px;">
              <strong style="color: #111827;">1. Choose Your Plan</strong>
              <p style="margin: 4px 0 0 0; color: #6B7280;">Select from our flexible payment options - monthly subscription or pay-per-letter.</p>
            </div>
            <div style="margin-bottom: 12px;">
              <strong style="color: #111827;">2. Compose Your Letter</strong>
              <p style="margin: 4px 0 0 0; color: #6B7280;">Write your message using our secure online editor with content guidelines.</p>
            </div>
            <div style="margin-bottom: 12px;">
              <strong style="color: #111827;">3. We Handle the Rest</strong>
              <p style="margin: 4px 0 0 0; color: #6B7280;">Your letter is printed, mailed, and delivered to the correctional facility.</p>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: 20px 0;">
          <a href="${process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
            : 'https://jail-mail.com'}/compose" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Send Your First Letter
          </a>
        </div>

        <div style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>Questions? We're here to help.<br>
          Contact us through your dashboard or reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  },

  // Send subscription confirmation email
  async sendSubscriptionConfirmation(user: any) {
    await this.sendEmail({
      to: user.email,
      subject: "Subscription Confirmed - Inmate Mail Service",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Subscription Confirmed!</h2>
        <p>Dear ${user.firstName} ${user.lastName}, your monthly subscription is now active.</p>
        <p>You can now send up to 4 letters per month for $9.99/month.</p>
        <p>Thank you for choosing our service!</p>
      </div>`
    });
  },

  // Send payment confirmation email
  async sendPaymentConfirmation(user: any) {
    await this.sendEmail({
      to: user.email,  
      subject: "Payment Confirmed - Ready to Send Letter",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Confirmed!</h2>
        <p>Dear ${user.firstName} ${user.lastName}, your payment has been processed.</p>
        <p>You can now compose and send your letter from your dashboard.</p>
        <p>Thank you for using our service!</p>
      </div>`
    });
  },

  // Send email verification link
  async sendEmailVerification(user: User, token: string) {
    if (!user.email) return;

    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : 'https://jail-mail.com';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    const subject = 'Verify Your Email Address - Inmate Mail Service';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #111827; margin: 0; font-size: 28px;">Verify Your Email Address</h1>
          <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 16px;">Welcome to Inmate Mail Service</p>
        </div>

        <div style="background: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${user.firstName || 'there'},</p>
          <p style="margin: 0 0 16px 0; font-size: 16px;">Thank you for signing up for Inmate Mail Service. To get started, please verify your email address by clicking the button below:</p>
        </div>

        <div style="text-align: center; padding: 20px 0;">
          <a href="${verificationUrl}" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Verify Email Address
          </a>
        </div>

        <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E; font-size: 14px;">
            <strong>Note:</strong> This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a></p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  },

  // Send password reset link
  async sendPasswordReset(user: User, token: string) {
    if (!user.email) return;

    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : 'https://jail-mail.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    const subject = 'Reset Your Password - Inmate Mail Service';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #111827; margin: 0; font-size: 28px;">Reset Your Password</h1>
          <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 16px;">Inmate Mail Service</p>
        </div>

        <div style="background: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${user.firstName || 'there'},</p>
          <p style="margin: 0 0 16px 0; font-size: 16px;">We received a request to reset your password. Click the button below to create a new password:</p>
        </div>

        <div style="text-align: center; padding: 20px 0;">
          <a href="${resetUrl}" 
             style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Reset Password
          </a>
        </div>

        <div style="background: #FEF2F2; border: 1px solid #F87171; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #991B1B; font-size: 14px;">
            <strong>Security Notice:</strong> This link will expire in 24 hours. If you didn't request this reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>

        <div style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #DC2626; word-break: break-all;">${resetUrl}</a></p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  },

  // Generic email sender
  async sendEmail(notification: EmailNotification) {
    try {
      const info = await transporter.sendMail({
        from: `"Inmate Mail Service" <${process.env.GMAIL_USER}>`,
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
      });

      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  },

  // Test email configuration
  async testConnection() {
    try {
      await transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  },
};

export default emailService;