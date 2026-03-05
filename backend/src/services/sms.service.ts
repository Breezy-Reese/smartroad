import twilio from 'twilio';
import { logger } from '../utils/logger';

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

class SMSService {
  private client: twilio.Twilio | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.initialized = true;
      logger.info('SMS service initialized');
    } else {
      logger.warn('Twilio credentials not found. SMS service disabled.');
    }
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.initialized || !this.client) {
      logger.warn('SMS service not initialized. Message not sent.');
      return false;
    }

    try {
      const from = options.from || process.env.TWILIO_PHONE_NUMBER;
      
      if (!from) {
        throw new Error('No from phone number configured');
      }

      const result = await this.client.messages.create({
        body: options.message,
        to: options.to,
        from,
      });

      logger.info(`SMS sent successfully to ${options.to}: ${result.sid}`);
      return true;
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      return false;
    }
  }

  async sendBulkSMS(
    recipients: string[],
    message: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    await Promise.all(
      recipients.map(async (to) => {
        const sent = await this.sendSMS({ to, message });
        if (sent) success++;
        else failed++;
      })
    );

    logger.info(`Bulk SMS: ${success} sent, ${failed} failed`);
    return { success, failed };
  }

  async sendEmergencyAlert(
    phoneNumber: string,
    incidentDetails: {
      driverName: string;
      location: string;
      severity: string;
    }
  ): Promise<boolean> {
    const message = `🚨 EMERGENCY ALERT\n\n` +
      `${incidentDetails.driverName} has been involved in a ${incidentDetails.severity} severity accident.\n` +
      `Location: ${incidentDetails.location}\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `Please respond immediately.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  async sendResponderDispatch(
    phoneNumber: string,
    dispatchDetails: {
      incidentId: string;
      location: string;
      eta: number;
    }
  ): Promise<boolean> {
    const message = `🚑 RESPONDER DISPATCH\n\n` +
      `You have been dispatched to incident #${dispatchDetails.incidentId}\n` +
      `Location: ${dispatchDetails.location}\n` +
      `ETA: ${dispatchDetails.eta} minutes\n\n` +
      `Please acknowledge and proceed immediately.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  async sendStatusUpdate(
    phoneNumber: string,
    update: {
      incidentId: string;
      status: string;
      message?: string;
    }
  ): Promise<boolean> {
    const message = `📋 INCIDENT UPDATE\n\n` +
      `Incident #${update.incidentId}\n` +
      `Status: ${update.status}\n` +
      (update.message ? `Message: ${update.message}\n` : '') +
      `Time: ${new Date().toLocaleString()}`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  async verifyPhoneNumber(phoneNumber: string): Promise<string> {
    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const message = `Your verification code is: ${code}\n` +
      `This code will expire in 10 minutes.`;

    await this.sendSMS({ to: phoneNumber, message });

    return code;
  }
}

export const smsService = new SMSService();
export const sendSMS = (options: SMSOptions) => smsService.sendSMS(options);