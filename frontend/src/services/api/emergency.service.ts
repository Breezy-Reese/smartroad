import axiosInstance from './axiosInstance';
import { 
  Incident, 
  CreateIncidentDto, 
  UpdateIncidentDto,
  IncidentReport,
  EmergencyAlert,
  IncidentStats 
} from '../../types/incident.types';
import { Coordinates } from '../../types/location.types';

class EmergencyService {
  private baseUrl = '/emergency';

  async createEmergency(data: CreateIncidentDto): Promise<Incident> {
    const response = await axiosInstance.post<Incident>(`${this.baseUrl}/alert`, data);
    return response.data;
  }

  async getIncident(incidentId: string): Promise<Incident> {
    const response = await axiosInstance.get<Incident>(`${this.baseUrl}/incident/${incidentId}`);
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
    const response = await axiosInstance.get<Incident[]>(`${this.baseUrl}/incidents`, { params });
    return response.data;
  }

  async updateIncident(incidentId: string, data: UpdateIncidentDto): Promise<Incident> {
    const response = await axiosInstance.put<Incident>(`${this.baseUrl}/${incidentId}`, data);
    return response.data;
  }

  async acceptIncident(incidentId: string, hospitalId: string, responderId: string, eta: number): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/accept/${incidentId}`, {
      hospitalId,
      responderId,
      eta,
    });
  }

  async cancelEmergency(incidentId: string): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/cancel/${incidentId}`);
  }

  async reportAccident(data: any): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/report`, data);
  }

  async getIncidentReport(incidentId: string): Promise<IncidentReport> {
    const response = await axiosInstance.get<IncidentReport>(`${this.baseUrl}/report/${incidentId}`);
    return response.data;
  }

  async getIncidentStats(params?: any): Promise<IncidentStats> {
    const response = await axiosInstance.get<IncidentStats>(`${this.baseUrl}/stats`, { params });
    return response.data;
  }

  async getNearbyHospitals(location: Coordinates, radius: number = 10): Promise<any[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/hospitals/nearby`, {
      params: {
        lat: location.lat,
        lng: location.lng,
        radius,
      },
    });
    return response.data;
  }

  async addWitnessReport(incidentId: string, data: any): Promise<any> {
    const response = await axiosInstance.post(`${this.baseUrl}/witness/${incidentId}`, data);
    return response.data;
  }

  async getEmergencyContacts(): Promise<any[]> {
    const response = await axiosInstance.get('/users/emergency-contacts');
    return response.data;
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