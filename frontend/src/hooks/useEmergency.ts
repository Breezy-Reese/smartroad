import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useLocation } from './useLocation';
import { useAuth } from './useAuth';
import { emergencyService } from '../services/api/emergency.service';
import { Incident, CreateIncidentDto, EmergencyAlert } from '../types/incident.types';
import { Coordinates } from '../types/location.types';
import { toast } from 'react-hot-toast';

interface UseEmergencyReturn {
  isEmergencyActive: boolean;
  currentIncident: Incident | null;
  incidents: Incident[];
  triggerEmergency: (type?: string) => Promise<void>;
  cancelEmergency: () => Promise<void>;
  checkAccident: (data: AccidentDetectionData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  nearbyHospitals: any[];
  estimatedResponseTime: number | null;
}

interface AccidentDetectionData {
  speed: number;
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  impactForce?: number;
  airbagDeployed?: boolean;
  location: Coordinates;
}

export const useEmergency = (): UseEmergencyReturn => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [estimatedResponseTime, setEstimatedResponseTime] = useState<number | null>(null);
  
  const { socket, connected, emit, on, off } = useSocket();
  const { location, getCurrentLocation, calculateDistance } = useLocation();
  const { user } = useAuth();

  // Listen for emergency events
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewIncident = (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        
        // Play emergency sound
        playEmergencySound();
        
        toast.error('🚨 Accident Detected! Emergency services notified.', {
          duration: 10000,
          icon: '🚨',
        });
      }
    };

    const handleIncidentUpdate = (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        
        if (incident.status === 'resolved' || incident.status === 'cancelled') {
          setIsEmergencyActive(false);
          stopEmergencySound();
          
          if (incident.status === 'resolved') {
            toast.success('Emergency resolved. Stay safe!');
          }
        }
      }
    };

    const handleResponderAccepted = (data: { incidentId: string; responder: any }) => {
      if (data.incidentId === currentIncident?._id) {
        toast.success(`🚑 ${data.responder.name} is en route. ETA: ${data.responder.eta} minutes`);
        setEstimatedResponseTime(data.responder.eta);
      }
    };

    const handleEmergencyAlert = (alert: EmergencyAlert) => {
      if (user?.role === 'hospital') {
        toast.error(`🚨 New emergency: ${alert.driverName} at ${new Date(alert.timestamp).toLocaleTimeString()}`);
      }
    };

    on('new-incident', handleNewIncident);
    on('incident-update', handleIncidentUpdate);
    on('responder-accepted', handleResponderAccepted);
    on('emergency-alert', handleEmergencyAlert);

    return () => {
      off('new-incident', handleNewIncident);
      off('incident-update', handleIncidentUpdate);
      off('responder-accepted', handleResponderAccepted);
      off('emergency-alert', handleEmergencyAlert);
    };
  }, [socket, connected, user, currentIncident]);

  // Fetch user's incidents
  useEffect(() => {
    const fetchIncidents = async () => {
      if (!user) return;
      
      try {
        const data = await emergencyService.getUserIncidents(user._id);
        setIncidents(data);
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      }
    };

    fetchIncidents();
  }, [user]);

  const playEmergencySound = () => {
    const audio = new Audio('/sounds/emergency-alarm.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Audio play failed:', e));
    (window as any).emergencyAudio = audio;
  };

  const stopEmergencySound = () => {
    const audio = (window as any).emergencyAudio;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  // Accident detection algorithm
  const checkAccident = useCallback(async (data: AccidentDetectionData): Promise<boolean> => {
    const { speed, acceleration, impactForce, airbagDeployed, location: incidentLocation } = data;
    
    // Define thresholds
    const thresholds = {
      speedDrop: 40, // km/h sudden drop
      impactGForce: 4, // G-force
      decelerationRate: 12, // m/s²
    };

    // Check for accident patterns
    let isAccident = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = 0;

    // Sudden speed drop detection
    if (speed < 5 && data.speed > thresholds.speedDrop) {
      isAccident = true;
      severity = 'medium';
      confidence += 0.3;
    }

    // High impact force
    if (impactForce && impactForce > thresholds.impactGForce) {
      isAccident = true;
      severity = impactForce > 15 ? 'critical' : 'high';
      confidence += 0.4;
    }

    // Airbag deployment
    if (airbagDeployed) {
      isAccident = true;
      severity = 'critical';
      confidence += 0.5;
    }

    // Rapid deceleration
    const totalAcceleration = Math.sqrt(
      acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
    );
    if (totalAcceleration > thresholds.decelerationRate) {
      isAccident = true;
      severity = totalAcceleration > 25 ? 'critical' : 'high';
      confidence += 0.3;
    }

    // If accident detected with high confidence, trigger emergency
    if (isAccident && confidence > 0.5 && user) {
      // Create incident DTO
      const incidentData: CreateIncidentDto = {
        driverId: user._id,
        location: incidentLocation,
        type: 'collision',
        severity,
        speed,
        impactForce,
        airbagDeployed,
        occupants: 1,
      };

      try {
        const incident = await emergencyService.createEmergency(incidentData);
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        
        // Emit via socket
        if (connected) {
          emit('panic-button', {
            driverId: user._id,
            location: incidentLocation,
            timestamp: new Date(),
          });
        }

        // Fetch nearby hospitals
        const hospitals = await emergencyService.getNearbyHospitals(incidentLocation);
        setNearbyHospitals(hospitals);

        toast.error('🚨 Accident Detected! Emergency services notified.', {
          duration: 10000,
          icon: '🚨',
        });
      } catch (err) {
        console.error('Failed to report accident:', err);
      }
    }

    return isAccident;
  }, [user, connected, emit]);

  const triggerEmergency = useCallback(async (type: string = 'panic'): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const currentLocation = location || await getCurrentLocation();
      
      if (!currentLocation) {
        throw new Error('Unable to get current location');
      }

      // Create emergency incident
      const incidentData: CreateIncidentDto = {
        driverId: user!._id,
        location: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        },
        type: type === 'panic' ? 'other' : 'collision',
        severity: 'critical',
        timestamp: new Date(),
      };

      const incident = await emergencyService.createEmergency(incidentData);

      setCurrentIncident(incident);
      setIsEmergencyActive(true);

      // Emit panic event via socket
      if (connected) {
        emit('panic-button', {
          driverId: user!._id,
          location: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
          timestamp: new Date(),
        });
      }

      // Play emergency sound
      playEmergencySound();

      // Fetch nearby hospitals
      const hospitals = await emergencyService.getNearbyHospitals({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      });
      setNearbyHospitals(hospitals);

      toast.success('Emergency services notified! Help is on the way.', {
        duration: 5000,
        icon: '🚨',
      });

    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to trigger emergency. Please call 911 directly!');
    } finally {
      setLoading(false);
    }
  }, [user, location, getCurrentLocation, connected, emit]);

  const cancelEmergency = useCallback(async (): Promise<void> => {
    if (!currentIncident) return;

    setLoading(true);
    try {
      await emergencyService.cancelEmergency(currentIncident._id);
      
      setIsEmergencyActive(false);
      setCurrentIncident(null);
      
      stopEmergencySound();

      toast.success('Emergency cancelled');

    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to cancel emergency');
    } finally {
      setLoading(false);
    }
  }, [currentIncident]);

  return {
    isEmergencyActive,
    currentIncident,
    incidents,
    triggerEmergency,
    cancelEmergency,
    checkAccident,
    loading,
    error,
    nearbyHospitals,
    estimatedResponseTime,
  };
};