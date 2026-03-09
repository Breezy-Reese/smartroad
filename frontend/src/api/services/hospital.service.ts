// src/api/services/hospital.service.ts

import { api } from '../client';
import type {
  ApiResponse,
  PaginatedResponse,
  IHospital,
  DispatchResponderPayload,
} from '../types/index.ts';

export const hospitalService = {
  // ─── Get Hospital Dashboard ──────────────────────────────────────────────────
  async getDashboard(): Promise<unknown> {
    const res = await api.get<ApiResponse<unknown>>('/hospital/dashboard');
    return res.data;
  },

  // ─── Get Hospital's Responders ───────────────────────────────────────────────
  async getResponders(): Promise<IUser[]> {
    const res = await api.get<ApiResponse<IUser[]>>('/hospital/responders');
    return res.data ?? [];
  },

  // ─── Get Single Responder ────────────────────────────────────────────────────
  async getResponder(responderId: string): Promise<IUser> {
    const res = await api.get<ApiResponse<IUser>>(`/hospital/responders/${responderId}`);
    return res.data!;
  },

  // ─── Dispatch Responder ──────────────────────────────────────────────────────
  async dispatchResponder(payload: DispatchResponderPayload): Promise<unknown> {
    const res = await api.post<ApiResponse<unknown>>('/hospital/dispatch', payload);
    return res.data;
  },

  // ─── Get Hospital Incidents ──────────────────────────────────────────────────
  async getIncidents(filters: Record<string, string> = {}): Promise<PaginatedResponse<unknown>> {
    const params = new URLSearchParams(filters);
    return api.get<PaginatedResponse<unknown>>(`/hospital/incidents?${params}`);
  },

  // ─── Get All Hospitals (for responder registration) ──────────────────────────
  async getAll(): Promise<IHospital[]> {
    const res = await api.get<ApiResponse<IHospital[]>>('/hospital/list', { skipAuth: true });
    return res.data ?? [];
  },

  // ─── Update Hospital Profile ─────────────────────────────────────────────────
  async updateProfile(data: Partial<IHospital>): Promise<IHospital> {
    const res = await api.put<ApiResponse<IHospital>>('/hospital/profile', data);
    return res.data!;
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// src/api/services/responder.service.ts
// ─────────────────────────────────────────────────────────────────────────────

import { api as _api } from '../client';
import type {
  ApiResponse as _ApiResponse,
  ICoordinates,
  ResponderStatusType,
  IResponderStatus,
} from '../types/index.ts';

export const responderService = {
  // ─── Get Responder Dashboard ─────────────────────────────────────────────────
  async getDashboard(): Promise<unknown> {
    const res = await _api.get<_ApiResponse<unknown>>('/responder/dashboard');
    return res.data;
  },

  // ─── Update Location ─────────────────────────────────────────────────────────
  async updateLocation(location: ICoordinates): Promise<void> {
    await _api.put('/responder/location', { location });
  },

  // ─── Update Status ───────────────────────────────────────────────────────────
  async updateStatus(status: ResponderStatusType): Promise<IResponderStatus> {
    const res = await _api.put<_ApiResponse<IResponderStatus>>('/responder/status', { status });
    return res.data!;
  },

  // ─── Get My Status ───────────────────────────────────────────────────────────
  async getMyStatus(): Promise<IResponderStatus> {
    const res = await _api.get<_ApiResponse<IResponderStatus>>('/responder/status');
    return res.data!;
  },

  // ─── Mark Arrived ────────────────────────────────────────────────────────────
  async markArrived(incidentId: string): Promise<void> {
    await _api.post(`/responder/incidents/${incidentId}/arrived`);
  },

  // ─── Complete Incident ───────────────────────────────────────────────────────
  async completeIncident(incidentId: string): Promise<void> {
    await _api.post(`/responder/incidents/${incidentId}/complete`);
  },

  // ─── Go Online / Offline ─────────────────────────────────────────────────────
  async setAvailability(isAvailable: boolean): Promise<void> {
    await _api.put('/responder/availability', { isAvailable });
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// src/api/services/user.service.ts
// ─────────────────────────────────────────────────────────────────────────────

import { api as __api } from '../client';
import type { ApiResponse as __ApiResponse, IUser, IEmergencyContact, IMedicalInfo } from '../types';

export const userService = {
  // ─── Get Profile ─────────────────────────────────────────────────────────────
  async getProfile(): Promise<IUser> {
    const res = await __api.get<__ApiResponse<IUser>>('/users/profile');
    return res.data!;
  },

  // ─── Update Profile ──────────────────────────────────────────────────────────
  async updateProfile(data: Partial<IUser>): Promise<IUser> {
    const res = await __api.put<__ApiResponse<IUser>>('/users/profile', data);
    return res.data!;
  },

  // ─── Upload Profile Image ────────────────────────────────────────────────────
  async uploadProfileImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const res = await __api.upload<__ApiResponse<{ url: string }>>('/users/profile/image', form);
    return res.data!.url;
  },

  // ─── Emergency Contacts ───────────────────────────────────────────────────────
  async addEmergencyContact(contact: Omit<IEmergencyContact, '_id'>): Promise<IUser> {
    const res = await __api.post<__ApiResponse<IUser>>('/users/emergency-contacts', contact);
    return res.data!;
  },

  async updateEmergencyContact(contactId: string, data: Partial<IEmergencyContact>): Promise<IUser> {
    const res = await __api.put<__ApiResponse<IUser>>(`/users/emergency-contacts/${contactId}`, data);
    return res.data!;
  },

  async deleteEmergencyContact(contactId: string): Promise<IUser> {
    const res = await __api.delete<__ApiResponse<IUser>>(`/users/emergency-contacts/${contactId}`);
    return res.data!;
  },

  // ─── Medical Info ─────────────────────────────────────────────────────────────
  async updateMedicalInfo(data: Partial<IMedicalInfo>): Promise<IUser> {
    const res = await __api.put<__ApiResponse<IUser>>('/users/medical-info', data);
    return res.data!;
  },

  // ─── Delete Account ───────────────────────────────────────────────────────────
  async deleteAccount(password: string): Promise<void> {
    await __api.delete('/users/account', { body: JSON.stringify({ password }) });
  },
};
