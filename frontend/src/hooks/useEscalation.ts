import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  EscalationPolicy,
  EscalationStep,
  EscalationLevel,
  DeliveryReceipt,
  NotificationLog,
  NotificationChannel,
} from '../types/notification.types';

/* ── Default escalation policy ── */
export const DEFAULT_POLICY: EscalationPolicy = {
  id: 'default',
  name: 'Standard escalation',
  steps: [
    {
      level: 1,
      delaySeconds: 0,
      recipients: ['primary_kin'],
      channels: ['push', 'sms'],
    },
    {
      level: 2,
      delaySeconds: 60,
      recipients: ['primary_kin', 'secondary_kin'],
      channels: ['sms', 'call'],
    },
    {
      level: 3,
      delaySeconds: 180,
      recipients: ['all_kin', 'fleet_manager'],
      channels: ['sms', 'call', 'email'],
    },
  ],
};

const STORAGE_KEY = 'escalation_logs';

const loadLogs = (): NotificationLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useEscalation = () => {
  const [policy, setPolicy] = useState<EscalationPolicy>(DEFAULT_POLICY);
  const [logs, setLogs] = useState<NotificationLog[]>(loadLogs);
  const [activeLog, setActiveLog] = useState<NotificationLog | null>(null);
  const escalationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ── Simulate sending a notification ── */
  const sendNotification = useCallback(async (
    incidentId: string,
    recipientId: string,
    recipientName: string,
    channel: NotificationChannel,
  ): Promise<DeliveryReceipt> => {
    const receipt: DeliveryReceipt = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      incidentId,
      recipientId,
      recipientName,
      channel,
      status: 'pending',
      sentAt: Date.now(),
      retryCount: 0,
    };

    // TODO: POST /notifications/send  { incidentId, recipientId, channel }
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    // Simulate 90% delivery success
    const delivered = Math.random() > 0.1;
    return {
      ...receipt,
      status: delivered ? 'delivered' : 'failed',
      deliveredAt: delivered ? Date.now() : undefined,
      failureReason: delivered ? undefined : 'Carrier timeout',
    };
  }, []);

  /* ── Trigger full escalation chain for an incident ── */
  const triggerEscalation = useCallback(async (
    incidentId: string,
    kinContacts: { id: string; name: string; phone: string }[],
  ) => {
    // Clear any running timers from a previous incident
    escalationTimers.current.forEach(clearTimeout);
    escalationTimers.current = [];

    const log: NotificationLog = {
      incidentId,
      triggeredAt: Date.now(),
      receipts: [],
      escalationLevel: 1,
      resolved: false,
    };

    setActiveLog(log);

    for (const step of policy.steps) {
      const timer = setTimeout(async () => {
        if (!kinContacts.length) return;

        // Resolve recipients for this step
        const targets =
          step.recipients.includes('all_kin') ? kinContacts :
          step.recipients.includes('primary_kin') ? kinContacts.slice(0, 1) :
          step.recipients.includes('secondary_kin') ? kinContacts.slice(1, 2) :
          [];

        const newReceipts: DeliveryReceipt[] = [];

        for (const target of targets) {
          for (const channel of step.channels) {
            // SMS fallback: if push failed, also try SMS
            const receipt = await sendNotification(incidentId, target.id, target.name, channel);
            newReceipts.push(receipt);

            // If push failed, auto-escalate to SMS immediately
            if (channel === 'push' && receipt.status === 'failed') {
              const smsReceipt = await sendNotification(incidentId, target.id, target.name, 'sms');
              newReceipts.push(smsReceipt);
            }
          }
        }

        setActiveLog((prev) => {
          if (!prev) return prev;
          const updated: NotificationLog = {
            ...prev,
            receipts: [...prev.receipts, ...newReceipts],
            escalationLevel: step.level,
          };
          return updated;
        });

        if (step.level === 1) {
          toast(`Level ${step.level} notifications sent`, { icon: '📨' });
        } else {
          toast.error(`Escalated to level ${step.level} — no acknowledgement received`);
        }
      }, step.delaySeconds * 1000);

      escalationTimers.current.push(timer);
    }
  }, [policy, sendNotification]);

  /* ── Resolve / cancel escalation ── */
  const resolveEscalation = useCallback((incidentId: string) => {
    escalationTimers.current.forEach(clearTimeout);
    escalationTimers.current = [];

    setActiveLog((prev) => {
      if (!prev || prev.incidentId !== incidentId) return prev;
      const resolved: NotificationLog = { ...prev, resolved: true, resolvedAt: Date.now() };
      setLogs((l) => {
        const next = [resolved, ...l].slice(0, 100);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return null;
    });
  }, []);

  const updatePolicy = useCallback((updated: EscalationPolicy) => {
    setPolicy(updated);
    toast.success('Escalation policy updated');
  }, []);

  return {
    policy,
    logs,
    activeLog,
    triggerEscalation,
    resolveEscalation,
    updatePolicy,
  };
};
