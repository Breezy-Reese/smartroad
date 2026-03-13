import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { NextOfKin, NotificationChannel } from '../types/notification.types';

const STORAGE_KEY = 'next_of_kin';

const load = (): NextOfKin[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persist = (list: NextOfKin[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

export const useNextOfKin = () => {
  const [contacts, setContacts] = useState<NextOfKin[]>(load);
  const [loading, setLoading] = useState(false);

  const addContact = useCallback(async (data: Omit<NextOfKin, 'id' | 'priority'>) => {
    setLoading(true);
    try {
      // TODO: POST /driver/next-of-kin
      await new Promise((r) => setTimeout(r, 500));
      const contact: NextOfKin = {
        ...data,
        id: `kin_${Date.now()}`,
        priority: contacts.length + 1,
      };
      setContacts((prev) => {
        const next = [...prev, contact];
        persist(next);
        return next;
      });
      toast.success(`${contact.name} added`);
      return contact;
    } catch {
      toast.error('Failed to add contact');
    } finally {
      setLoading(false);
    }
  }, [contacts.length]);

  const updateContact = useCallback(async (id: string, data: Partial<NextOfKin>) => {
    setLoading(true);
    try {
      // TODO: PUT /driver/next-of-kin/:id
      await new Promise((r) => setTimeout(r, 400));
      setContacts((prev) => {
        const next = prev.map((c) => c.id === id ? { ...c, ...data } : c);
        persist(next);
        return next;
      });
      toast.success('Contact updated');
    } catch {
      toast.error('Failed to update contact');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeContact = useCallback(async (id: string) => {
    // TODO: DELETE /driver/next-of-kin/:id
    setContacts((prev) => {
      const next = prev
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, priority: i + 1 }));
      persist(next);
      return next;
    });
    toast.success('Contact removed');
  }, []);

  const reorderContacts = useCallback((reordered: NextOfKin[]) => {
    const withPriority = reordered.map((c, i) => ({ ...c, priority: i + 1 }));
    setContacts(withPriority);
    persist(withPriority);
  }, []);

  return { contacts, loading, addContact, updateContact, removeContact, reorderContacts };
};
