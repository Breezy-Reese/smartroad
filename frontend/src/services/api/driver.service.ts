import { axiosInstance } from '../../config/axios.config';
import { MedicalProfile } from '../../hooks/useMedicalProfile';
import { DriverPreferences } from '../../hooks/useDriverPreferences';

export interface TripScorePayload {
  tripId: string;
  score: number;
  grade: string;
  distance: number;
  duration: number;
  startTime: number;
  endTime: number;
  events: {
    type: string;
    severity: string;
    timestamp: number;
    penalty: number;
  }[];
}

class DriverService {
  private baseUrl = '/users';

  /* ── Medical profile ── */
  async getMedicalProfile(): Promise<MedicalProfile> {
    const response = await axiosInstance.get(`${this.baseUrl}/profile`);
    return response.data?.data?.medicalInfo ?? {};
  }

  async saveMedicalProfile(data: MedicalProfile): Promise<MedicalProfile> {
    const response = await axiosInstance.put(`${this.baseUrl}/medical-info`, data);
    return response.data?.data ?? data;
  }

  /* ── Trip scoring ── */
  async submitTripScore(data: TripScorePayload): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/trip-scores`, data);
  }

  async getTripHistory(params?: { page?: number; limit?: number }): Promise<TripScorePayload[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/trip-scores`, { params });
    const data = response.data;
    return Array.isArray(data) ? data : data?.data ?? [];
  }

  async getAverageTripScore(): Promise<number | null> {
    const response = await axiosInstance.get(`${this.baseUrl}/trip-scores/average`);
    return response.data?.data?.average ?? null;
  }

  /* ── Driver preferences ── */
  async getPreferences(): Promise<DriverPreferences> {
    const response = await axiosInstance.get(`${this.baseUrl}/preferences`);
    return response.data?.data ?? {};
  }

  async savePreferences(data: DriverPreferences): Promise<DriverPreferences> {
    const response = await axiosInstance.put(`${this.baseUrl}/preferences`, data);
    return response.data?.data ?? data;
  }
}

export const driverService = new DriverService();
