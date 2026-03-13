import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DeliveryReceipt, NotificationChannel, NotificationStatus } from '../types/notification.types';

export interface NotificationPrefs {
  pushEnabled: boolean;
  smsEnabled: boolean;
  smsPhoneNumber: string;
  emailEnabled: boolean;
  emailAddress: string;
  smsFallbackOnPushFail: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;   // "HH:MM"
  quietHoursEnd: string;
}

const PREFS_KEY = 'notification_prefs';
const RECEIPT_KEY = 'delivery_receipts';

const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  smsEnabled: true,
  smsPhoneNumber: '',
  emailEnabled: false,
  emailAddress: '',
  smsFallbackOnPushFail: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const loadPrefs = (): NotificationPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
};

const loadReceipts = (): DeliveryReceipt[] => {
  try {
    const raw = localStorage.getItem(RECEIPT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const useNotifications = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);
  const [receipts, setReceipts] = useState<DeliveryReceipt[]>(loadReceipts);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  /* ── Check push permission on mount ── */
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  /* ── Request push permission ── */
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications not supported on this device');
      return false;
    }
    const result = await Notification.requestPermission();
    setPushPermission(result);
    if (result === 'granted') {
      toast.success('Push notifications enabled');
      return true;
    } else {
      toast.error('Push notifications denied — SMS fallback will be used');
      return false;
    }
  }, []);

  /* ── Save prefs ── */
  const savePrefs = useCallback(async (updated: NotificationPrefs) => {
    setLoading(true);
    try {
      // TODO: PUT /driver/notification-prefs
      await new Promise((r) => setTimeout(r, 400));
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      setPrefs(updated);
      toast.success('Notification settings saved');
    } catch {
      toast.error('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Determine active channels for a given context ── */
  const getActiveChannels = useCallback((): NotificationChannel[] => {
    const channels: NotificationChannel[] = [];
    if (prefs.pushEnabled && pushPermission === 'granted') channels.push('push');
    if (prefs.smsEnabled && prefs.smsPhoneNumber) channels.push('sms');
    if (prefs.emailEnabled && prefs.emailAddress) channels.push('email');
    // Always include SMS as fallback for emergencies even if push is primary
    if (!channels.includes('sms') && prefs.smsPhoneNumber) channels.push('sms');
    return channels;
  }, [prefs, pushPermission]);

  /* ── Add a delivery receipt ── */
  const addReceipt = useCallback((receipt: DeliveryReceipt) => {
    setReceipts((prev) => {
      const next = [receipt, ...prev].slice(0, 200);
      localStorage.setItem(RECEIPT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /* ── Update receipt status ── */
  const updateReceiptStatus = useCallback((id: string, status: NotificationStatus, extra?: Partial<DeliveryReceipt>) => {
    setReceipts((prev) => {
      const next = prev.map((r) =>
        r.id === id ? { ...r, status, ...extra } : r
      );
      localStorage.setItem(RECEIPT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /* ── Stats ── */
  const stats = {
    total: receipts.length,
    delivered: receipts.filter((r) => r.status === 'delivered').length,
    failed: receipts.filter((r) => r.status === 'failed').length,
    pending: receipts.filter((r) => r.status === 'pending').length,
  };

  return {
    prefs,
    receipts,
    loading,
    pushPermission,
    stats,
    requestPushPermission,
    savePrefs,
    getActiveChannels,
    addReceipt,
    updateReceiptStatus,
  };
};
