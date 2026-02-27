export const INCIDENT_STATUS = {
  PENDING: 'pending',
  DETECTED: 'detected',
  CONFIRMED: 'confirmed',
  DISPATCHED: 'dispatched',
  EN_ROUTE: 'en-route',
  ARRIVED: 'arrived',
  TREATING: 'treating',
  TRANSPORTING: 'transporting',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
  FALSE_ALARM: 'false-alarm',
} as const;

export type IncidentStatus = typeof INCIDENT_STATUS[keyof typeof INCIDENT_STATUS];

export const INCIDENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
  FATAL: 'fatal',
} as const;

export type IncidentSeverity = typeof INCIDENT_SEVERITY[keyof typeof INCIDENT_SEVERITY];

export const INCIDENT_TYPE = {
  COLLISION: 'collision',
  ROLLOVER: 'rollover',
  FIRE: 'fire',
  MEDICAL: 'medical',
  OTHER: 'other',
} as const;

export type IncidentType = typeof INCIDENT_TYPE[keyof typeof INCIDENT_TYPE];

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  [INCIDENT_STATUS.PENDING]: 'yellow',
  [INCIDENT_STATUS.DETECTED]: 'orange',
  [INCIDENT_STATUS.CONFIRMED]: 'red',
  [INCIDENT_STATUS.DISPATCHED]: 'blue',
  [INCIDENT_STATUS.EN_ROUTE]: 'purple',
  [INCIDENT_STATUS.ARRIVED]: 'green',
  [INCIDENT_STATUS.TREATING]: 'teal',
  [INCIDENT_STATUS.TRANSPORTING]: 'indigo',
  [INCIDENT_STATUS.RESOLVED]: 'gray',
  [INCIDENT_STATUS.CANCELLED]: 'gray',
  [INCIDENT_STATUS.FALSE_ALARM]: 'gray',
};

export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  [INCIDENT_SEVERITY.LOW]: 'blue',
  [INCIDENT_SEVERITY.MEDIUM]: 'yellow',
  [INCIDENT_SEVERITY.HIGH]: 'orange',
  [INCIDENT_SEVERITY.CRITICAL]: 'red',
  [INCIDENT_SEVERITY.FATAL]: 'black',
};