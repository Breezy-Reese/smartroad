export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Driver routes
  DRIVER: '/driver',
  DRIVER_DASHBOARD: '/driver',
  DRIVER_TRIPS: '/driver/trips',
  DRIVER_CONTACTS: '/driver/contacts',
  DRIVER_PROFILE: '/driver/profile',
  
  // Hospital routes
  HOSPITAL: '/hospital',
  HOSPITAL_DASHBOARD: '/hospital',
  HOSPITAL_INCIDENTS: '/hospital/incidents',
  HOSPITAL_AMBULANCES: '/hospital/ambulances',
  HOSPITAL_RESPONDERS: '/hospital/responders',
  HOSPITAL_ANALYTICS: '/hospital/analytics',
  HOSPITAL_SETTINGS: '/hospital/settings',
  
  // Emergency routes
  EMERGENCY_ALERT: '/alert/:incidentId',
  EMERGENCY_SOS: '/sos',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SYSTEM: '/admin/system',
  ADMIN_REPORTS: '/admin/reports',
} as const;

export type RouteKeys = keyof typeof ROUTES;
export type RouteValues = typeof ROUTES[RouteKeys];