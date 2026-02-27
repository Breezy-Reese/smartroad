export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    EMERGENCY_CONTACTS: '/users/emergency-contacts',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },
  
  DRIVERS: {
    BASE: '/drivers',
    LOCATION: '/drivers/location',
    TRIPS: '/drivers/trips',
    STATS: '/drivers/stats',
  },
  
  EMERGENCY: {
    ALERT: '/emergency/alert',
    INCIDENT: '/emergency/incident',
    INCIDENTS: '/emergency/incidents',
    ACCEPT: '/emergency/accept',
    CANCEL: '/emergency/cancel',
    REPORT: '/emergency/report',
  },
  
  HOSPITAL: {
    BASE: '/hospital',
    STATS: '/hospital/stats',
    INCIDENTS: '/hospital/incidents',
    AMBULANCES: '/hospital/ambulances',
    RESPONDERS: '/hospital/responders',
    DISPATCH: '/hospital/dispatch',
  },
  
  LOCATIONS: {
    UPDATE: '/locations/update',
    HISTORY: '/locations/history',
    NEARBY: '/locations/nearby',
  },
  
  ADMIN: {
    USERS: '/admin/users',
    SYSTEM: '/admin/system',
    LOGS: '/admin/logs',
    METRICS: '/admin/metrics',
  },
} as const;