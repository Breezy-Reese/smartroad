// src/api/index.ts
// Single import point for everything

export {tokenStorage } from '../api/client';
export type { ApiResponse, PaginatedResponse } from './types';
export * from './types';

// Services
export { authService } from './services/auth.service';
export { incidentService } from './services/incident.service';
export { hospitalService } from '../api/services/hospital.service';

// Hooks
export {
  useAuth,
  useIncidents,
  useMyIncidents,
  useIncident,
  useReportAccident,
  useActiveIncidents,
  useResponderLocation,
  useResponderStatus,
} from '../hooks/index';

// Socket
export {
  socketManager,
  useSocket,
  useResponderTracking,
  useNewIncidentAlerts,
} from '../api/socket';
