// src/context/EmergencyContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useLocation } from './LocationContext';
import { emergencyService } from '../services/api/emergency.service';
import { Incident, EmergencyAlert, Coordinates, Responder } from '../types';
import { toast } from 'react-hot-toast';

interface EmergencyContextType {
  isEmergencyActive: boolean;
  currentIncident: Incident | null;
  incidents: Incident[];
  responders: Responder[];
  triggerEmergency: (type?: string) => Promise<void>;
  cancelEmergency: () => Promise<void>;
  checkAccident: (data: AccidentDetectionData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
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

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

interface EmergencyProviderProps {
  children: ReactNode;
}

export const useEmergency = (): EmergencyContextType => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

export const EmergencyProvider: React.FC<EmergencyProviderProps> = ({ children }) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { location, getCurrentLocation } = useLocation();

  useEffect(() => {
    if (!socket) return;

    // Listen for emergency events
    socket.on('new-incident', (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playEmergencySound();
        
        toast.error('🚨 Accident Detected! Emergency services notified.', {
          duration: 10000,
          icon: '🚨',
          position: 'top-center'
        });
      }
    });

    socket.on('incident-update', (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        
        if (incident.status === 'resolved') {
          setIsEmergencyActive(false);
          stopEmergencySound();
          toast.success('Emergency resolved. Stay safe!');
        } else if (incident.status === 'en-route') {
          toast.success('🚑 Ambulance is on the way!');
        }
      }
    });

    socket.on('responder-accepted', (data) => {
      if (data.incidentId === currentIncident?._id) {
        setResponders(prev => [...prev, data.responder]);
        toast.success(`🚑 ${data.responder.name} is en route. ETA: ${data.responder.eta} minutes`, {
          duration: 8000
        });
      }
    });

    socket.on('responder-update', (data) => {
      if (data.incidentId === currentIncident?._id) {
        setResponders(data.responders);
      }
    });

    return () => {
      socket.off('new-incident');
      socket.off('incident-update');
      socket.off('responder-accepted');
      socket.off('responder-update');
    };
  }, [socket, user, currentIncident]);

  useEffect(() => {
    if (user) {
      fetchUserIncidents();
    }
  }, [user]);

  const fetchUserIncidents = async () => {
    if (!user) return;
    
    try {
      const data = await emergencyService.getUserIncidents(user._id);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  };

  const playEmergencySound = () => {
    const newAudio = new Audio('/sounds/emergency-alarm.mp3');
    newAudio.loop = true;
    newAudio.volume = 0.8;
    newAudio.play().catch(e => console.log('Audio play failed:', e));
    setAudio(newAudio);
  };

  const stopEmergencySound = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }
  };

  const triggerEmergency = async (type: string = 'collision'): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const currentLocation = location || await getCurrentLocation();
      
      if (!currentLocation) {
        throw new Error('Unable to get current location');
      }

      // Create emergency incident
      const incident = await emergencyService.createEmergency({
        driverId: user?._id,
        location: currentLocation,
        timestamp: new Date(),
        type,
        status: 'pending',
        speed: location?.speed,
        airbagDeployed: false
      });

      setCurrentIncident(incident);
      setIsEmergencyActive(true);
      playEmergencySound();

      // Emit panic event via socket
      if (socket && connected) {
        socket.emit('panic-button', {
          driverId: user?._id,
          location: currentLocation
        });
      }

      // Notify emergency contacts
      await emergencyService.notifyEmergencyContacts(incident._id);

      toast.success('Emergency services notified! Help is on the way.', {
        duration: 5000,
        icon: '🚨',
        position: 'top-center'
      });

      // Open alert screen in new tab
      window.open(`/alert/${incident._id}`, '_blank');

    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to trigger emergency. Please call 911 directly!');
      
      // Fallback to direct call
      window.location.href = 'tel:911';
    } finally {
      setLoading(false);
    }
  };

  const cancelEmergency = async (): Promise<void> => {
    if (!currentIncident) return;

    try {
      await emergencyService.cancelEmergency(currentIncident._id);
      setIsEmergencyActive(false);
      setCurrentIncident(null);
      stopEmergencySound();
      toast.success('Emergency cancelled successfully');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to cancel emergency');
    }
  };

  const checkAccident = async (data: AccidentDetectionData): Promise<boolean> => {
    // Simple accident detection logic based on acceleration and speed
    const { acceleration, speed, impactForce, airbagDeployed } = data;

    // Check for sudden deceleration (crash)
    const deceleration = Math.abs(acceleration.x) + Math.abs(acceleration.y) + Math.abs(acceleration.z);
    const isSuddenStop = deceleration > 15; // m/s² threshold

    // Check speed and impact
    const isHighSpeed = speed > 30; // km/h
    const isImpact = impactForce && impactForce > 50; // arbitrary force threshold

    // Return true if any accident indicators are present
    return isSuddenStop || isHighSpeed || isImpact || airbagDeployed || false;
  };

  const value: EmergencyContextType = {
    isEmergencyActive,
    currentIncident,
    incidents,
    responders,
    triggerEmergency,
    cancelEmergency,
    checkAccident,
    loading,
    error,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};
