import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.model';
import { Location } from '../models/Location.model';
import { Incident } from '../models/Incident.model';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';

/* ============================================================
   GET USER PROFILE
============================================================ */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req as any).user?._id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
    } else if (user.role === 'admin') {
      stats = { message: 'Admin users have no specific stats' };
    }

    const userObject = (user as any).toObject ? (user as any).toObject() : user;
    return res.json({ success: true, data: { ...userObject, stats } });
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

    const userObject = (user as any).toObject ? (user as any).toObject() : user;
    return res.json({ success: true, message: 'Profile updated', data: userObject });
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
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const valid = await (user as any).comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ success: false, error: 'Incorrect current password' });

    user.password = newPassword;
    await user.save();

    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Changed',
      template: 'password-changed',
      data: { name: user.name },
    }).catch(err => logger.error('Password change email failed:', err));

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
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const contactData = { ...req.body, _id: crypto.randomUUID() };
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (contactData.isPrimary) {
      user.emergencyContacts?.forEach(c => { if (c) c.isPrimary = false; });
    }

    user.emergencyContacts = [...(user.emergencyContacts || []), contactData];
    await user.save();

    return res.json({ success: true, message: 'Contact added', data: user.emergencyContacts });
  } catch (error: any) {
    logger.error('Add emergency contact error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to add contact' });
  }
};

export const getEmergencyContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findById(userId).select('emergencyContacts');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, data: user.emergencyContacts || [] });
  } catch (error: any) {
    logger.error('Get emergency contacts error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get contacts' });
  }
};

export const updateEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { contactId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const updates = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const contacts = user.emergencyContacts || [];
    const index = contacts.findIndex(c => c && c._id === contactId);

    if (index === -1) return res.status(404).json({ success: false, error: 'Contact not found' });

    if (updates.isPrimary) {
      contacts.forEach(c => { if (c) c.isPrimary = false; });
    }

    const existingContact = contacts[index];
    if (existingContact) {
      contacts[index] = {
        ...existingContact,
        ...updates,
        _id: existingContact._id,
      };
    }

    user.emergencyContacts = contacts;
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
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.emergencyContacts = (user.emergencyContacts || []).filter(c => c && c._id !== contactId);
    await user.save();

    return res.json({ success: true, message: 'Contact deleted', data: user.emergencyContacts });
  } catch (error: any) {
    logger.error('Delete contact error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete contact' });
  }
};

/* ============================================================
   MEDICAL INFO
============================================================ */
export const getMedicalInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findById(userId).select('medicalInfo');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, data: user.medicalInfo ?? {} });
  } catch (error: any) {
    logger.error('Get medical info error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get medical info' });
  }
};

export const updateMedicalInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { medicalInfo: req.body } },
      { new: true, runValidators: true }
    ).select('medicalInfo');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, message: 'Medical info updated', data: user.medicalInfo });
  } catch (error: any) {
    logger.error('Update medical info error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update medical info' });
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
      const recentDriverIds = await Location.distinct('driverId', {
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      });
      query._id = status === 'online' ? { $in: recentDriverIds } : { $nin: recentDriverIds };
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
        const driverObject = (driver as any).toObject ? (driver as any).toObject() : driver;
        return { ...driverObject, lastLocation };
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

/* ============================================================
   GET ALL HOSPITALS
============================================================ */
export const getAllHospitals = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const query: any = { role: 'hospital' };

    if (search) {
      query.$or = [
        { hospitalName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const hospitals = await User.find(query)
      .select('hospitalName email phone address location registrationNumber isActive')
      .sort({ hospitalName: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    return res.json({
      success: true,
      data: {
        hospitals,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    logger.error('Get hospitals error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch hospitals' });
  }
};

/* ============================================================
   GET ALL RESPONDERS
============================================================ */
export const getAllResponders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, hospitalId } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const query: any = { role: 'responder' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (hospitalId) query.hospitalId = hospitalId;

    const responders = await User.find(query)
      .select('name email phone responderType hospitalId certifications isActive')
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    return res.json({
      success: true,
      data: {
        responders,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    logger.error('Get responders error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch responders' });
  }
};

/* ============================================================
   UPDATE USER STATUS (Admin only)
============================================================ */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select('-refreshToken -password');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    logger.info(`User ${user.email} status updated to ${isActive ? 'active' : 'inactive'} by admin`);

    return res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (error: any) {
    logger.error('Update user status error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update user status' });
  }
};

/* ============================================================
   DELETE USER (Admin only)
============================================================ */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (userId === (req as any).user?._id?.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    if (user.role === 'driver') {
      const hasIncidents = await Incident.exists({ driverId: userId });
      if (hasIncidents) {
        logger.info(`Deleting driver ${user.email} who has incident history`);
      }
    }

    await User.findByIdAndDelete(userId);

    if (user.role === 'driver') {
      await Location.deleteMany({ driverId: userId });
      await Incident.updateMany(
        { driverId: userId },
        { $set: { driverId: null, driverName: 'Deleted User' } }
      );
    }

    logger.info(`User ${user.email} deleted by admin`);

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    logger.error('Delete user error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete user' });
  }
};