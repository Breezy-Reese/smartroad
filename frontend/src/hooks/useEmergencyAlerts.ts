import { useState, useCallback, useRef } from 'react';
import { useSocketEvents } from './useSocketEvents';
import { EmergencyAlert } from '../types/emergency.types';

export interface PanicAlert {
  id: string;
  driverId: string;
  driverName: string;
  location: { latitude: number; longitude: number };
  timestamp: Date;
  acknowledged: boolean;
}

export interface ActiveAlert {
  id: string;
  type: 'emergency' | 'panic' | 'system';
  title: string;
  message: string;
  severity?: EmergencyAlert['severity'];
  timestamp: Date;
  acknowledged: boolean;
  payload?: EmergencyAlert | PanicAlert;
}

interface UseEmergencyAlertsReturn {
  activeAlerts: ActiveAlert[];
  alertHistory: ActiveAlert[];
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  unacknowledgedCount: number;
}

export const useEmergencyAlerts = (): UseEmergencyAlertsReturn => {
  const [alertHistory, setAlertHistory] = useState<ActiveAlert[]>([]);

  const addAlert = useCallback((alert: ActiveAlert) => {
    setAlertHistory((prev) => {
      if (prev.some((a) => a.id === alert.id)) return prev;
      return [alert, ...prev];
    });
  }, []);

  // Keep addAlert in a ref so socket handlers are stable
  // and never need to be re-created
  const addAlertRef = useRef(addAlert);
  addAlertRef.current = addAlert;

  useSocketEvents({
    onEmergencyAlert: (data: EmergencyAlert) => {
      addAlertRef.current({
        id:           data.id,
        type:         'emergency',
        title:        `Emergency${data.driverName ? ` — ${data.driverName}` : ''}`,
        message:      data.message,
        severity:     data.severity,
        timestamp:    new Date(data.timestamp),
        acknowledged: false,
        payload:      data,
      });
    },

    onPanicAlert: (data) => {
      const id = `panic-${data.driverId}-${Date.now()}`;
      const panic: PanicAlert = {
        id,
        driverId:     data.driverId,
        driverName:   data.driverName,
        location:     data.location,
        timestamp:    new Date(data.timestamp),
        acknowledged: false,
      };
      addAlertRef.current({
        id,
        type:         'panic',
        title:        `Panic Button — ${data.driverName}`,
        message:      'Driver pressed the panic button. Immediate response required.',
        severity:     'critical',
        timestamp:    new Date(data.timestamp),
        acknowledged: false,
        payload:      panic,
      });
    },

    onSystemNotification: (data) => {
      const id = `sys-${Date.now()}`;
      addAlertRef.current({
        id,
        type:         'system',
        title:        data.title,
        message:      data.message,
        severity:     data.type === 'error' ? 'high' : data.type === 'warning' ? 'medium' : 'low',
        timestamp:    new Date(),
        acknowledged: false,
      });
    },
  });

  const acknowledgeAlert = useCallback((id: string) => {
    setAlertHistory((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAlertHistory((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  }, []);

  const activeAlerts = alertHistory.filter((a) => !a.acknowledged);

  return {
    activeAlerts,
    alertHistory,
    acknowledgeAlert,
    acknowledgeAll,
    unacknowledgedCount: activeAlerts.length,
  };
};