import * as dotenv from 'dotenv';
dotenv.config();
import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, any>;
}

class EmailService {
  private transporter: Transporter | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  // ================= INITIALIZE =================

  private async initialize(): Promise<void> {
    try {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        logger.warn('SMTP configuration missing. Email service disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      // Verify connection
      await this.transporter.verify();

      this.initialized = true;

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  // ================= SEND EMAIL =================

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      logger.warn('Email service not initialized. Email not sent.');
      return false;
    }

    try {
      const from = process.env.EMAIL_FROM || 'noreply@smart-accident-system.com';

      let html = options.html;
      let text = options.text;

      if (options.template) {
        html = this.renderTemplate(options.template, options.data || {});
      }

      if (!text && html) {
        text = html.replace(/<[^>]*>?/gm, '');
      }

      const mailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent to ${options.to} (${info.messageId})`);

      return true;
    } catch (error) {
      logger.error('Email send failed:', error);
      return false;
    }
  }

  // ================= PRESET EMAILS =================

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
      time?: string;
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
    report: Record<string, any>
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Incident Report - #${report.incidentId}`,
      template: 'incident-report',
      data: report,
    });
  }

  // ================= TEMPLATE ENGINE =================

  private renderTemplate(template: string, data: Record<string, any>): string {
    const templates: Record<string, string> = {
      welcome: `
        <h1>Welcome to Smart Accident Detection System</h1>
        <p>Dear {{name}},</p>
        <p>Your account has been successfully created.</p>
        <p>You can now access the emergency dashboard and configure your profile.</p>
        <p>Stay safe.</p>
        <p><strong>Smart Accident Detection Team</strong></p>
      `,

      'password-reset': `
        <h1>Password Reset Request</h1>
        <p>Hello {{name}},</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
      `,

      'emergency-alert': `
        <h1 style="color:#dc2626;">🚨 EMERGENCY ALERT</h1>
        <p><strong>Incident ID:</strong> {{incidentId}}</p>
        <p><strong>Driver:</strong> {{driverName}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Time:</strong> {{time}}</p>
        <hr/>
        <p>Please respond immediately.</p>
      `,

      'incident-report': `
        <h1>Incident Report</h1>
        <p><strong>ID:</strong> {{incidentId}}</p>
        <p><strong>Driver:</strong> {{driverName}}</p>
        <p><strong>Status:</strong> {{status}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
      `,
    };

    let html = templates[template] || '<p>Template not found</p>';

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
    });

    return html;
  }
}

export const emailService = new EmailService();
export const sendEmail = (options: EmailOptions) =>
  emailService.sendEmail(options);