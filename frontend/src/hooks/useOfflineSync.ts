import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_sync_queue';
const MAX_RETRIES = 3;

const loadQueue = (): QueuedAction[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedAction[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const useOfflineSync = () => {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? 'online' : 'offline',
  );
  const [queue, setQueue] = useState<QueuedAction[]>(loadQueue);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  /* ── Online / offline listeners ── */
  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      toast.success('Back online — syncing…', { id: 'sync-online' });
      flushQueue();
    };
    const handleOffline = () => {
      setStatus('offline');
      toast.error('You are offline. Changes will sync when reconnected.', { id: 'sync-offline' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /* ── Enqueue an action for later sync ── */
  const enqueue = useCallback((type: string, payload: unknown) => {
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue((prev) => {
      const next = [...prev, action];
      saveQueue(next);
      return next;
    });
  }, []);

  /* ── Flush the queue when online ── */
  const flushQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setStatus('syncing');

    setQueue((prev) => {
      if (prev.length === 0) {
        syncingRef.current = false;
        setStatus('online');
        return prev;
      }
      // Process asynchronously
      (async () => {
        const remaining: QueuedAction[] = [];
        for (const action of prev) {
          try {
            // TODO: dispatch to real API based on action.type
            await new Promise((r) => setTimeout(r, 200));
            // success — drop from queue
          } catch {
            if (action.retries < MAX_RETRIES) {
              remaining.push({ ...action, retries: action.retries + 1 });
            }
            // else drop permanently after MAX_RETRIES
          }
        }
        saveQueue(remaining);
        setQueue(remaining);
        setLastSynced(new Date());
        setStatus(remaining.length > 0 ? 'error' : 'online');
        syncingRef.current = false;
        if (remaining.length === 0) {
          toast.success('All changes synced', { id: 'sync-done' });
        } else {
          toast.error(`${remaining.length} action(s) failed to sync`, { id: 'sync-error' });
        }
      })();
      return prev;
    });
  }, []);

  const pendingCount = queue.length;
  const isOffline = status === 'offline';

  return { status, pendingCount, lastSynced, isOffline, enqueue, flushQueue };
};
