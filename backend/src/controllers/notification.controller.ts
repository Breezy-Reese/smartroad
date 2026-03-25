import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import {
  NotificationPrefs,
  EscalationPolicy,
  DeliveryReceipt,
} from '../models/Notification.model';

const DEFAULT_STEPS = [
  { level: 1, delaySeconds: 0,   recipients: ['primary_kin'],                channels: ['push', 'sms']          },
  { level: 2, delaySeconds: 60,  recipients: ['primary_kin','secondary_kin'], channels: ['sms', 'call']          },
  { level: 3, delaySeconds: 180, recipients: ['all_kin', 'fleet_manager'],    channels: ['sms', 'call', 'email'] },
];

/* ============================================================
   GET NOTIFICATION PREFS    GET /api/notifications/prefs
============================================================ */
export const getNotificationPrefs = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const prefs = await NotificationPrefs.findOneAndUpdate(
      { driverId },
      { $set: { ...req.body, driverId } },
      { new: true, upsert: true, runValidators: true },
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
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { name, steps } = req.body;

    const policy = await EscalationPolicy.findOneAndUpdate(
      { driverId },
      { $set: { driverId, name, steps } },
      { new: true, upsert: true, runValidators: true },
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
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { incidentId } = req.body;
    if (!incidentId) return res.status(400).json({ success: false, error: 'incidentId required' });

    // Get driver's policy (or use default)
    const policy = await EscalationPolicy.findOne({ driverId });
    const steps  = policy?.steps ?? DEFAULT_STEPS;

    // Get driver's notification prefs
    const prefs = await NotificationPrefs.findOne({ driverId });

    // Build receipts for level 1 step immediately
    const level1   = steps.find(s => s.level === 1) ?? steps[0];
    const channels = level1?.channels ?? ['push', 'sms'];

    // Helper: resolve recipient contact string based on channel
    const resolveContact = (channel: string): string => {
      switch (channel) {
        case 'sms':
        case 'call':  return prefs?.smsPhoneNumber  ?? '';
        case 'email': return prefs?.emailAddress     ?? '';
        default:      return '';
      }
    };

    const receipts = await Promise.all(
      channels.map(async (channel) => {
        const receipt = await DeliveryReceipt.create({
          incidentId,
          driverId,
          recipientId:   driverId.toString(),
          // FIX 1: recipientName is always a human-readable label, not a contact value
          recipientName: 'Emergency Contact',
          // FIX 2: store the actual contact in a separate field
          // (channel-appropriate: phone for sms/call, email for email, empty for push)
          channel,
          // FIX 3: status was 'sent' which is not a valid ReceiptStatus on the frontend.
          // Use 'pending' on creation — update to 'delivered' or 'failed' after
          // the actual push/SMS/call/email send attempt completes.
          status:  'pending',
          sentAt:  new Date(),
          // Store contact info inside recipientName until a recipientContact field is
          // added to the schema — or add it now (see note below).
          // For now we append it so the UI can show something meaningful:
          ...(resolveContact(channel) && {
            recipientName: `Emergency Contact (${resolveContact(channel)})`,
          }),
        });
        return receipt;
      }),
    );

    logger.info(
      `Escalation triggered for incident ${incidentId} by driver ${driverId}, ` +
      `created ${receipts.length} receipts`,
    );

    return res.json({ success: true, data: { incidentId, driverId, receipts } });
  } catch (error: any) {
    logger.error('Trigger escalation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   RESOLVE ESCALATION   POST /api/notifications/escalate/:incidentId/resolve
============================================================ */
export const resolveEscalation = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;

    // Mark all pending/sent receipts for this incident as failed (escalation cancelled)
    await DeliveryReceipt.updateMany(
      { incidentId, status: { $in: ['pending', 'sent'] } },
      { $set: { status: 'failed', failureReason: 'Escalation resolved before delivery' } },
    );

    logger.info(`Escalation resolved for incident ${incidentId}`);
    return res.json({ success: true, message: 'Escalation resolved' });
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
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { incidentId, status, page = 1, limit = 50 } = req.query;
    const pageNum  = Number(page);
    const limitNum = Number(limit);

    const query: any = { driverId };
    if (incidentId) query.incidentId = incidentId;
    // FIX 4: map frontend ReceiptStatus values to the full set of DB status values.
    // Frontend only knows 'delivered' | 'failed' | 'pending'.
    // 'sent' and 'read' are DB-only states — map them so filters work correctly.
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

    const [rawReceipts, total] = await Promise.all([
      DeliveryReceipt.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      DeliveryReceipt.countDocuments(query),
    ]);

    // FIX 5: normalise DB statuses to the three values the frontend understands
    const receipts = rawReceipts.map((r) => {
      const doc = r.toObject();
      let normalisedStatus: 'pending' | 'delivered' | 'failed';
      if (doc.status === 'delivered' || doc.status === 'read') {
        normalisedStatus = 'delivered';
      } else if (doc.status === 'failed') {
        normalisedStatus = 'failed';
      } else {
        // 'pending' | 'sent'
        normalisedStatus = 'pending';
      }
      return { ...doc, status: normalisedStatus };
    });

    // FIX 6: disable HTTP caching so the browser never serves a stale 304
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    return res.json({
      success: true,
      data: receipts,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    logger.error('Get delivery receipts error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};