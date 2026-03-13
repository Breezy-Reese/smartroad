export type NotificationChannel = 'push' | 'sms' | 'call' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
export type EscalationLevel = 1 | 2 | 3;

export interface NextOfKin {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  priority: number;           // 1 = first to notify
  channels: NotificationChannel[];
}

export interface EscalationStep {
  level: EscalationLevel;
  delaySeconds: number;       // wait this long before firing
  recipients: string[];       // NextOfKin ids or role names e.g. 'fleet_manager'
  channels: NotificationChannel[];
  message?: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  steps: EscalationStep[];
}

export interface DeliveryReceipt {
  id: string;
  incidentId: string;
  recipientId: string;
  recipientName: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: number;
  deliveredAt?: number;
  readAt?: number;
  failureReason?: string;
  retryCount: number;
}

export interface NotificationLog {
  incidentId: string;
  triggeredAt: number;
  receipts: DeliveryReceipt[];
  escalationLevel: EscalationLevel;
  resolved: boolean;
  resolvedAt?: number;
}
