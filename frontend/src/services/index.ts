// src/services/index.ts
// Export all services from the api subdirectory

// Auth services
export * from './api/auth.service';

// Emergency services
export * from './api/emergency.service';

// Hospital services
export * from './api/hospital.service';

// Location services
export * from './api/location.service';

// Trip services
export * from './api/trip.service';

// User services
export * from './api/user.service';

// Export axios instance for custom requests
export { default as axiosInstance } from './api/axiosInstance';

// Re-export as namespaced objects for convenience
import * as authService from './api/auth.service';
import * as emergencyService from './api/emergency.service';
import * as hospitalService from './api/hospital.service';
import * as locationService from './api/location.service';
import * as tripService from './api/trip.service';
import * as userService from './api/user.service';

export const services = {
  auth: authService,
  emergency: emergencyService,
  hospital: hospitalService,
  location: locationService,
  trip: tripService,
  user: userService,
};

// Create responder service that might be needed by hooks
export const responderService = {
  updateStatus: async (status: string) => {
    try {
      // Try to use emergency service if it has responder methods
      const response = await emergencyService.updateResponderStatus?.(status);
      return response;
    } catch (error) {
      console.error('Error updating responder status:', error);
      throw error;
    }
  },
  
  getResponderById: async (id: string) => {
    try {
      // Try to use user service or emergency service
      const response = await userService.getUserById?.(id);
      return response;
    } catch (error) {
      console.error('Error getting responder:', error);
      throw error;
    }
  }
};

// Default export for convenience
export default services;
