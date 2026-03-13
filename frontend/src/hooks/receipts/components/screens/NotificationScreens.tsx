import React, { useState } from 'react';
import { useNotifications } from '../../../hooks/useNotifications';
import { DeliveryReceipt, NotificationChannel, NotificationStatus } from '../../../types/notification.types';
import {
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

/* ── Channel icon ── */
const ChannelIcon: React.FC<{ channel: NotificationChannel }> = ({ channel }) => {
  const icons: Record<NotificationChannel, React.FC<React.SVGProps<SVGSVGElement>>> = {
    push: DevicePhoneMobileIcon, sms: PhoneIcon, call: PhoneIcon, email: EnvelopeIcon,
  };
  const Icon = icons[channel];
  return <Icon className="h-4 w-4" />;
};

/* ── Status badge ── */
const StatusBadge: React.FC<{ status: NotificationStatus }> = ({ status }) => {
  const config: Record<NotificationStatus, { label: string; cls: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
    pending:   { label: 'Pending',   cls: 'bg-gray-100 text-gray-600',    icon: ClockIcon },
    sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700',    icon: ArrowPathIcon },
    delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700',  icon: CheckCircleIcon },
    failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700',      icon: XCircleIcon },
    read:      { label: 'Read',      cls: 'bg-purple-100 text-purple-700',icon: CheckCircleIcon },
  };
  const { label, cls, icon: Icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

/* ── Receipt row ── */
const ReceiptRow: React.FC<{ receipt: DeliveryReceipt }> = ({ receipt }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
      <ChannelIcon channel={receipt.channel} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{receipt.recipientName}</p>
      <p className="text-xs text-gray-400">
        {receipt.channel.toUpperCase()}
        {receipt.sentAt ? ` · ${new Date(receipt.sentAt).toLocaleTimeString()}` : ''}
        {receipt.failureReason ? ` · ${receipt.failureReason}` : ''}
      </p>
    </div>
    <StatusBadge status={receipt.status} />
  </div>
);

/* ════════════════════════════════════════════
   DeliveryReceiptsScreen
════════════════════════════════════════════ */
export const DeliveryReceiptsScreen: React.FC = () => {
  const { receipts, stats } = useNotifications();
  const [filter, setFilter] = useState<NotificationStatus | 'all'>('all');

  const filtered = filter === 'all' ? receipts : receipts.filter((r) => r.status === filter);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery receipts</h1>
        <p className="text-sm text-gray-500 mt-1">Track the status of every notification sent.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     cls: 'text-gray-900' },
          { label: 'Delivered', value: stats.delivered, cls: 'text-green-600' },
          { label: 'Failed',    value: stats.failed,    cls: 'text-red-600' },
          { label: 'Pending',   value: stats.pending,   cls: 'text-gray-500' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'delivered', 'failed', 'pending'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Receipt list */}
      <div className="bg-white border border-gray-100 rounded-xl px-4">
        {filtered.length > 0 ? (
          filtered.map((r) => <ReceiptRow key={r.id} receipt={r} />)
        ) : (
          <div className="py-12 text-center">
            <BellIcon className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No receipts yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   NotificationSettingsScreen
════════════════════════════════════════════ */

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export const NotificationSettingsScreen: React.FC = () => {
  const { prefs, loading, pushPermission, savePrefs, requestPushPermission } = useNotifications();
  const [form, setForm] = useState(prefs);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); await savePrefs(form); }}
      className="space-y-6 max-w-2xl mx-auto pb-10"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure how you and your contacts are reached.</p>
      </div>

      {/* Push */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <DevicePhoneMobileIcon className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Push notifications</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable push</p>
            <p className="text-xs text-gray-500">Instant on-device alerts</p>
          </div>
          <Toggle checked={form.pushEnabled} onChange={(v) => set('pushEnabled', v)} />
        </div>

        {pushPermission !== 'granted' && (
          <button
            type="button"
            onClick={requestPushPermission}
            className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors"
          >
            {pushPermission === 'denied' ? 'Push denied — enable in browser settings' : 'Grant push permission'}
          </button>
        )}

        {pushPermission === 'granted' && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircleIcon className="h-4 w-4" />
            Push notifications granted
          </div>
        )}
      </div>

      {/* SMS */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <PhoneIcon className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">SMS</h2>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Enable SMS</p>
          <Toggle checked={form.smsEnabled} onChange={(v) => set('smsEnabled', v)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
          <input
            type="tel"
            value={form.smsPhoneNumber}
            onChange={(e) => set('smsPhoneNumber', e.target.value)}
            placeholder="+1 555 000 0000"
            disabled={!form.smsEnabled}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">SMS fallback on push fail</p>
            <p className="text-xs text-gray-500">Automatically send SMS if push doesn't deliver</p>
          </div>
          <Toggle checked={form.smsFallbackOnPushFail} onChange={(v) => set('smsFallbackOnPushFail', v)} />
        </div>
      </div>

      {/* Email */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <EnvelopeIcon className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Email</h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Enable email</p>
          <Toggle checked={form.emailEnabled} onChange={(v) => set('emailEnabled', v)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
          <input
            type="email"
            value={form.emailAddress}
            onChange={(e) => set('emailAddress', e.target.value)}
            placeholder="driver@example.com"
            disabled={!form.emailEnabled}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          />
        </div>
      </div>

      {/* Quiet hours */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Quiet hours</p>
            <p className="text-xs text-gray-500">Suppress non-emergency alerts during these hours</p>
          </div>
          <Toggle checked={form.quietHoursEnabled} onChange={(v) => set('quietHoursEnabled', v)} />
        </div>
        {form.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="time"
                value={form.quietHoursStart}
                onChange={(e) => set('quietHoursStart', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Until</label>
              <input
                type="time"
                value={form.quietHoursEnd}
                onChange={(e) => set('quietHoursEnd', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save notification settings'}
      </button>
    </form>
  );
};

export default NotificationSettingsScreen;
