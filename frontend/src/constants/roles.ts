export const USER_ROLES = {
  DRIVER: 'driver',
  HOSPITAL: 'hospital',
  ADMIN: 'admin',
  RESPONDER: 'responder',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [USER_ROLES.DRIVER]: [
    'view_dashboard',
    'trigger_emergency',
    'view_trips',
    'manage_contacts',
    'view_profile',
  ],
  [USER_ROLES.HOSPITAL]: [
    'view_dashboard',
    'view_incidents',
    'accept_incidents',
    'dispatch_responders',
    'view_ambulances',
    'view_analytics',
    'manage_team',
  ],
  [USER_ROLES.ADMIN]: [
    'view_all',
    'manage_users',
    'manage_system',
    'view_logs',
    'manage_roles',
    'view_reports',
  ],
  [USER_ROLES.RESPONDER]: [
    'view_assigned',
    'update_status',
    'view_location',
    'view_incident_details',
  ],
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [USER_ROLES.DRIVER]: 'Driver',
  [USER_ROLES.HOSPITAL]: 'Hospital',
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.RESPONDER]: 'Responder',
};