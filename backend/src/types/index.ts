// src/types/index.ts
export * from './user.types';  // This exports IEmergencyContact
// Remove IEmergencyContact from incident.types exports
export type { 
  IncidentStatus,
  IncidentSeverity,
  IncidentType,
  IIncident,
  IResponderInfo,
  // IEmergencyContact,  // ← Remove this line!
  IIncidentTimeline,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IAcceptIncidentDTO 
} from './incident.types';

export * from './location.types';
export * from './socket.types';