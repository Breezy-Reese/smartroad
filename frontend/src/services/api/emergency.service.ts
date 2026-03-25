import axiosInstance from './axiosInstance';
import {
  Incident,
  CreateIncidentDto,
  UpdateIncidentDto,
  IncidentReport,
  IncidentStats,
} from '../../types/emergency.types';
import { Coordinates } from '../../types/location.types';

class EmergencyService {
  private baseUrl = '/incidents';

  /**
   * Helper to extract data from API response
   * Handles both { success: true, data: ... } and direct response formats
   */
  private extractData<T>(response: any): T {
    // If response has data property with success flag, extract it
    if (response.data && typeof response.data === 'object') {
      if ('success' in response.data && response.data.data) {
        return response.data.data;
      }
      // If response.data is the actual data
      if (!('success' in response.data)) {
        return response.data;
      }
    }
    // Fallback to response.data
    return response.data;
  }

  /**
   * Normalize incident to ensure both _id and incidentId are available
   */
  private normalizeIncident(incident: any): Incident {
    if (!incident) return incident;
    
    // If incident has incidentId but no _id, use incidentId as _id
    if (!incident._id && incident.incidentId) {
      incident._id = incident.incidentId;
    }
    
    // If incident has _id but no incidentId, create one
    if (!incident.incidentId && incident._id) {
      incident.incidentId = incident._id;
    }
    
    return incident as Incident;
  }

  async createEmergency(data: CreateIncidentDto): Promise<Incident> {
    console.log('📤 Creating emergency with data:', data);
    
    const response = await axiosInstance.post(`${this.baseUrl}`, data);
    const incident = this.extractData<Incident>(response);
    const normalizedIncident = this.normalizeIncident(incident);
    
    console.log('✅ Emergency created:', {
      id: normalizedIncident._id,
      incidentId: normalizedIncident.incidentId,
      hasId: !!normalizedIncident._id,
      hasIncidentId: !!normalizedIncident.incidentId
    });
    
    return normalizedIncident;
  }

  async getIncident(incidentId: string): Promise<Incident> {
    const response = await axiosInstance.get(`${this.baseUrl}/${incidentId}`);
    const incident = this.extractData<Incident>(response);
    return this.normalizeIncident(incident);
  }

  async getUserIncidents(userId: string, params?: any): Promise<Incident[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/user/${userId}`, { params });
    const incidents = this.extractData<Incident[]>(response);
    return Array.isArray(incidents) ? incidents.map(i => this.normalizeIncident(i)) : [];
  }

  async getActiveIncidents(params?: {
    radius?: number;
    lat?: number;
    lng?: number;
    status?: string;
  }): Promise<Incident[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/active`, { params });
    const incidents = this.extractData<Incident[]>(response);
    return Array.isArray(incidents) ? incidents.map(i => this.normalizeIncident(i)) : [];
  }

  async updateIncident(incidentId: string, data: UpdateIncidentDto): Promise<Incident> {
    const response = await axiosInstance.put(`${this.baseUrl}/${incidentId}`, data);
    const incident = this.extractData<Incident>(response);
    return this.normalizeIncident(incident);
  }

  async updateIncidentLocation(incidentId: string, location: { latitude: number; longitude: number }): Promise<void> {
    console.log(`📍 Updating incident ${incidentId} location:`, location);
    await axiosInstance.patch(`${this.baseUrl}/${incidentId}/location`, { location });
  }

  async acceptIncident(incidentId: string, hospitalId: string, responderId: string, eta: number): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/${incidentId}/accept`, {
      hospitalId,
      responderId,
      eta,
    });
  }

  async cancelEmergency(incidentId: string): Promise<void> {
    console.log(`🛑 Cancelling emergency for incident: ${incidentId}`);
    await axiosInstance.post(`${this.baseUrl}/${incidentId}/cancel`);
  }

  async reportAccident(data: any): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}`, data);
  }

  async getIncidentReport(incidentId: string): Promise<IncidentReport> {
    const response = await axiosInstance.get(`${this.baseUrl}/${incidentId}/report`);
    return this.extractData<IncidentReport>(response);
  }

  async getIncidentStats(params?: any): Promise<IncidentStats> {
    const response = await axiosInstance.get(`${this.baseUrl}/stats`, { params });
    return this.extractData<IncidentStats>(response);
  }

  async getNearbyHospitals(location: Coordinates, radius: number = 10): Promise<any[]> {
    const response = await axiosInstance.get('/hospitals/nearby', {
      params: {
        lat: location.lat,
        lng: location.lng,
        radius,
      },
    });
    const hospitals = this.extractData<any[]>(response);
    return Array.isArray(hospitals) ? hospitals : [];
  }

  async addWitnessReport(incidentId: string, data: any): Promise<any> {
    const response = await axiosInstance.post(`${this.baseUrl}/${incidentId}/witness`, data);
    return this.extractData<any>(response);
  }

  async getEmergencyContacts(): Promise<any[]> {
    const response = await axiosInstance.get('/users/emergency-contacts');
    const contacts = this.extractData<any[]>(response);
    return Array.isArray(contacts) ? contacts : [];
  }

  async addEmergencyContact(data: any): Promise<any> {
    const response = await axiosInstance.post('/users/emergency-contacts', data);
    return this.extractData<any>(response);
  }

  async updateEmergencyContact(contactId: string, data: any): Promise<any> {
    const response = await axiosInstance.put(`/users/emergency-contacts/${contactId}`, data);
    return this.extractData<any>(response);
  }

  async deleteEmergencyContact(contactId: string): Promise<void> {
    await axiosInstance.delete(`/users/emergency-contacts/${contactId}`);
  }
}

export const emergencyService = new EmergencyService();