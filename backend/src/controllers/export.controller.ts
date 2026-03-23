import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ExportJob } from '../models/ExportJob.model';
import { AuditLog } from '../models/AuditLog.model';
import { Incident } from '../models/Incident.model';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── Directory for generated files ───────────────────────────────────────────
const EXPORTS_DIR = path.join(process.cwd(), 'exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

// ─── CSV utility ──────────────────────────────────────────────────────────────
const toCSV = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape  = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
};

// ─── Data fetchers per export type ───────────────────────────────────────────
// Use the string union directly instead of ExportJob['type'] to avoid
// "refers to a value, not a type" error when the model import is a class.
type ExportType = 'incidents' | 'audit_log' | 'driver_scores' | 'notifications' | 'users' | 'trips';

const fetchRows = async (
  type: ExportType,
  filters: Record<string, any>
): Promise<Record<string, unknown>[]> => {
  const dateFilter = (filters.from || filters.to)
    ? {
        createdAt: {
          ...(filters.from && { $gte: new Date(filters.from) }),
          ...(filters.to   && { $lte: new Date(filters.to)   }),
        },
      }
    : {};

  switch (type) {
    case 'incidents': {
      const incidents = await Incident.find(dateFilter).sort({ createdAt: -1 }).lean();
      return incidents.map((i) => ({
        id:         i._id.toString(),
        incidentId: i.incidentId ?? '',
        driverName: i.driverName ?? '',
        driverId:   i.driverId?.toString() ?? '',
        type:       i.type,
        severity:   i.severity,
        status:     i.status,
        // IGeoLocation is GeoJSON: coordinates = [lng, lat]
        longitude:  i.location?.coordinates?.[0] ?? '',
        latitude:   i.location?.coordinates?.[1] ?? '',
        address:    i.locationAddress ?? '',
        createdAt:  new Date(i.createdAt).toISOString(),
      }));
    }

    case 'audit_log': {
      const entries = await AuditLog.find(dateFilter).sort({ createdAt: -1 }).lean();
      return entries.map((e) => ({
        id:        e._id.toString(),
        actorName: e.actorName,
        actorRole: e.actorRole,
        action:    e.action,
        target:    e.target ?? '',
        ipAddress: e.ipAddress ?? '',
        createdAt: new Date(e.createdAt).toISOString(),
      }));
    }

    case 'users': {
      const users = await User.find(dateFilter).select('-password -refreshToken').sort({ createdAt: -1 }).lean();
      return users.map((u) => ({
        id:        u._id.toString(),
        name:      u.name,
        email:     u.email,
        role:      u.role,
        phone:     u.phone ?? '',
        isActive:  u.isActive,
        createdAt: new Date(u.createdAt!).toISOString(),
      }));
    }

    case 'driver_scores': {
      const drivers = await User.find({ role: 'driver', ...dateFilter })
        .select('name email phone isActive')
        .lean();
      return await Promise.all(
        drivers.map(async (d) => {
          const incidentCount = await Incident.countDocuments({ driverId: d._id });
          return {
            id:             d._id.toString(),
            name:           d.name,
            email:          d.email,
            phone:          d.phone ?? '',
            isActive:       d.isActive,
            totalIncidents: incidentCount,
          };
        })
      );
    }

    case 'notifications': {
      const entries = await AuditLog.find({
        action: { $in: ['NOTIFICATION_SENT', 'EMERGENCY_TRIGGERED', 'ESCALATION_TRIGGERED'] },
        ...dateFilter,
      }).lean();
      return entries.map((e) => ({
        id:        e._id.toString(),
        actorName: e.actorName,
        action:    e.action,
        target:    e.target ?? '',
        createdAt: new Date(e.createdAt).toISOString(),
      }));
    }

    default:
      return [];
  }
};

// ─── POST /admin/exports ──────────────────────────────────────────────────────

export const createExportJob = async (req: AuthRequest, res: Response) => {
  try {
    const { type, format = 'csv', filters = {} } = req.body;

    const VALID_TYPES   = ['incidents', 'audit_log', 'driver_scores', 'notifications', 'users', 'trips'];
    const VALID_FORMATS = ['csv', 'pdf'];

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid export type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!VALID_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, error: 'Format must be csv or pdf' });
    }

    const job = await ExportJob.create({
      requestedBy:      req.user._id,
      requestedByEmail: req.user.email,
      type,
      format,
      filters,
      status: 'queued',
    });

    // Process asynchronously — respond immediately so the frontend can poll
    processExportJob(job._id.toString()).catch((err) =>
      logger.error(`Export job ${job._id} failed:`, err)
    );

    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    logger.error('Create export job error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create export job' });
  }
};

