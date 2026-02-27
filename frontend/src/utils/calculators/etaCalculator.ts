import { Coordinates } from '../../types/location.types';
import { haversineDistance } from './distanceCalculator';

interface TrafficConditions {
  factor: number; // 1.0 = normal, >1 = slower, <1 = faster
  description: string;
}

const getTrafficFactor = (hour: number, isWeekend: boolean): TrafficConditions => {
  if (isWeekend) {
    if (hour >= 10 && hour <= 20) {
      return { factor: 1.3, description: 'Weekend moderate traffic' };
    }
    return { factor: 1.1, description: 'Weekend light traffic' };
  }

  // Weekday traffic patterns
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return { factor: 2.0, description: 'Peak hour heavy traffic' };
  }
  if ((hour >= 6 && hour <= 10) || (hour >= 16 && hour <= 20)) {
    return { factor: 1.5, description: 'Rush hour traffic' };
  }
  if (hour >= 11 && hour <= 15) {
    return { factor: 1.2, description: 'Midday moderate traffic' };
  }
  if (hour >= 21 || hour <= 5) {
    return { factor: 0.9, description: 'Night light traffic' };
  }
  return { factor: 1.1, description: 'Normal traffic' };
};

export const calculateETA = (
  origin: Coordinates,
  destination: Coordinates,
  averageSpeed: number = 40, // km/h
  includeTraffic: boolean = true
): { minutes: number; description: string } => {
  const distance = haversineDistance(origin, destination);
  
  if (!includeTraffic) {
    const timeHours = distance / averageSpeed;
    return {
      minutes: Math.ceil(timeHours * 60),
      description: 'Based on distance only',
    };
  }

  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  
  const traffic = getTrafficFactor(hour, isWeekend);
  const adjustedSpeed = averageSpeed / traffic.factor;
  const timeHours = distance / adjustedSpeed;
  
  return {
    minutes: Math.ceil(timeHours * 60),
    description: traffic.description,
  };
};

export const calculateArrivalTime = (
  etaMinutes: number
): { time: string; date: Date } => {
  const arrivalDate = new Date(Date.now() + etaMinutes * 60000);
  const hours = arrivalDate.getHours();
  const minutes = arrivalDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return {
    time: `${formattedHours}:${formattedMinutes} ${ampm}`,
    date: arrivalDate,
  };
};

export const calculateResponseTimeScore = (etaMinutes: number): number => {
  if (etaMinutes <= 5) return 100;
  if (etaMinutes <= 10) return 80;
  if (etaMinutes <= 15) return 60;
  if (etaMinutes <= 20) return 40;
  if (etaMinutes <= 30) return 20;
  return 0;
};