import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
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
import { getAuditLog }                                          from '../controllers/audit.controller';
import { createExportJob, getExportJobs, getExportJobById, downloadExport } from '../controllers/export.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/:id',
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  getUserById,
);
router.put('/users/:id',
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  updateUser,
);
router.patch('/users/:id/toggle-status',
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  toggleUserStatus,
);
router.delete('/users/:id',
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  deleteUser,
);

// ─── Incidents ────────────────────────────────────────────────────────────────
router.get('/incidents',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString(),
    query('severity').optional().isString(),
  ]),
  getAllIncidents,
);

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get('/audit-log',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('actorRole').optional().isString(),
    query('action').optional().isString(),
    query('actorId').optional().isMongoId(),
    query('from').optional().isISO8601().withMessage('from must be a valid ISO date'),
    query('to').optional().isISO8601().withMessage('to must be a valid ISO date'),
  ]),
  getAuditLog,
);

// ─── Exports ──────────────────────────────────────────────────────────────────
router.get('/exports',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  getExportJobs,
);

router.post('/exports',
  validate([
    body('type')
      .notEmpty().withMessage('Export type is required')
      .isIn(['incidents', 'audit_log', 'driver_scores', 'notifications', 'users', 'trips'])
      .withMessage('Invalid export type'),
    body('format')
      .optional()
      .isIn(['csv', 'pdf']).withMessage('Format must be csv or pdf'),
    body('filters')
      .optional()
      .isObject().withMessage('Filters must be an object'),
  ]),
  createExportJob,
);

router.get('/exports/:id',
  validate([param('id').isMongoId().withMessage('Invalid export job ID')]),
  getExportJobById,
);

router.get('/exports/:id/download',
  validate([param('id').isMongoId().withMessage('Invalid export job ID')]),
  downloadExport,
);

// ─── System ───────────────────────────────────────────────────────────────────
router.get('/system/health', getSystemHealth);
router.get('/reports', getSystemReports);

export default router;
