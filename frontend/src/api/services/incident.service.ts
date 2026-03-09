// src/api/services/incident.service.ts

import { api} from '../client';
import type {
  ApiResponse,
  PaginatedResponse,
  IIncident,
  CreateIncidentPayload,
  ICoordinates,
} from '../types/index.ts';

export interface IncidentFilters {
  status?: string;
  severity?: string;
  type?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const incidentService = {
  // ─── Create Incident (driver reports accident) ───────────────────────────────
  async create(payload: CreateIncidentPayload): Promise<IIncident> {
    const res = await api.post<ApiResponse<IIncident>>('/incidents', payload);
    return res.data!;
  },

  // ─── Get All Incidents (hospital/admin) ──────────────────────────────────────
  async getAll(filters: IncidentFilters = {}): Promise<PaginatedResponse<IIncident>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.append(k, String(v));
    });
    return api.get<PaginatedResponse<IIncident>>(`/incidents?${params}`);
  },

  // ─── Get Single Incident ─────────────────────────────────────────────────────
  async getById(id: string): Promise<IIncident> {
    const res = await api.get<ApiResponse<IIncident>>(`/incidents/${id}`);
    return res.data!;
  },

  // ─── Get Driver's Own Incidents ──────────────────────────────────────────────
  async getMyIncidents(filters: IncidentFilters = {}): Promise<PaginatedResponse<IIncident>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.append(k, String(v));
    });
    return api.get<PaginatedResponse<IIncident>>(`/incidents/my?${params}`);
  },

  // ─── Confirm Incident ────────────────────────────────────────────────────────
  async confirm(id: string): Promise<IIncident> {
    const res = await api.put<ApiResponse<IIncident>>(`/incidents/${id}/confirm`);
    return res.data!;
  },

  // ─── Update Incident Status ──────────────────────────────────────────────────
  async updateStatus(id: string, status: string): Promise<IIncident> {
    const res = await api.put<ApiResponse<IIncident>>(`/incidents/${id}/status`, { status });
    return res.data!;
  },

  // ─── Update Responder Location ───────────────────────────────────────────────
  async updateResponderLocation(
    incidentId: string,
    responderId: string,
    location: ICoordinates,
    eta?: number
  ): Promise<void> {
    await api.post(`/incidents/${incidentId}/responder/${responderId}/location`, {
      location,
      eta,
    });
  },

  // ─── Mark Responder Arrived ──────────────────────────────────────────────────
  async markArrived(incidentId: string, responderId: string): Promise<void> {
    await api.post(`/incidents/${incidentId}/responder/${responderId}/arrived`);
  },

  // ─── Get Active Incidents (for map) ─────────────────────────────────────────
  async getActive(): Promise<IIncident[]> {
    const res = await api.get<ApiResponse<IIncident[]>>('/incidents/active');
    return res.data ?? [];
  },

  // ─── Get Nearby Incidents ────────────────────────────────────────────────────
  async getNearby(location: ICoordinates, radiusKm = 10): Promise<IIncident[]> {
    const res = await api.get<ApiResponse<IIncident[]>>(
      `/incidents/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radiusKm}`
    );
    return res.data ?? [];
  },

  // ─── Cancel / False Alarm ────────────────────────────────────────────────────
  async cancel(id: string, reason?: string): Promise<IIncident> {
    const res = await api.put<ApiResponse<IIncident>>(`/incidents/${id}/cancel`, { reason });
    return res.data!;
  },

  // ─── Resolve Incident ────────────────────────────────────────────────────────
  async resolve(id: string): Promise<IIncident> {
    const res = await api.put<ApiResponse<IIncident>>(`/incidents/${id}/resolve`);
    return res.data!;
  },
};
