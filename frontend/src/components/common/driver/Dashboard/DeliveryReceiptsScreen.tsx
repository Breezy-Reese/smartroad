import React, { useState } from 'react';
import { useDeliveryReceipts } from '../../../../hooks/useDeliveryReceipts';
import { NotificationStatus, NotificationChannel } from '../../../../types/notification.types';
import { BellIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon, DevicePhoneMobileIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

const STATUS_CONFIG: Record<NotificationStatus, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-gray-100 text-gray-600'   },
  sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700'   },
  delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700' },
  failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700'     },
  read:      { label: 'Read',      cls: 'bg-purple-100 text-purple-700'},
};
const CHANNEL_ICONS: Record<NotificationChannel, React.FC<React.SVGProps<SVGSVGElement>>> = {
  push: DevicePhoneMobileIcon, sms: PhoneIcon, call: PhoneIcon, email: EnvelopeIcon,
};

const DeliveryReceiptsScreen: React.FC = () => {
  const { receipts, stats } = useDeliveryReceipts();
  const [filter, setFilter] = useState<NotificationStatus | 'all'>('all');
  const filtered = filter === 'all' ? receipts : receipts.filter((r) => r.status === filter);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery receipts</h1>
        <p className="text-sm text-gray-500 mt-1">Track every notification sent.</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[{ label: 'Total', value: stats.total, cls: 'text-gray-900' }, { label: 'Delivered', value: stats.delivered, cls: 'text-green-600' }, { label: 'Failed', value: stats.failed, cls: 'text-red-600' }, { label: 'Pending', value: stats.pending, cls: 'text-gray-500' }].map(({ label, value, cls }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'delivered', 'failed', 'pending'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl px-4">
        {filtered.length > 0 ? filtered.map((r) => {
          const Icon = CHANNEL_ICONS[r.channel];
          const s = STATUS_CONFIG[r.status];
          return (
            <div key={r.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0"><Icon className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.recipientName}</p>
                <p className="text-xs text-gray-400">{r.channel.toUpperCase()}{r.sentAt ? ` · ${new Date(r.sentAt).toLocaleTimeString()}` : ''}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
            </div>
          );
        }) : (
          <div className="py-12 text-center"><BellIcon className="h-8 w-8 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">No receipts yet</p></div>
        )}
      </div>
    </div>
  );
};

export default DeliveryReceiptsScreen;
