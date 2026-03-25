import { axiosInstance } from '../../config/axios.config';
import {
  NotificationLog,
  DeliveryReceipt,
  EscalationPolicy,
} from '../../types/notification.types';
import { NotificationPrefs } from '../../hooks/timers/useNotification';

class NotificationService {
  private baseUrl = '/notifications';

  /* ── Notification preferences ── */
  async getPrefs(): Promise<NotificationPrefs> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/prefs`);
      return response.data?.data ?? {};
    } catch (error) {
      console.error('Failed to get notification prefs:', error);
      throw error;
    }
  }

  async savePrefs(data: NotificationPrefs): Promise<NotificationPrefs> {
    try {
      const response = await axiosInstance.put(`${this.baseUrl}/prefs`, data);
      return response.data?.data ?? data;
    } catch (error) {
      console.error('Failed to save notification prefs:', error);
      throw error;
    }
  }

  /* ── Escalation policy ── */
  async getPolicy(): Promise<EscalationPolicy> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/escalation-policy`);
      return response.data?.data;
    } catch (error) {
      console.error('Failed to get escalation policy:', error);
      throw error;
    }
  }

  async savePolicy(policy: EscalationPolicy): Promise<EscalationPolicy> {
    try {
      const response = await axiosInstance.put(`${this.baseUrl}/escalation-policy`, policy);
      return response.data?.data ?? policy;
    } catch (error) {
      console.error('Failed to save escalation policy:', error);
      throw error;
    }
  }

  /* ── Trigger / resolve escalation ── */
  async triggerEscalation(incidentId: string): Promise<NotificationLog> {
    console.log('🔔 [NotificationService] triggerEscalation called with:', {
      incidentId,
      type: typeof incidentId,
      length: incidentId?.length,
      raw: JSON.stringify(incidentId)
    });

    // Validate incidentId
    if (!incidentId) {
      const error = new Error('incidentId is required');
      console.error('❌ [NotificationService]', error.message);
      throw error;
    }

    const cleanId = String(incidentId).trim();
    if (cleanId === '') {
      const error = new Error('incidentId cannot be empty');
      console.error('❌ [NotificationService]', error.message);
      throw error;
    }

    const payload = { incidentId: cleanId };
    console.log('📤 [NotificationService] Sending payload to /escalate:', payload);

    try {
      const response = await axiosInstance.post(`${this.baseUrl}/escalate`, payload);
      console.log('✅ [NotificationService] Escalation response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        hasData: !!response.data?.data
      });
      return response.data?.data;
    } catch (error: any) {
      console.error('❌ [NotificationService] Escalation failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      throw error;
    }
  }

  async resolveEscalation(incidentId: string): Promise<void> {
    console.log('🔔 [NotificationService] resolveEscalation called with:', {
      incidentId,
      type: typeof incidentId
    });

    if (!incidentId) {
      console.error('❌ [NotificationService] Cannot resolve: incidentId is required');
      return;
    }

    try {
      const cleanId = String(incidentId).trim();
      await axiosInstance.post(`${this.baseUrl}/escalate/${cleanId}/resolve`);
      console.log('✅ [NotificationService] Escalation resolved successfully for:', cleanId);
    } catch (error) {
      console.error('❌ [NotificationService] Failed to resolve escalation:', error);
      throw error;
    }
  }

  /* ── Delivery receipts ── */
  async getReceipts(params?: {
    incidentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<DeliveryReceipt[]> {
    try {
      console.log('📋 [NotificationService] Fetching receipts with params:', params);
      const response = await axiosInstance.get(`${this.baseUrl}/receipts`, { params });
      const data = response.data;
      const receipts = Array.isArray(data) ? data : data?.data ?? [];
      console.log('✅ [NotificationService] Receipts fetched:', {
        count: receipts.length,
        firstReceipt: receipts[0]
      });
      return receipts;
    } catch (error) {
      console.error('❌ [NotificationService] Failed to fetch receipts:', error);
      throw error;
    }
  }

  /* ── Notification log for an incident ── */
  async getLog(incidentId: string): Promise<NotificationLog> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/log/${incidentId}`);
      return response.data?.data;
    } catch (error) {
      console.error('Failed to get notification log:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();