import { Response } from 'express';
import { TripScore } from '../models/TripScore.model';
import { User } from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

/* ============================================================
   SUBMIT TRIP SCORE   POST /api/users/trip-scores
============================================================ */
export const submitTripScore = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { tripId, score, grade, distance, duration, startTime, endTime, events } = req.body;

    const tripScore = await TripScore.create({
      driverId,
      tripId,
      score,
      grade,
      distance,
      duration,
      startTime: new Date(startTime),
      endTime:   new Date(endTime),
      events:    (events ?? []).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })),
    });

    return res.status(201).json({ success: true, data: tripScore });
  } catch (error: any) {
    logger.error('Submit trip score error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to submit trip score' });
  }
};

/* ============================================================
   GET TRIP HISTORY    GET /api/users/trip-scores
============================================================ */
export const getTripScores = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { page = 1, limit = 20 } = req.query;
    const pageNum  = Number(page);
    const limitNum = Number(limit);

    const [trips, total] = await Promise.all([
      TripScore.find({ driverId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      TripScore.countDocuments({ driverId }),
    ]);

    return res.json({
      success: true,
      data: trips,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    logger.error('Get trip scores error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get trip scores' });
  }
};

/* ============================================================
   GET AVERAGE SCORE   GET /api/users/trip-scores/average
============================================================ */
export const getAverageTripScore = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const result = await TripScore.aggregate([
      { $match: { driverId } },
      { $group: { _id: null, average: { $avg: '$score' }, total: { $sum: 1 } } },
    ]);

    const average = result[0] ? Math.round(result[0].average) : null;

    return res.json({ success: true, data: { average, total: result[0]?.total ?? 0 } });
  } catch (error: any) {
    logger.error('Get average trip score error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get average score' });
  }
};

/* ============================================================
   GET PREFERENCES     GET /api/users/preferences
============================================================ */
export const getPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findById(driverId).select('preferences');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, data: (user as any).preferences ?? {} });
  } catch (error: any) {
    logger.error('Get preferences error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get preferences' });
  }
};

/* ============================================================
   SAVE PREFERENCES    PUT /api/users/preferences
============================================================ */
export const savePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await User.findByIdAndUpdate(
      driverId,
      { $set: { preferences: req.body } },
      { new: true, runValidators: true },
    ).select('preferences');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, message: 'Preferences saved', data: (user as any).preferences });
  } catch (error: any) {
    logger.error('Save preferences error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to save preferences' });
  }
};
