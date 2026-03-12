import { Request, Response } from 'express';
import { Ambulance } from '../models/Ambulance.model';
import { logger } from '../utils/logger';

/* ============================================================
   GET ALL AMBULANCES
============================================================ */
export const getAllAmbulances = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter: any = { isActive: true };
    if (status) filter.status = status;

    const [ambulances, total] = await Promise.all([
      Ambulance.find(filter)
        .populate('driverId', 'name phone')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Ambulance.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        ambulances,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    logger.error('Get ambulances error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch ambulances' });
  }
};

/* ============================================================
   GET SINGLE AMBULANCE
============================================================ */
export const getAmbulanceById = async (req: Request, res: Response) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id)
      .populate('driverId', 'name phone')
      .lean();

    if (!ambulance) return res.status(404).json({ success: false, error: 'Ambulance not found' });

    return res.json({ success: true, data: ambulance });
  } catch (error: any) {
    logger.error('Get ambulance error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch ambulance' });
  }
};

/* ============================================================
   CREATE AMBULANCE
============================================================ */
export const createAmbulance = async (req: Request, res: Response) => {
  try {
    const { plateNumber, ambulanceModel, make, year, driverId, driverName, notes } = req.body;

    const existing = await Ambulance.findOne({ plateNumber: plateNumber?.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Plate number already registered' });
    }

    const ambulance = await Ambulance.create({
      plateNumber,
      ambulanceModel,
      make,
      year,
      driverId: driverId || undefined,
      driverName,
      notes,
    });

    return res.status(201).json({ success: true, data: ambulance, message: 'Ambulance created successfully' });
  } catch (error: any) {
    logger.error('Create ambulance error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create ambulance' });
  }
};

/* ============================================================
   UPDATE AMBULANCE
============================================================ */
export const updateAmbulance = async (req: Request, res: Response) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!ambulance) return res.status(404).json({ success: false, error: 'Ambulance not found' });

    return res.json({ success: true, data: ambulance, message: 'Ambulance updated successfully' });
  } catch (error: any) {
    logger.error('Update ambulance error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update ambulance' });
  }
};

/* ============================================================
   UPDATE AMBULANCE STATUS
============================================================ */
export const updateAmbulanceStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'dispatched', 'maintenance', 'offline'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!ambulance) return res.status(404).json({ success: false, error: 'Ambulance not found' });

    return res.json({ success: true, data: ambulance, message: 'Status updated successfully' });
  } catch (error: any) {
    logger.error('Update ambulance status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};

/* ============================================================
   DELETE AMBULANCE
============================================================ */
export const deleteAmbulance = async (req: Request, res: Response) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!ambulance) return res.status(404).json({ success: false, error: 'Ambulance not found' });

    return res.json({ success: true, message: 'Ambulance removed successfully' });
  } catch (error: any) {
    logger.error('Delete ambulance error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete ambulance' });
  }
};
