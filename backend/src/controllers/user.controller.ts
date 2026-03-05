import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Location } from '../models/Location.model';
import { Incident } from '../models/Incident.model';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email.service';
import mongoose from 'mongoose';

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || req.user?._id;

    const user = await User.findById(userId)
      .select('-refreshToken')
      .populate('vehicleId', 'plateNumber model make');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get additional stats based on role
    let stats = {};
    
    if (user.role === 'driver') {
      const [totalTrips, lastLocation] = await Promise.all([
        Incident.countDocuments({ driverId: user._id }),
        Location.findOne({ driverId: user._id }).sort({ timestamp: -1 }),
      ]);
      
      stats = {
        totalTrips,
        lastLocation,
      };
    }

    if (user.role === 'hospital') {
      const activeIncidents = await Incident.countDocuments({
        hospitalId: user._id,
        status: { $in: ['dispatched', 'en-route', 'arrived', 'treating'] },
      });
      
      stats = {
        activeIncidents,
      };
    }

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        stats,
      },
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.password;
    delete updates.refreshToken;
    delete updates.role;
    delete updates.isVerified;
    delete updates._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully',
      template: 'password-changed',
      data: { name: user.name },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
};

export const addEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const contactData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate ID for contact
    contactData._id = new mongoose.Types.ObjectId().toString();

    // If this is primary contact, unset other primaries
    if (contactData.isPrimary) {
      user.emergencyContacts = user.emergencyContacts.map(contact => ({
        ...contact,
        isPrimary: false,
      }));
    }

    user.emergencyContacts.push(contactData);
    await user.save();

    res.json({
      success: true,
      data: user.emergencyContacts,
      message: 'Emergency contact added successfully',
    });
  } catch (error) {
    logger.error('Add emergency contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add emergency contact',
    });
  }
};

export const updateEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { contactId } = req.params;
    const contactData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const contactIndex = user.emergencyContacts.findIndex(
      c => c._id?.toString() === contactId
    );

    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Emergency contact not found',
      });
    }

    // If this contact is being set as primary, unset other primaries
    if (contactData.isPrimary) {
      user.emergencyContacts.forEach(contact => {
        contact.isPrimary = false;
      });
    }

    // Update contact
    user.emergencyContacts[contactIndex] = {
      ...user.emergencyContacts[contactIndex].toObject(),
      ...contactData,
    };

    await user.save();

    res.json({
      success: true,
      data: user.emergencyContacts,
      message: 'Emergency contact updated successfully',
    });
  } catch (error) {
    logger.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update emergency contact',
    });
  }
};

export const deleteEmergencyContact = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { contactId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.emergencyContacts = user.emergencyContacts.filter(
      c => c._id?.toString() !== contactId
    );

    await user.save();

    res.json({
      success: true,
      data: user.emergencyContacts,
      message: 'Emergency contact deleted successfully',
    });
  } catch (error) {
    logger.error('Delete emergency contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete emergency contact',
    });
  }
};

export const getEmergencyContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId).select('emergencyContacts');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user.emergencyContacts || [],
    });
  } catch (error) {
    logger.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get emergency contacts',
    });
  }
};

export const updateMedicalInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const medicalData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.medicalInfo = {
      ...user.medicalInfo,
      ...medicalData,
    };

    await user.save();

    res.json({
      success: true,
      data: user.medicalInfo,
      message: 'Medical information updated successfully',
    });
  } catch (error) {
    logger.error('Update medical info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update medical information',
    });
  }
};

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query: any = { role: 'driver' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'online') {
      // Get drivers with recent location updates
      const recentDrivers = await Location.distinct('driverId', {
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      });
      query._id = { $in: recentDrivers };
    } else if (status === 'offline') {
      const recentDrivers = await Location.distinct('driverId', {
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      });
      query._id = { $nin: recentDrivers };
    }

    const drivers = await User.find(query)
      .select('-refreshToken -emergencyContacts -medicalInfo')
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get latest location for each driver
    const driversWithLocation = await Promise.all(
      drivers.map(async (driver) => {
        const lastLocation = await Location.findOne({ driverId: driver._id })
          .sort({ timestamp: -1 });
        
        return {
          ...driver.toJSON(),
          lastLocation,
        };
      })
    );

    res.json({
      success: true,
      data: {
        drivers: driversWithLocation,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Get all drivers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get drivers',
    });
  }
};

export const getAllHospitals = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, available } = req.query;

    const query: any = { role: 'hospital' };

    if (search) {
      query.$or = [
        { hospitalName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (available !== undefined) {
      query.isAvailable = available === 'true';
    }

    const hospitals = await User.find(query)
      .select('-refreshToken -emergencyContacts')
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get stats for each hospital
    const hospitalsWithStats = await Promise.all(
      hospitals.map(async (hospital) => {
        const activeIncidents = await Incident.countDocuments({
          hospitalId: hospital._id,
          status: { $in: ['dispatched', 'en-route', 'arrived', 'treating'] },
        });

        return {
          ...hospital.toJSON(),
          stats: {
            activeIncidents,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        hospitals: hospitalsWithStats,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Get all hospitals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hospitals',
    });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Only admin can update status
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: 'Account Status Updated',
      template: 'account-status',
      data: {
        name: user.name,
        status: isActive ? 'activated' : 'deactivated',
      },
    });

    res.json({
      success: true,
      data: user,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Only admin can delete users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Soft delete by marking inactive instead of actual deletion
    user.isActive = false;
    user.email = `${user.email}_deleted_${Date.now()}`; // Make email unique for potential future use
    await user.save();

    // Delete related data
    await Location.deleteMany({ driverId: userId });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Verify token (in production, use proper JWT verification)
    const user = await User.findOneAndUpdate(
      { emailVerificationToken: token },
      { 
        isVerified: true,
        emailVerificationToken: null,
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email',
    });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
      });
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15);

    user.emailVerificationToken = verificationToken;
    await user.save();

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email',
      template: 'email-verification',
      data: {
        name: user.name,
        verificationLink: `${process.env.CLIENT_URL}/verify-email/${verificationToken}`,
      },
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
    });
  }
};