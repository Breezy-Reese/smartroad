import { IncidentSeverity } from '../../types/incident.types';

export const getEmergencyPriority = (severity: IncidentSeverity): number => {
  const priorities = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
    fatal: 5,
  };
  return priorities[severity];
};

export const getEstimatedResponseTime = (
  distance: number,
  trafficFactor: number = 1.5
): number => {
  const averageSpeed = 40; // km/h in urban areas
  const timeHours = distance / (averageSpeed / trafficFactor);
  return Math.ceil(timeHours * 60); // Convert to minutes
};

export const getRequiredResponders = (severity: IncidentSeverity): number => {
  const requirements = {
    low: 1,
    medium: 1,
    high: 2,
    critical: 3,
    fatal: 3,
  };
  return requirements[severity];
};

export const getEmergencyMessage = (
  driverName: string,
  location: string,
  severity: IncidentSeverity
): string => {
  const severityMessages = {
    low: 'a minor incident',
    medium: 'an accident',
    high: 'a serious accident',
    critical: 'a critical accident',
    fatal: 'a fatal accident',
  };
  
  return `EMERGENCY: ${driverName} has been involved in ${severityMessages[severity]} at ${location}. Immediate assistance required.`;
};

export const calculateSeverity = (
  speed: number,
  impactForce?: number,
  airbagDeployed?: boolean
): IncidentSeverity => {
  if (airbagDeployed || (impactForce && impactForce > 20)) {
    return 'critical';
  }
  if (impactForce && impactForce > 10) {
    return 'high';
  }
  if (speed > 60) {
    return 'medium';
  }
  return 'low';
};