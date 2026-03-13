import React from 'react';
import { useOfflineSync, SyncStatus } from '../../../hooks/useOfflineSync';
import {
  WifiIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';

/* ══════════════════════════════════════════════
   OfflineIndicator — small banner for DriverDashboard
   Usage: <OfflineIndicator />
══════════════════════════════════════════════ */
export const OfflineIndicator: React.FC = () => {
  const { status, pendingCount, flushQueue } = useOfflineSync();

  if (status === 'online' && pendingCount === 0) return null;

  const config: Record<SyncStatus, { bg: string; text: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }> = {
    offline: { bg: 'bg-red-50 border-red-200',    text: 'text-red-700',    icon: SignalSlashIcon,          label: 'Offline' },
    syncing: { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   icon: ArrowPathIcon,            label: 'Syncing…' },
    error:   { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: ExclamationCircleIcon,  label: 'Sync error' },
    online:  { bg: 'bg-green-50 border-green-200', text: 'text-green-700',  icon: CheckCircleIcon,          label: 'Online' },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-lg border text-sm ${c.bg} ${c.text}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
        <span className="font-medium">{c.label}</span>
        {pendingCount > 0 && (
          <span className="text-xs opacity-75">{pendingCount} pending</span>
        )}
      </div>
      {status === 'error' && (
        <button onClick={flushQueue} className="text-xs underline">Retry</button>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   OfflineModeScreen — full settings/status page
══════════════════════════════════════════════ */
const STATUS_CONFIG: Record<SyncStatus, {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  bg: string; iconColor: string; title: string; description: string;
}> = {
  online:  { icon: WifiIcon,               bg: 'bg-green-50',  iconColor: 'text-green-600',  title: 'Connected',    description: 'All changes are syncing in real-time.' },
  offline: { icon: SignalSlashIcon,         bg: 'bg-red-50',    iconColor: 'text-red-600',    title: 'Offline',      description: 'Changes are queued and will sync when you reconnect.' },
  syncing: { icon: ArrowPathIcon,           bg: 'bg-blue-50',   iconColor: 'text-blue-600',   title: 'Syncing…',     description: 'Uploading queued changes to the server.' },
  error:   { icon: ExclamationCircleIcon,   bg: 'bg-orange-50', iconColor: 'text-orange-600', title: 'Sync error',   description: 'Some changes failed to sync. Tap retry below.' },
};

const OfflineModeScreen: React.FC = () => {
  const { status, pendingCount, lastSynced, flushQueue } = useOfflineSync();
  const s = STATUS_CONFIG[status];
  const Icon = s.icon;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Offline mode</h1>
        <p className="text-sm text-gray-500 mt-1">
          The app works without internet. Changes sync automatically when reconnected.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 flex items-center gap-4">
        <div className={`${s.bg} p-4 rounded-full`}>
          <Icon className={`h-8 w-8 ${s.iconColor} ${status === 'syncing' ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{s.title}</p>
          <p className="text-sm text-gray-500">{s.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
          <p className="text-sm text-gray-500 mt-1">Pending actions</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-sm font-bold text-gray-900">
            {lastSynced ? lastSynced.toLocaleTimeString() : '—'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Last synced</p>
        </div>
      </div>

      {/* What works offline */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">What works offline</h2>
        <div className="space-y-3">
          {[
            { label: 'View medical profile',      available: true  },
            { label: 'Start / end trips',         available: true  },
            { label: 'Trip scoring',              available: true  },
            { label: 'Emergency SOS button',      available: true  },
            { label: 'Real-time location sharing',available: false },
            { label: 'Live responder tracking',   available: false },
            { label: 'Notifications to kin',      available: false },
          ].map(({ label, available }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {available ? '✓' : '✕'}
              </span>
              <span className={available ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Manual sync button */}
      {(status === 'error' || (status === 'online' && pendingCount > 0)) && (
        <button
          onClick={flushQueue}
          disabled={status === 'syncing'}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
          {status === 'syncing' ? 'Syncing…' : `Sync now (${pendingCount})`}
        </button>
      )}
    </div>
  );
};

export default OfflineModeScreen;
