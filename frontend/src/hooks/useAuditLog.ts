import { useState, useCallback } from 'react';
import { AuditEntry, AdminRole } from '../types/admin.types';

const STORAGE_KEY = 'audit_log';

const SAMPLE_ACTIONS = [
  { action: 'EMERGENCY_TRIGGERED',  target: 'James Mwangi'     },
  { action: 'EMERGENCY_RESOLVED',   target: 'James Mwangi'     },
  { action: 'POLICY_UPDATED',       target: 'Escalation policy' },
  { action: 'DRIVER_CREATED',       target: 'Aisha Kamau'      },
  { action: 'DRIVER_SUSPENDED',     target: 'Samuel Otieno'    },
  { action: 'EXPORT_REQUESTED',     target: 'incidents CSV'    },
  { action: 'NEXT_OF_KIN_UPDATED',  target: 'Grace Wanjiku'    },
  { action: 'MEDICAL_PROFILE_READ', target: 'Peter Odhiambo'   },
  { action: 'NOTIFICATION_SENT',    target: 'Mary Achieng'     },
  { action: 'ROLE_CHANGED',         target: 'David Kimani'     },
];

const ACTORS = [
  { id: 'adm_1', name: 'Admin User',   role: 'super_admin' as AdminRole  },
  { id: 'adm_2', name: 'Fleet Mgr',    role: 'fleet_manager' as AdminRole },
  { id: 'adm_3', name: 'Dispatcher',   role: 'dispatcher' as AdminRole   },
];

const seedEntries = (count = 80): AuditEntry[] =>
  Array.from({ length: count }, (_, i) => {
    const actor = ACTORS[i % ACTORS.length];
    const sample = SAMPLE_ACTIONS[i % SAMPLE_ACTIONS.length];
    return {
      id: `audit_${i + 1}`,
      timestamp: Date.now() - (count - i) * 4 * 60 * 1000,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: sample.action,
      target: sample.target,
      ipAddress: `192.168.1.${(i % 20) + 10}`,
      metadata: {},
    };
  });

const loadEntries = (): AuditEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = seedEntries();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
};

export const useAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>(loadEntries);
  const [loading, setLoading] = useState(false);

  const addEntry = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const full: AuditEntry = {
      ...entry,
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
    };
    setEntries((prev) => {
      const next = [full, ...prev].slice(0, 500);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchEntries = useCallback(async (filters?: {
    from?: number;
    to?: number;
    actorRole?: AdminRole;
    action?: string;
  }) => {
    setLoading(true);
    // TODO: GET /admin/audit-log?from=&to=&role=&action=
    await new Promise((r) => setTimeout(r, 400));
    setLoading(false);
    // Local filter on mock data
    return entries.filter((e) => {
      if (filters?.from && e.timestamp < filters.from) return false;
      if (filters?.to   && e.timestamp > filters.to)   return false;
      if (filters?.actorRole && e.actorRole !== filters.actorRole) return false;
      if (filters?.action    && !e.action.includes(filters.action.toUpperCase())) return false;
      return true;
    });
  }, [entries]);

  return { entries, loading, addEntry, fetchEntries };
};
