import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export interface MedicalProfile {
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  doctorName: string;
  doctorPhone: string;
  notes: string;
}

const DEFAULT_PROFILE: MedicalProfile = {
  bloodType: '',
  allergies: [],
  conditions: [],
  medications: [],
  emergencyContact: { name: '', phone: '', relationship: '' },
  doctorName: '',
  doctorPhone: '',
  notes: '',
};

export const useMedicalProfile = () => {
  const [profile, setProfile] = useState<MedicalProfile>(() => {
    try {
      const stored = localStorage.getItem('medical_profile');
      return stored ? JSON.parse(stored) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });
  const [loading, setLoading] = useState(false);

  const saveProfile = useCallback(async (data: MedicalProfile) => {
    setLoading(true);
    try {
      // TODO: replace with API call e.g. await api.put('/driver/medical-profile', data)
      await new Promise((r) => setTimeout(r, 600));
      localStorage.setItem('medical_profile', JSON.stringify(data));
      setProfile(data);
      toast.success('Medical profile saved');
    } catch {
      toast.error('Failed to save medical profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateField = useCallback(<K extends keyof MedicalProfile>(
    field: K,
    value: MedicalProfile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  return { profile, loading, saveProfile, updateField };
};
