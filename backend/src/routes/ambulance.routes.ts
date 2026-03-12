import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllAmbulances,
  getAmbulanceById,
  createAmbulance,
  updateAmbulance,
  updateAmbulanceStatus,
  deleteAmbulance,
} from '../controllers/ambulance.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET all ambulances (admin, hospital, responder)
router.get('/', authorize('admin', 'hospital', 'responder'), getAllAmbulances);

// GET single ambulance
router.get('/:id', authorize('admin', 'hospital', 'responder'), getAmbulanceById);

// POST create ambulance (admin only)
router.post('/', authorize('admin'), createAmbulance);

// PUT update ambulance (admin only)
router.put('/:id', authorize('admin'), updateAmbulance);

// PATCH update status (admin, hospital)
router.patch('/:id/status', authorize('admin', 'hospital'), updateAmbulanceStatus);

// DELETE ambulance (admin only)
router.delete('/:id', authorize('admin'), deleteAmbulance);

export default router;
