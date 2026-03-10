import axiosInstance from './axiosInstance';
import {
  Incident,
  CreateIncidentDto,
  UpdateIncidentDto,
  IncidentReport,
  IncidentStatus
} from '../../types/emergency.types';
import { Coordinates } from '../../types/location.types';

class EmergencyService {
  private baseUrl = '/incidents'; // ← corrected from /emergency to /incidents

  async createEmergency(data: CreateIncidentDto): Promise<Incident> {
    const response = await axiosInstance.post<Incident>(`${this.baseUrl}`, data);
    return response.data;
  }

  async getIncident(incidentId: string): Promise<Incident> {
    const response = await axiosInstance.get<Incident>(`${this.baseUrl}/${incidentId}`);
    return response.data;
  }

  async getUserIncidents(userId: string, params?: any): Promise<Incident[]> {
    const response = await axiosInstance.get<Incident[]>(`${this.baseUrl}/user/${userId}`, { params });
    return response.data;
  }

  async getActiveIncidents(params?: {
    radius?: number;
    lat?: number;
    lng?: number;
    status?: string;
  }): Promise<Incident[]> {
    const response = await axiosInstance.get<Incident[]>(`${this.baseUrl}/active`, { params });
    return response.data;
  }

  async updateIncident(incidentId: string, data: UpdateIncidentDto): Promise<Incident> {
    const response = await axiosInstance.put<Incident>(`${this.baseUrl}/${incidentId}`, data);
    return response.data;
  }

  async acceptIncident(incidentId: string, hospitalId: string, responderId: string, eta: number): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/${incidentId}/accept`, {
      hospitalId,
      responderId,
      eta,
    });
  }

  async cancelEmergency(incidentId: string): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/${incidentId}/cancel`);
  }

  async reportAccident(data: any): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}`, data);
  }

  async getIncidentReport(incidentId: string): Promise<IncidentReport> {
    const response = await axiosInstance.get<IncidentReport>(`${this.baseUrl}/${incidentId}/report`);
    return response.data;
  }

  async getIncidentStats(params?: any): Promise<IncidentStatus> {
    const response = await axiosInstance.get<IncidentStatus>(`${this.baseUrl}/stats`, { params });
    return response.data;
  }

  async getNearbyHospitals(location: Coordinates, radius: number = 10): Promise<any[]> {
    const response = await axiosInstance.get('/hospitals/nearby', {
      params: {
        lat: location.lat,
        lng: location.lng,
        radius,
      },
    });
    return response.data;
  }

  async addWitnessReport(incidentId: string, data: any): Promise<any> {
    const response = await axiosInstance.post(`${this.baseUrl}/${incidentId}/witness`, data);
    return response.data;
  }

  async getEmergencyContacts(): Promise<any[]> {
  const response = await axiosInstance.get('/users/emergency-contacts');
  const data = response.data;
  return Array.isArray(data) ? data : data?.data || [];
}

  async addEmergencyContact(data: any): Promise<any> {
    const response = await axiosInstance.post('/users/emergency-contacts', data);
    return response.data;
  }

  async updateEmergencyContact(contactId: string, data: any): Promise<any> {
    const response = await axiosInstance.put(`/users/emergency-contacts/${contactId}`, data);
    return response.data;
  }

  async deleteEmergencyContact(contactId: string): Promise<void> {
    await axiosInstance.delete(`/users/emergency-contacts/${contactId}`);
  }
}

export const emergencyService = new EmergencyService();
