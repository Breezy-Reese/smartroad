import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.model';
import { Location } from '../models/Location.model';
import { Incident } from '../models/Incident.model';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email.service';

/* ============================================================
   GET USER PROFILE
============================================================ */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req as any).user?._id;

    const user = await User.findById(userId)
      .select('-refreshToken')
      .populate('vehicleId', 'plateNumber model make');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let stats: any = {};

    if (user.role === 'driver') {
      const [totalTrips, lastLocation] = await Promise.all([
        Incident.countDocuments({ driverId: user._id }),
        Location.findOne({ driverId: user._id }).sort({ timestamp: -1 }),
      ]);
      stats = { totalTrips, lastLocation };
    } else if (user.role === 'hospital') {
      const activeIncidents = await Incident.countDocuments({
        hospitalId: user._id,
        status: { $in: ['dispatched', 'en-route', 'arrived', 'treating'] },
      });
      stats = { activeIncidents };
    }

    return res.json({ success: true, data: { ...user.toJSON(), stats } });
  } catch (error: any) {
    logger.error('Get user profile error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get profile' });
  }
};

/* ============================================================
   UPDATE PROFILE
============================================================ */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const updates = { ...req.body };
    ['password', 'refreshToken', 'role', 'isVerified', '_id'].forEach((field) => delete updates[field]);

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true })
      .select('-refreshToken');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error: any) {
    logger.error('Update profile error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
};

/* ============================================================
   CHANGE PASSWORD
============================================================ */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ success: false, error: 'Incorrect current password' });

    user.password = newPassword;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Password Changed',
      template: 'password-changed',
      data: { name: user.name },
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    logger.error('Change password error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to change password' });
  }
};

/* ============================================================
   EMERGENCY CONTACTS
============================================================ */
export const addEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const contactData = { ...req.body, _id: crypto.randomUUID() };

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (contactData.isPrimary) user.emergencyContacts?.forEach(c => c.isPrimary = false);

    user.emergencyContacts = [...(user.emergencyContacts || []), contactData];
    await user.save();

    return res.json({ success: true, message: 'Contact added', data: user.emergencyContacts });
  } catch (error: any) {
    logger.error('Add emergency contact error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to add contact' });
  }
};

export const updateEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { contactId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const index = (user.emergencyContacts || []).findIndex(c => c._id === contactId);
    if (index === -1) return res.status(404).json({ success: false, error: 'Contact not found' });

    if (updates.isPrimary) user.emergencyContacts.forEach(c => c.isPrimary = false);
    user.emergencyContacts[index] = { ...user.emergencyContacts[index], ...updates };

    await user.save();
    return res.json({ success: true, message: 'Contact updated', data: user.emergencyContacts });
  } catch (error: any) {
    logger.error('Update contact error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update contact' });
  }
};

export const deleteEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { contactId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.emergencyContacts = (user.emergencyContacts || []).filter(c => c._id !== contactId);
    await user.save();

    return res.json({ success: true, message: 'Contact deleted', data: user.emergencyContacts });
  } catch (error: any) {
    logger.error('Delete contact error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete contact' });
  }
};

/* ============================================================
   GET ALL DRIVERS
============================================================ */
export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const query: any = { role: 'driver' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'online' || status === 'offline') {
      const recent = await Location.distinct('driverId', {
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      });
      query._id = status === 'online' ? { $in: recent } : { $nin: recent };
    }

    const drivers = await User.find(query)
      .select('-refreshToken')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    const data = await Promise.all(
      drivers.map(async (driver) => {
        const lastLocation = await Location.findOne({ driverId: driver._id }).sort({ timestamp: -1 });
        return { ...driver.toJSON(), lastLocation };
      })
    );

    return res.json({
      success: true,
      data: {
        drivers: data,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    logger.error('Get drivers error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch drivers' });
  }
};