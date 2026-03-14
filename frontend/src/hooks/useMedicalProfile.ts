import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { driverService } from '../services/api/driver.service';

/* Extends the existing MedicalInfo type with doctor fields */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalProfile {
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  emergencyNotes: string;
  emergencyContact: EmergencyContact;
  organDonor: boolean;
  doctorName: string;
  doctorPhone: string;
}

const DEFAULT: MedicalProfile = {
  bloodGroup: '',
  allergies: [],
  medicalConditions: [],
  medications: [],
  emergencyNotes: '',
  emergencyContact: { name: '', relationship: '', phone: '' },
  organDonor: false,
  doctorName: '',
  doctorPhone: '',
};

export const useMedicalProfile = () => {
  const [profile, setProfile] = useState<MedicalProfile>(DEFAULT);
  const [loading, setLoading]  = useState(false);
  const [fetched, setFetched]  = useState(false);

  const fetchProfile = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const data = await driverService.getMedicalProfile();
      setProfile({ ...DEFAULT, ...data });
      setFetched(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to load medical profile');
    } finally {
      setLoading(false);
    }
  }, [fetched]);

  const saveProfile = useCallback(async (updated: MedicalProfile) => {
    setLoading(true);
    try {
      const data = await driverService.saveMedicalProfile(updated);
      setProfile({ ...DEFAULT, ...data });
      toast.success('Medical profile saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to save medical profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateField = useCallback(<K extends keyof MedicalProfile>(
    key: K, value: MedicalProfile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { profile, loading, fetchProfile, saveProfile, updateField };
};
