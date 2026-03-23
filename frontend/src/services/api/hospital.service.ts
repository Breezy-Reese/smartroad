import axiosInstance from './axiosInstance';

class HospitalService {
  private baseUrl = '/hospitals';

  async getHospitalStats(): Promise<{
    availableAmbulances: number;
    totalAmbulances: number;
    availableResponders: number;
    availableBeds: number;
    activeIncidents: number;
    averageResponseTime: number;
    lastUpdated: string;
  }> {
    const response = await axiosInstance.get(`${this.baseUrl}/stats`);
    const data = response.data?.data || response.data || {};
    return data;
  }

  // ── Bed availability — throws so BedTracker falls back to mock data
  // until a real /hospitals/beds endpoint is implemented
  async getBedAvailability(_hospitalId?: string): Promise<any[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/beds`);
    return response.data?.data || response.data || [];
  }

  // ── Shift data — throws so ShiftManager falls back to mock data
  // until a real /hospitals/shifts endpoint is implemented
  async getShifts(_hospitalId?: string): Promise<any[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/shifts`);
    return response.data?.data || response.data || [];
  }
}

export const hospitalService = new HospitalService();