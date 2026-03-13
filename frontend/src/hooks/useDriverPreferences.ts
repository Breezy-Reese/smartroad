import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export interface DriverPreferences {
  language: string;
  distanceUnit: 'km' | 'miles';
  speedUnit: 'km/h' | 'mph';
  notificationsEnabled: boolean;
  soundAlerts: boolean;
  vibrationAlerts: boolean;
  autoStartTrip: boolean;
  shareLocationWithFleet: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  emergencyCountdownSeconds: number;
}

const DEFAULTS: DriverPreferences = {
  language: 'en',
  distanceUnit: 'km',
  speedUnit: 'km/h',
  notificationsEnabled: true,
  soundAlerts: true,
  vibrationAlerts: true,
  autoStartTrip: false,
  shareLocationWithFleet: true,
  darkMode: 'auto',
  emergencyCountdownSeconds: 10,
};

const STORAGE_KEY = 'driver_preferences';

export const useDriverPreferences = () => {
  const [preferences, setPreferences] = useState<DriverPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [loading, setLoading] = useState(false);

  const savePreferences = useCallback(async (data: DriverPreferences) => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setPreferences(data);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreference = useCallback(<K extends keyof DriverPreferences>(
    key: K,
    value: DriverPreferences[K],
  ) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(async () => {
    await savePreferences(DEFAULTS);
  }, [savePreferences]);

  return { preferences, loading, savePreferences, updatePreference, resetToDefaults };
};
