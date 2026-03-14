import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog.model';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * createAuditEntry
 * Call this from any controller to log an admin action.
 *
 * Example:
 *   await createAuditEntry(req, 'USER_CREATED', 'driver@smartroad.com', newUser._id);
 */
export const createAuditEntry = async (
  req: AuthRequest,
  action: string,
  target?: string,
  targetId?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      actorId:   req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action:    action.toUpperCase(),
      target,
      targetId,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    // Audit log failure must NEVER break the main request
    logger.error('Failed to write audit log entry:', err);
  }
};

// ─── GET /admin/audit-log ─────────────────────────────────────────────────────

export const getAuditLog = async (req: Request, res: Response) => {
  try {
    const page      = parseInt(req.query.page  as string) || 1;
    const limit     = parseInt(req.query.limit as string) || 50;
    const actorRole = req.query.actorRole as string | undefined;
    const action    = req.query.action    as string | undefined;
    const actorId   = req.query.actorId   as string | undefined;
    const from      = req.query.from      as string | undefined;
    const to        = req.query.to        as string | undefined;

    const filter: Record<string, any> = {};

    if (actorRole) filter.actorRole = actorRole;
    if (actorId)   filter.actorId   = actorId;

    // Action supports partial match so the frontend search box works
    if (action) {
      filter.$or = [
        { action:    { $regex: action, $options: 'i' } },
        { actorName: { $regex: action, $options: 'i' } },
        { target:    { $regex: action, $options: 'i' } },
      ];
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [total, entries] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    // Reshape to match the AuditEntry type the frontend expects
    const data = entries.map((e) => ({
      id:        e._id.toString(),
      timestamp: e.createdAt.getTime(),
      actorId:   e.actorId.toString(),
      actorName: e.actorName,
      actorRole: e.actorRole,
      action:    e.action,
      target:    e.target,
      ipAddress: e.ipAddress,
    }));

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get audit log error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
  }
};
