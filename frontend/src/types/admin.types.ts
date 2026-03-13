export type AdminRole = 'super_admin' | 'fleet_manager' | 'dispatcher' | 'viewer';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;           // 0–1 intensity
  incidentId?: string;
  type: 'incident' | 'speeding' | 'harsh_brake' | 'geofence';
  timestamp: number;
}

export interface FleetIncident {
  id: string;
  driverId: string;
  driverName: string;
  type: string;
  severity: IncidentSeverity;
  lat: number;
  lng: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  notificationsSent: number;
  escalationLevel: 1 | 2 | 3;
  tripScore?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;           // e.g. 'EMERGENCY_TRIGGERED', 'POLICY_UPDATED'
  target?: string;          // e.g. driver name or resource id
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface ExportJob {
  id: string;
  requestedBy: string;
  requestedAt: number;
  type: 'incidents' | 'audit_log' | 'driver_scores' | 'notifications';
  format: 'csv' | 'pdf';
  status: 'queued' | 'processing' | 'ready' | 'failed';
  downloadUrl?: string;
  completedAt?: number;
  filters: {
    from?: number;
    to?: number;
    driverId?: string;
    severity?: IncidentSeverity;
  };
}

export interface AdminStats {
  totalDrivers: number;
  activeDrivers: number;
  incidentsToday: number;
  incidentsWeek: number;
  avgTripScore: number;
  openIncidents: number;
  notificationsSentToday: number;
  deliveryRate: number;       // 0–1
}
