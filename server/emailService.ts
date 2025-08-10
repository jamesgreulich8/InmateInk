import nodemailer from 'nodemailer';
import type { Letter, User } from '@shared/schema';

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  // Send letter status update notifications
  async sendStatusUpdate(user: User, letter: Letter, newStatus: string, rejectionReason?: string) {
    if (!user.email) return;

    const statusMessages: Record<string, string> = {
      approved: 'Your letter has been approved and will be printed soon.',
      rejected: `Your letter was rejected. Reason: ${rejectionReason || 'Content did not meet facility guidelines.'}`,
      printed: 'Your letter has been printed and is being prepared for mailing.',
      mailed: 'Your letter has been mailed to the facility.',
      delivered: 'Your letter has been successfully delivered to the recipient.',
      pending: 'Your letter is being reviewed and will be processed soon.',
    };

    const statusColors: Record<string, string> = {
      approved: '#10B981',
      rejected: '#EF4444',
      printed: '#3B82F6',
      mailed: '#8B5CF6',
      delivered: '#059669',
      pending: '#F59E0B',
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
          <a href="${process.env.REPLIT_DOMAIN || 'https://your-app.replit.app'}/dashboard" 
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

        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Pricing Options</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="text-align: center; padding: 16px; background: #F9FAFB; border-radius: 6px;">
              <h3 style="margin: 0 0 8px 0; color: #111827;">Monthly Plan</h3>
              <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">$9.99</div>
              <div style="color: #6B7280; font-size: 14px;">4 letters included</div>
            </div>
            <div style="text-align: center; padding: 16px; background: #F9FAFB; border-radius: 6px;">
              <h3 style="margin: 0 0 8px 0; color: #111827;">Per Letter</h3>
              <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">$3.99</div>
              <div style="color: #6B7280; font-size: 14px;">Pay as you go</div>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: 20px 0;">
          <a href="${process.env.REPLIT_DOMAIN || 'https://your-app.replit.app'}/compose" 
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

  // Send subscription renewal reminder
  async sendSubscriptionReminder(user: User, daysUntilRenewal: number) {
    if (!user.email) return;

    const subject = `Subscription Renewal in ${daysUntilRenewal} days`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Renewal Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h1 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">Subscription Renewal Reminder</h1>
          <p style="margin: 0; font-size: 16px;">Your monthly subscription will renew in ${daysUntilRenewal} days. Continue sending letters to your loved ones without interruption.</p>
        </div>

        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Your Plan</h2>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 18px; font-weight: 600; color: #111827;">Monthly Letter Service</div>
              <div style="color: #6B7280;">4 letters per month</div>
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">$9.99</div>
          </div>
        </div>

        <div style="text-align: center; padding: 20px 0;">
          <a href="${process.env.REPLIT_DOMAIN || 'https://your-app.replit.app'}/dashboard" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Manage Subscription
          </a>
        </div>

        <div style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>To cancel or modify your subscription, visit your dashboard.<br>
          Questions? Contact support through your account.</p>
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