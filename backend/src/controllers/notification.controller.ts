import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import {
  NotificationPrefs,
  EscalationPolicy,
  DeliveryReceipt,
} from '../models/Notification.model';

const DEFAULT_STEPS = [
  { level: 1, delaySeconds: 0, recipients: ['primary_kin'], channels: ['push', 'sms'] },
  { level: 2, delaySeconds: 60, recipients: ['primary_kin', 'secondary_kin'], channels: ['sms', 'call'] },
  { level: 3, delaySeconds: 180, recipients: ['all_kin', 'fleet_manager'], channels: ['sms', 'call', 'email'] },
];

/* ============================================================
   GET NOTIFICATION PREFS    GET /api/notifications/prefs
============================================================ */
export const getNotificationPrefs = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const prefs = await NotificationPrefs.findOne({ driverId });
    return res.json({ success: true, data: prefs ?? {} });
  } catch (error: any) {
    logger.error('Get notification prefs error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   SAVE NOTIFICATION PREFS   PUT /api/notifications/prefs
============================================================ */
export const saveNotificationPrefs = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const prefs = await NotificationPrefs.findOneAndUpdate(
      { driverId },
      { $set: { ...req.body, driverId } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({ success: true, message: 'Preferences saved', data: prefs });
  } catch (error: any) {
    logger.error('Save notification prefs error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET ESCALATION POLICY    GET /api/notifications/escalation-policy
============================================================ */
export const getEscalationPolicy = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const policy = await EscalationPolicy.findOne({ driverId });

    if (!policy) {
      return res.json({
        success: true,
        data: { id: 'default', name: 'Standard escalation', steps: DEFAULT_STEPS },
      });
    }

    return res.json({ success: true, data: policy });
  } catch (error: any) {
    logger.error('Get escalation policy error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   SAVE ESCALATION POLICY   PUT /api/notifications/escalation-policy
============================================================ */
export const saveEscalationPolicy = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { name, steps } = req.body;

    const policy = await EscalationPolicy.findOneAndUpdate(
      { driverId },
      { $set: { driverId, name, steps } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({ success: true, message: 'Policy saved', data: policy });
  } catch (error: any) {
    logger.error('Save escalation policy error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   TRIGGER ESCALATION    POST /api/notifications/escalate
============================================================ */
export const triggerEscalation = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      logger.warn('Trigger escalation failed: Unauthorized - no user ID');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { incidentId } = req.body;
    
    // Validate incidentId
    if (!incidentId) {
      logger.warn('Trigger escalation failed: incidentId missing from request body');
      return res.status(400).json({ success: false, error: 'incidentId required' });
    }

    // Log the incoming request
    logger.info(`Processing escalation for incident: ${incidentId} (type: ${typeof incidentId})`);

    // Get driver's policy (or use default)
    const policy = await EscalationPolicy.findOne({ driverId });
    const steps = policy?.steps ?? DEFAULT_STEPS;

    // Get driver's notification prefs
    const prefs = await NotificationPrefs.findOne({ driverId });

    // Build receipts for level 1 step immediately
    const level1 = steps.find(s => s.level === 1) ?? steps[0];
    const channels = level1?.channels ?? ['push', 'sms'];

    // Helper: resolve recipient contact string based on channel
    const resolveContact = (channel: string): string => {
      switch (channel) {
        case 'sms':
        case 'call':
          return prefs?.smsPhoneNumber ?? '';
        case 'email':
          return prefs?.emailAddress ?? '';
        default:
          return '';
      }
    };

    // Create receipts for each channel
    const receipts = await Promise.all(
      channels.map(async (channel) => {
        // Ensure incidentId is stored as a string to avoid BSON casting errors
        const receiptData = {
          incidentId: String(incidentId).trim(),
          driverId,
          recipientId: driverId.toString(),
          recipientName: 'Emergency Contact',
          channel,
          status: 'pending' as const,
          sentAt: new Date(),
          retryCount: 0,
        };

        // Add contact info if available
        const contactInfo = resolveContact(channel);
        if (contactInfo) {
          receiptData.recipientName = `Emergency Contact (${contactInfo})`;
        }

        const receipt = await DeliveryReceipt.create(receiptData);
        logger.debug(`Created receipt for incident ${incidentId}: ${receipt._id} (${channel})`);
        return receipt;
      })
    );

    logger.info(
      `✅ Escalation triggered successfully for incident ${incidentId} by driver ${driverId}, ` +
      `created ${receipts.length} receipts (channels: ${channels.join(', ')})`
    );

    return res.json({
      success: true,
      data: {
        incidentId,
        driverId,
        receipts,
        channels,
        escalationLevel: level1.level,
      },
    });
  } catch (error: any) {
    logger.error('❌ Trigger escalation error:', {
      message: error.message,
      stack: error.stack,
      incidentId: req.body?.incidentId,
      driverId: req.user?._id,
    });
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.message,
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        details: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger escalation',
      details: error.message,
    });
  }
};

/* ============================================================
   RESOLVE ESCALATION   POST /api/notifications/escalate/:incidentId/resolve
============================================================ */
export const resolveEscalation = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    
    if (!incidentId) {
      logger.warn('Resolve escalation failed: incidentId missing from params');
      return res.status(400).json({ success: false, error: 'incidentId required' });
    }

    logger.info(`Resolving escalation for incident: ${incidentId}`);

    // Mark all pending/sent receipts for this incident as failed (escalation cancelled)
    const result = await DeliveryReceipt.updateMany(
      { incidentId: String(incidentId), status: { $in: ['pending', 'sent'] } },
      { 
        $set: { 
          status: 'failed', 
          failureReason: 'Escalation resolved before delivery',
          deliveredAt: new Date(),
        } 
      }
    );

    logger.info(
      `✅ Escalation resolved for incident ${incidentId}. ` +
      `Updated ${result.modifiedCount} receipts`
    );
    
    return res.json({ 
      success: true, 
      message: 'Escalation resolved',
      data: {
        incidentId,
        updatedReceipts: result.modifiedCount,
      }
    });
  } catch (error: any) {
    logger.error('Resolve escalation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET DELIVERY RECEIPTS   GET /api/notifications/receipts
============================================================ */
export const getDeliveryReceipts = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { incidentId, status, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Build query
    const query: any = { driverId };
    
    if (incidentId) {
      query.incidentId = String(incidentId);
    }
    
    // Map frontend status values to DB status values
    if (status) {
      if (status === 'pending') {
        // pending on frontend = pending OR sent in DB (not yet confirmed)
        query.status = { $in: ['pending', 'sent'] };
      } else if (status === 'delivered') {
        // delivered on frontend = delivered OR read in DB
        query.status = { $in: ['delivered', 'read'] };
      } else {
        query.status = status; // 'failed' maps 1-to-1
      }
    }

    logger.debug(`Fetching receipts for driver ${driverId}`, { incidentId, status, page, limit });

    const [rawReceipts, total] = await Promise.all([
      DeliveryReceipt.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      DeliveryReceipt.countDocuments(query),
    ]);

    // Normalise DB statuses to the three values the frontend understands
    const receipts = rawReceipts.map((receipt) => {
      let normalisedStatus: 'pending' | 'delivered' | 'failed';
      
      if (receipt.status === 'delivered' || receipt.status === 'read') {
        normalisedStatus = 'delivered';
      } else if (receipt.status === 'failed') {
        normalisedStatus = 'failed';
      } else {
        // 'pending' | 'sent'
        normalisedStatus = 'pending';
      }
      
      return {
        ...receipt,
        status: normalisedStatus,
      };
    });

    // Disable HTTP caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.json({
      success: true,
      data: receipts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('Get delivery receipts error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};