import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';

import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useLocation } from './LocationContext';

import { emergencyService } from '../services/api/emergency.service';

/* ✅ Import from correct type files */
import { Incident } from '../types/emergency.types';
import { Coordinates } from '../types/location.types';

import {
  Responder,
} from '../types/user.types';

import {
  CreateIncidentDto,
} from '../types/emergency.types';

import { toast } from 'react-hot-toast';

/* ================= CONTEXT TYPES ================= */

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

/* ================= CONTEXT ================= */

const EmergencyContext = createContext<EmergencyContextType | undefined>(
  undefined
);

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used inside EmergencyProvider');
  }
  return context;
};

/* ================= PROVIDER ================= */

export const EmergencyProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { location, getCurrentLocation } = useLocation();

  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(
    null
  );
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  /* ================= SOCKET LISTENERS ================= */

  useEffect(() => {
    if (!socket) return;

    socket.on('new-incident', (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);
        setIsEmergencyActive(true);
        playSound();

        toast.error('🚨 Emergency detected!');
      }
    });

    socket.on('incident-update', (incident: Incident) => {
      if (incident.driverId === user?._id) {
        setCurrentIncident(incident);

        if (incident.status === 'resolved') {
          setIsEmergencyActive(false);
          stopSound();
          toast.success('Emergency resolved');
        }
      }
    });

    socket.on('responder-accepted', (data: any) => {
      if (data.incidentId === currentIncident?._id) {
        setResponders((prev) => [...prev, data.responder as Responder]);
      }
    });

    socket.on('responder-update', (data: any) => {
      if (data.incidentId === currentIncident?._id) {
        setResponders(data.responders as Responder[]);
      }
    });

    return () => {
      socket.off('new-incident');
      socket.off('incident-update');
      socket.off('responder-accepted');
      socket.off('responder-update');
    };
  }, [socket, user, currentIncident]);

  /* ================= FETCH INCIDENTS ================= */

  useEffect(() => {
    if (!user?._id) return;

    const fetch = async () => {
      try {
        const data = await emergencyService.getUserIncidents(user._id);
        setIncidents(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetch();
  }, [user]);

  /* ================= SOUND ================= */

  const playSound = () => {
    const newAudio = new Audio('/sounds/emergency-alarm.mp3');
    newAudio.loop = true;
    newAudio.volume = 0.8;
    newAudio.play().catch((err) => console.log('Audio failed', err));
    setAudio(newAudio);
  };

  const stopSound = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }
  };

  /* ================= TRIGGER EMERGENCY ================= */
const triggerEmergency = async (type: string = 'collision') => {
  if (!user?._id) return;

  setLoading(true);
  setError(null);

  try {
    const currentLocation =
      location || (await getCurrentLocation());

    if (!currentLocation) {
      throw new Error('Location unavailable');
    }

    const payload: CreateIncidentDto = {
      driverId: user._id,
      type: type as any,
      severity: 'high',
      location: currentLocation,
      description: 'Auto detected emergency',
    };

    const incident = await emergencyService.createEmergency(payload);

    setCurrentIncident(incident);
    setIsEmergencyActive(true);
    playSound();

    if (socket && connected) {
      socket.emit('panic-button', {
        driverId: user._id,
        location: currentLocation,
        timestamp: new Date(),
      });
    }

    toast.success('Emergency services notified');

    window.open(`/alert/${incident._id}`, '_blank');
  } catch (err: any) {
    setError(err.message);
    toast.error('Failed to trigger emergency');
  } finally {
    setLoading(false);
  }
};
  /* ================= CANCEL ================= */

  const cancelEmergency = async () => {
    if (!currentIncident) return;

    try {
      await emergencyService.cancelEmergency(currentIncident._id);
      setIsEmergencyActive(false);
      setCurrentIncident(null);
      stopSound();
      toast.success('Emergency cancelled');
    } catch (err: any) {
      setError(err.message);
    }
  };

  /* ================= ACCIDENT DETECTION ================= */

  const checkAccident = async (
    data: AccidentDetectionData
  ): Promise<boolean> => {
    const { acceleration, speed, impactForce, airbagDeployed } = data;

    const deceleration =
      Math.abs(acceleration.x) +
      Math.abs(acceleration.y) +
      Math.abs(acceleration.z);

    const isSuddenStop = deceleration > 15;
    const isHighSpeed = speed > 30;
    const isImpact = impactForce && impactForce > 50;

    return Boolean(isSuddenStop || isHighSpeed || isImpact || airbagDeployed);
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