// ─── Async job processor ──────────────────────────────────────────────────────

const processExportJob = async (jobId: string): Promise<void> => {
  const job = await ExportJob.findById(jobId);
  if (!job) return;

  try {
    await ExportJob.findByIdAndUpdate(jobId, { status: 'processing' });

    const rows = await fetchRows(job.type as ExportType, job.filters ?? {});

    if (job.format === 'csv') {
      const csv      = toCSV(rows);
      const filename = `${job.type}_${Date.now()}.csv`;
      const filePath = path.join(EXPORTS_DIR, filename);
      fs.writeFileSync(filePath, csv, 'utf-8');

      await ExportJob.findByIdAndUpdate(jobId, {
        status:      'ready',
        filePath,
        downloadUrl: `/api/admin/exports/${jobId}/download`,
        completedAt: new Date(),
      });
    } else {
      throw new Error('PDF export not yet implemented');
    }
  } catch (err) {
    logger.error(`Export job ${jobId} processing failed:`, err);
    await ExportJob.findByIdAndUpdate(jobId, {
      status:       'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

// ─── GET /admin/exports ───────────────────────────────────────────────────────

export const getExportJobs = async (req: AuthRequest, res: Response) => {
  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filter = req.user.role === 'admin' ? {} : { requestedBy: req.user._id };

    const [total, jobs] = await Promise.all([
      ExportJob.countDocuments(filter),
      ExportJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const data = jobs.map((j) => ({
      id:          j._id.toString(),
      requestedBy: j.requestedByEmail,
      requestedAt: new Date(j.createdAt).getTime(),
      type:        j.type,
      format:      j.format,
      status:      j.status,
      downloadUrl: j.downloadUrl,
      completedAt: j.completedAt ? new Date(j.completedAt).getTime() : undefined,
      filters:     j.filters ?? {},
    }));

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get export jobs error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch export jobs' });
  }
};

// ─── GET /admin/exports/:id ───────────────────────────────────────────────────

export const getExportJobById = async (req: Request, res: Response) => {
  try {
    const job = await ExportJob.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ success: false, error: 'Export job not found' });

    return res.json({
      success: true,
      data: {
        id:          job._id.toString(),
        requestedBy: job.requestedByEmail,
        requestedAt: new Date(job.createdAt).getTime(),
        type:        job.type,
        format:      job.format,
        status:      job.status,
        downloadUrl: job.downloadUrl,
        completedAt: job.completedAt ? new Date(job.completedAt).getTime() : undefined,
        filters:     job.filters ?? {},
      },
    });
  } catch (error) {
    logger.error('Get export job error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch export job' });
  }
};
// ─── GET /admin/exports/:id/download ─────────────────────────────────────────

export const downloadExport = async (req: Request, res: Response) => {
  try {
    const job = await ExportJob.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({ success: false, error: 'Export job not found' });
    }
    if (job.status !== 'ready') {
      return res.status(400).json({ success: false, error: 'Export not ready yet' });
    }
    if (!job.filePath) {
      return res.status(404).json({ success: false, error: 'No file path recorded for this job' });
    }

    // ✅ Ensure absolute path (handles both Unix and Windows)
    const absolutePath = path.isAbsolute(job.filePath)
      ? job.filePath
      : path.resolve(process.cwd(), job.filePath);

    if (!fs.existsSync(absolutePath)) {
      logger.error(`Export file missing on disk: ${absolutePath}`);
      return res.status(404).json({ success: false, error: 'Export file not found on server' });
    }

    const filename = path.basename(absolutePath);
    const mimeType = job.format === 'pdf' ? 'application/pdf' : 'text/csv';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-cache');

    // ✅ Use createReadStream instead of sendFile — works reliably on Windows
    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (err) => {
      logger.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream file' });
      }
    });
    return stream.pipe(res);

  } catch (error) {
    logger.error('Download export error:', error);
    return res.status(500).json({ success: false, error: 'Failed to download export' });
  }
};