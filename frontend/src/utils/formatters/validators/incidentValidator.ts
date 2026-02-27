import { Coordinates } from '../../types/location.types';
import { IncidentSeverity, IncidentType } from '../../types/incident.types';

export interface IncidentValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateLocation = (location: Coordinates): boolean => {
  return (
    location &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
  );
};

export const validateSeverity = (severity: string): severity is IncidentSeverity => {
  const validSeverities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical', 'fatal'];
  return validSeverities.includes(severity as IncidentSeverity);
};

export const validateIncidentType = (type: string): type is IncidentType => {
  const validTypes: IncidentType[] = ['collision', 'rollover', 'fire', 'medical', 'other'];
  return validTypes.includes(type as IncidentType);
};

export const validateIncidentData = (data: any): IncidentValidationResult => {
  const errors: string[] = [];
  
  if (!data.driverId) {
    errors.push('Driver ID is required');
  }
  
  if (!data.location) {
    errors.push('Location is required');
  } else if (!validateLocation(data.location)) {
    errors.push('Invalid location coordinates');
  }
  
  if (data.type && !validateIncidentType(data.type)) {
    errors.push('Invalid incident type');
  }
  
  if (data.severity && !validateSeverity(data.severity)) {
    errors.push('Invalid severity level');
  }
  
  if (data.speed !== undefined && (typeof data.speed !== 'number' || data.speed < 0)) {
    errors.push('Speed must be a positive number');
  }
  
  if (data.impactForce !== undefined && (typeof data.impactForce !== 'number' || data.impactForce < 0)) {
    errors.push('Impact force must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateResponderData = (data: any): IncidentValidationResult => {
  const errors: string[] = [];
  
  if (!data.responderId) {
    errors.push('Responder ID is required');
  }
  
  if (!data.incidentId) {
    errors.push('Incident ID is required');
  }
  
  if (data.eta !== undefined && (typeof data.eta !== 'number' || data.eta < 0)) {
    errors.push('ETA must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};