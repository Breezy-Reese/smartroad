import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as notificationController from '../controllers/notification.controller';
import { authenticate, requireDriver } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

/* ── Notification preferences ── */
router.get('/prefs',
  authenticate,
  notificationController.getNotificationPrefs,
);

router.put('/prefs',
  authenticate,
  validate([
    body('pushEnabled').optional().isBoolean(),
    body('smsEnabled').optional().isBoolean(),
    body('smsPhoneNumber').optional().matches(/^\+?[\d\s-]{7,}$/).withMessage('Invalid phone number'),
    body('emailEnabled').optional().isBoolean(),
    body('emailAddress').optional().isEmail().normalizeEmail(),
    body('smsFallbackOnPushFail').optional().isBoolean(),
    body('quietHoursEnabled').optional().isBoolean(),
    body('quietHoursStart').optional().matches(/^\d{2}:\d{2}$/),
    body('quietHoursEnd').optional().matches(/^\d{2}:\d{2}$/),
  ]),
  notificationController.saveNotificationPrefs,
);

/* ── Escalation policy ── */
router.get('/escalation-policy',
  authenticate,
  notificationController.getEscalationPolicy,
);

router.put('/escalation-policy',
  authenticate,
  validate([
    body('name').optional().isString().trim(),
    body('steps').isArray().withMessage('Steps must be an array'),
    body('steps.*.level').isIn([1, 2, 3]).withMessage('Level must be 1, 2, or 3'),
    body('steps.*.delaySeconds').isInt({ min: 0 }).withMessage('Delay must be a positive integer'),
    body('steps.*.recipients').isArray(),
    body('steps.*.channels').isArray(),
  ]),
  notificationController.saveEscalationPolicy,
);

/* ── Escalation triggers ── */
router.post('/escalate',
  authenticate,
  requireDriver,
  validate([
    body('incidentId').notEmpty().withMessage('incidentId is required'),
  ]),
  notificationController.triggerEscalation,
);

router.post('/escalate/:incidentId/resolve',
  authenticate,
  validate([
    param('incidentId').notEmpty(),
  ]),
  notificationController.resolveEscalation,
);

/* ── Delivery receipts ── */
router.get('/receipts',
  authenticate,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'read']),
  ]),
  notificationController.getDeliveryReceipts,
);

export default router;
