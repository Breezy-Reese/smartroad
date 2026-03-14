import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import {
  NotificationPrefs,
  EscalationPolicy,
  DeliveryReceipt,
} from '../models/Notification.model';

const DEFAULT_STEPS = [
  { level: 1, delaySeconds: 0,   recipients: ['primary_kin'],               channels: ['push', 'sms']          },
  { level: 2, delaySeconds: 60,  recipients: ['primary_kin','secondary_kin'],channels: ['sms', 'call']          },
  { level: 3, delaySeconds: 180, recipients: ['all_kin', 'fleet_manager'],   channels: ['sms', 'call', 'email'] },
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

    let policy = await EscalationPolicy.findOne({ driverId });

    if (!policy) {
      // Return default without saving — saved only when driver explicitly saves
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
   Delegates timer logic to backend — frontend no longer needs timers
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

    // Create a pending receipt for level 1 immediately
    // Full escalation chain is handled by your notification.service
    // (hook into your existing notificationService here)
    const log = {
      incidentId,
      driverId,
      triggeredAt: new Date(),
      escalationLevel: 1,
      steps,
    };

    // TODO: call your existing notificationService to actually send SMS/push
    // e.g. notificationService.sendEmergencyAlerts(incidentId, driverId.toString(), steps)

    logger.info(`Escalation triggered for incident ${incidentId} by driver ${driverId}`);

    return res.json({ success: true, data: log });
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

    // TODO: cancel any queued notification jobs for this incidentId

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
    if (status)     query.status = status;

    const [receipts, total] = await Promise.all([
      DeliveryReceipt.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      DeliveryReceipt.countDocuments(query),
    ]);

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
