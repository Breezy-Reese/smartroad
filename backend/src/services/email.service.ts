import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: any;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      this.initialized = true;
      logger.info('Email service initialized');
    } else {
      logger.warn('SMTP credentials not found. Email service disabled.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      logger.warn('Email service not initialized. Email not sent.');
      return false;
    }

    try {
      const from = process.env.EMAIL_FROM || 'noreply@accident-detection.com';

      let html = options.html;
      if (options.template && options.data) {
        html = this.renderTemplate(options.template, options.data);
      }

      const mailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Welcome to Smart Accident Detection System',
      template: 'welcome',
      data: { name },
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetLink: string
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: { name, resetLink },
    });
  }

  async sendEmergencyAlertEmail(
    to: string,
    data: {
      driverName: string;
      location: string;
      severity: string;
      incidentId: string;
    }
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `🚨 EMERGENCY ALERT - Incident #${data.incidentId}`,
      template: 'emergency-alert',
      data,
    });
  }

  async sendIncidentReportEmail(
    to: string,
    report: any
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Incident Report - #${report.incidentId}`,
      template: 'incident-report',
      data: report,
    });
  }

  private renderTemplate(template: string, data: any): string {
    // Simple template rendering - in production, use a proper templating engine
    const templates: Record<string, string> = {
      welcome: `
        <h1>Welcome to Smart Accident Detection System</h1>
        <p>Dear {{name}},</p>
        <p>Thank you for joining our emergency response network.</p>
        <p>Your account has been successfully created. You can now:</p>
        <ul>
          <li>Set up your emergency contacts</li>
          <li>Update your medical information</li>
          <li>Access the emergency dashboard</li>
        </ul>
        <p>Stay safe!</p>
        <p>- The Smart Accident Detection Team</p>
      `,
      'password-reset': `
        <h1>Password Reset Request</h1>
        <p>Dear {{name}},</p>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      'emergency-alert': `
        <h1 style="color: #dc2626;">🚨 EMERGENCY ALERT</h1>
        <p><strong>Incident ID:</strong> {{incidentId}}</p>
        <p><strong>Driver:</strong> {{driverName}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Time:</strong> {{time}}</p>
        <hr>
        <p>Please respond immediately.</p>
      `,
    };

    let html = templates[template] || '<p>No template found</p>';

    // Replace placeholders
    Object.entries(data).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    return html;
  }
}

export const emailService = new EmailService();
export const sendEmail = (options: EmailOptions) => emailService.sendEmail(options);