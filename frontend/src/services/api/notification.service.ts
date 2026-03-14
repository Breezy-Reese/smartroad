import { axiosInstance } from '../../config/axios.config';
import {
  NotificationLog,
  DeliveryReceipt,
  EscalationPolicy,
} from '../../types/notification.types';
import { NotificationPrefs } from '../../hooks/useNotifications';

class NotificationService {
  private baseUrl = '/notifications';

  /* ── Notification preferences ── */
  async getPrefs(): Promise<NotificationPrefs> {
    const response = await axiosInstance.get(`${this.baseUrl}/prefs`);
    return response.data?.data ?? {};
  }

  async savePrefs(data: NotificationPrefs): Promise<NotificationPrefs> {
    const response = await axiosInstance.put(`${this.baseUrl}/prefs`, data);
    return response.data?.data ?? data;
  }

  /* ── Escalation policy ── */
  async getPolicy(): Promise<EscalationPolicy> {
    const response = await axiosInstance.get(`${this.baseUrl}/escalation-policy`);
    return response.data?.data;
  }

  async savePolicy(policy: EscalationPolicy): Promise<EscalationPolicy> {
    const response = await axiosInstance.put(`${this.baseUrl}/escalation-policy`, policy);
    return response.data?.data ?? policy;
  }

  /* ── Trigger / resolve escalation ── */
  async triggerEscalation(incidentId: string): Promise<NotificationLog> {
    const response = await axiosInstance.post(`${this.baseUrl}/escalate`, { incidentId });
    return response.data?.data;
  }

  async resolveEscalation(incidentId: string): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/escalate/${incidentId}/resolve`);
  }

  /* ── Delivery receipts ── */
  async getReceipts(params?: {
    incidentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<DeliveryReceipt[]> {
    const response = await axiosInstance.get(`${this.baseUrl}/receipts`, { params });
    const data = response.data;
    return Array.isArray(data) ? data : data?.data ?? [];
  }

  /* ── Notification log for an incident ── */
  async getLog(incidentId: string): Promise<NotificationLog> {
    const response = await axiosInstance.get(`${this.baseUrl}/log/${incidentId}`);
    return response.data?.data;
  }
}

export const notificationService = new NotificationService();
