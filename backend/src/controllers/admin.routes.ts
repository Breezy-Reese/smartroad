import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getAllIncidents,
  getSystemHealth,
  getSystemReports,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// ─── Incidents ────────────────────────────────────────────────────────────────
router.get('/incidents', getAllIncidents);

// ─── System ───────────────────────────────────────────────────────────────────
router.get('/health', getSystemHealth);
router.get('/reports', getSystemReports);

export default router;
