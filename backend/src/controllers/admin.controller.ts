import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { logger } from '../utils/logger';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      totalDrivers,
      totalHospitals,
      totalResponders,
      recentIncidents,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Incident.countDocuments(),
      Incident.countDocuments({ status: { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route', 'arrived'] } }),
      Incident.countDocuments({ status: 'resolved' }),
      User.countDocuments({ role: 'driver', isActive: true }),
      User.countDocuments({ role: 'hospital', isActive: true }),
      User.countDocuments({ role: 'responder', isActive: true }),
      Incident.find().sort({ createdAt: -1 }).limit(5).lean(),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password -refreshToken').lean(),
    ]);

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalIncidents,
          activeIncidents,
          resolvedIncidents,
          totalDrivers,
          totalHospitals,
          totalResponders,
        },
        recentIncidents,
        recentUsers,
      },
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
};

// ─── Get All Users ────────────────────────────────────────────────────────────

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const search = req.query.search as string;
    const isActive = req.query.isActive;

    const filter: any = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password -refreshToken -passwordResetToken -emailVerificationToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// ─── Get Single User ──────────────────────────────────────────────────────────

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -passwordResetToken -emailVerificationToken')
      .lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

// ─── Update User ──────────────────────────────────────────────────────────────

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { password, refreshToken, ...updates } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

// ─── Toggle User Active Status ────────────────────────────────────────────────

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
};

// ─── Delete User ──────────────────────────────────────────────────────────────

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};

// ─── Get All Incidents ────────────────────────────────────────────────────────

export const getAllIncidents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const severity = req.query.severity as string;

    const filter: any = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const total = await Incident.countDocuments(filter);
    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: incidents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get all incidents error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch incidents' });
  }
};

// ─── System Health ────────────────────────────────────────────────────────────

export const getSystemHealth = async (_req: Request, res: Response) => {
  try {
    // Use static import instead of dynamic
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection?.readyState === 1 ? 'connected' : 'disconnected';

    return res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbStatus,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  } catch (error) {
    logger.error('System health error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get system health' });
  }
};

// ─── System Reports ───────────────────────────────────────────────────────────

export const getSystemReports = async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      incidentsByStatus,
      incidentsBySeverity,
      incidentsByType,
      newUsersThisMonth,
      incidentsThisMonth,
    ] = await Promise.all([
      Incident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Incident.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Incident.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    return res.json({
      success: true,
      data: {
        incidentsByStatus,
        incidentsBySeverity,
        incidentsByType,
        newUsersThisMonth,
        incidentsThisMonth,
      },
    });
  } catch (error) {
    logger.error('System reports error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate reports' });
  }
};
