export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Location
  LOCATION_UPDATE: 'location-update',
  DRIVER_STATUS_CHANGE: 'driver-status-change',
  START_TRACKING: 'start-tracking',
  STOP_TRACKING: 'stop-tracking',
  
  // Incident
  NEW_INCIDENT: 'new-incident',
  INCIDENT_UPDATE: 'incident-update',
  INCIDENT_RESOLVED: 'incident-resolved',
  INCIDENT_CANCELLED: 'incident-cancelled',
  
  // Responder
  RESPONDER_ACCEPTED: 'responder-accepted',
  RESPONDER_UPDATE: 'responder-update',
  RESPONDER_LOCATION: 'responder-location',
  
  // Emergency
  EMERGENCY_ALERT: 'emergency-alert',
  PANIC_BUTTON: 'panic-button',
  CANCEL_EMERGENCY: 'cancel-emergency',
  
  // Hospital
  HOSPITAL_STATS_UPDATE: 'hospital-stats-update',
  
  // System
  SYSTEM_NOTIFICATION: 'system-notification',
} as const;