import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { emergencyService } from '../services/api/emergency.service';
import { EmergencyContact } from '../types/user.types';
import { NotificationChannel } from '../types/notification.types';

/* Extends the existing EmergencyContact type with notification fields */
export interface NextOfKin extends EmergencyContact {
  priority: number;
  channels: NotificationChannel[];
}

export const useNextOfKin = () => {
  const [contacts, setContacts] = useState<NextOfKin[]>([]);
  const [loading, setLoading] = useState(false);

  /* ── Load on mount ── */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await emergencyService.getEmergencyContacts();
        const normalised: NextOfKin[] = data.map((c: any, i: number) => ({
          ...c,
          _id: c._id ?? c.id ?? `kin_${i}`,
          priority: c.priority ?? i + 1,
          channels: c.channels ?? ['push', 'sms'],
          isPrimary: c.isPrimary ?? i === 0,
          isNotified: c.isNotified ?? false,
          createdAt: c.createdAt ?? new Date().toISOString(),
          updatedAt: c.updatedAt ?? new Date().toISOString(),
        }));
        setContacts(normalised);
      } catch {
        // fail silently — non-critical on load
      }
    };
    load();
  }, []);

  const addContact = useCallback(async (
    data: Omit<NextOfKin, '_id' | 'priority' | 'isNotified' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    try {
      const saved = await emergencyService.addEmergencyContact({
        ...data,
        isPrimary: contacts.length === 0,
        priority: contacts.length + 1,
      });
      const normalised: NextOfKin = {
        ...saved,
        _id: saved._id ?? saved.id,
        priority: contacts.length + 1,
        channels: saved.channels ?? data.channels,
        isNotified: false,
        createdAt: saved.createdAt ?? new Date().toISOString(),
        updatedAt: saved.updatedAt ?? new Date().toISOString(),
      };
      setContacts((prev) => [...prev, normalised]);
      toast.success(`${data.name} added`);
      return normalised;
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  }, [contacts.length]);

  const updateContact = useCallback(async (_id: string, data: Partial<NextOfKin>) => {
    setLoading(true);
    try {
      const saved = await emergencyService.updateEmergencyContact(_id, data);
      setContacts((prev) =>
        prev.map((c) => c._id === _id ? { ...c, ...saved, _id } : c)
      );
      toast.success('Contact updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeContact = useCallback(async (_id: string) => {
    try {
      await emergencyService.deleteEmergencyContact(_id);
      setContacts((prev) =>
        prev
          .filter((c) => c._id !== _id)
          .map((c, i) => ({ ...c, priority: i + 1 }))
      );
      toast.success('Contact removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to remove contact');
    }
  }, []);

  const reorderContacts = useCallback((reordered: NextOfKin[]) => {
    const withPriority = reordered.map((c, i) => ({ ...c, priority: i + 1 }));
    setContacts(withPriority);
    withPriority.forEach((c) => {
      emergencyService.updateEmergencyContact(c._id, { priority: c.priority } as any).catch(() => {});
    });
  }, []);

  return { contacts, loading, addContact, updateContact, removeContact, reorderContacts };
};
