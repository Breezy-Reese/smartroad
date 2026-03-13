import axiosInstance from './axiosInstance';

class HospitalService {
  private baseUrl = '/hospitals';

  async getHospitalStats(): Promise<{
    availableAmbulances: number;
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
}

export const hospitalService = new HospitalService();