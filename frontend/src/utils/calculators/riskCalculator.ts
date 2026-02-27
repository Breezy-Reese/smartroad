import { Coordinates } from '../../types/location.types';
import { IncidentSeverity } from '../../types/incident.types';

interface RiskFactors {
  timeOfDay: number;
  weather: number;
  roadType: number;
  trafficDensity: number;
  driverExperience: number;
}

export const calculateRiskScore = (factors: RiskFactors): number => {
  const weights = {
    timeOfDay: 0.15,
    weather: 0.2,
    roadType: 0.25,
    trafficDensity: 0.2,
    driverExperience: 0.2,
  };

  const weightedSum = 
    factors.timeOfDay * weights.timeOfDay +
    factors.weather * weights.weather +
    factors.roadType * weights.roadType +
    factors.trafficDensity * weights.trafficDensity +
    (100 - factors.driverExperience) * weights.driverExperience; // Lower experience = higher risk

  return Math.min(100, weightedSum);
};

export const getRiskLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 85) return 'high';
  return 'critical';
};

export const calculateTimeOfDayRisk = (hour: number): number => {
  // Higher risk during night and early morning
  if (hour >= 23 || hour <= 4) return 80;
  if (hour >= 20 || hour <= 6) return 60;
  if (hour >= 17 || hour <= 8) return 40;
  return 20;
};

export const calculateWeatherRisk = (
  condition: 'clear' | 'rain' | 'snow' | 'fog' | 'storm'
): number => {
  const risks = {
    clear: 10,
    rain: 40,
    snow: 70,
    fog: 60,
    storm: 90,
  };
  return risks[condition] || 30;
};

export const calculateRoadTypeRisk = (roadType: 'highway' | 'urban' | 'rural' | 'mountain'): number => {
  const risks = {
    highway: 30,
    urban: 60,
    rural: 50,
    mountain: 80,
  };
  return risks[roadType] || 40;
};

export const calculateCollisionProbability = (
  speed: number,
  trafficDensity: number,
  reactionTime: number = 1.5 // seconds
): number => {
  // Basic physics: stopping distance = reaction distance + braking distance
  const reactionDistance = (speed / 3.6) * reactionTime; // meters
  const brakingDistance = (speed * speed) / (2 * 0.7 * 9.81); // rough estimate
  const stoppingDistance = reactionDistance + brakingDistance;
  
  // Probability based on distance to next vehicle (assuming 2-second rule)
  const safeDistance = (speed / 3.6) * 2; // 2-second rule in meters
  const distanceFactor = Math.min(1, safeDistance / stoppingDistance);
  
  return Math.min(100, distanceFactor * trafficDensity);
};