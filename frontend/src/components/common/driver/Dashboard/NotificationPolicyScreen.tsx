import React, { useState } from 'react';
import { useNotification } from '../../../../hooks/useNotification';
import { DevicePhoneMobileIcon, PhoneIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const NotificationSettingsScreen: React.FC = () => {
  const { prefs, loading, pushPermission, savePrefs, requestPushPermission } = useNotification();
  const [form, setForm] = useState(prefs);
  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <form onSubmit={async (e) => { e.preventDefault(); await savePrefs(form); }} className="space-y-5 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure how you and your contacts are reached.</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1"><DevicePhoneMobileIcon className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Push</h2></div>
        <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-900">Enable push</p><p className="text-xs text-gray-500">Instant on-device alerts</p></div><Toggle checked={form.pushEnabled} onChange={(v) => set('pushEnabled', v)} /></div>
        {pushPermission !== 'granted' && (
          <button type="button" onClick={requestPushPermission} className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors">
            {pushPermission === 'denied' ? 'Push denied — enable in browser settings' : 'Grant push permission'}
          </button>
        )}
        {pushPermission === 'granted' && <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg"><CheckCircleIcon className="h-4 w-4" />Push notifications granted</div>}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1"><PhoneIcon className="h-4 w-4 text-green-600" /><h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">SMS</h2></div>
        <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-900">Enable SMS</p><Toggle checked={form.smsEnabled} onChange={(v) => set('smsEnabled', v)} /></div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
          <input type="tel" value={form.smsPhoneNumber} onChange={(e) => set('smsPhoneNumber', e.target.value)} placeholder="+254 700 000 000" disabled={!form.smsEnabled}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" />
        </div>
        <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-900">SMS fallback on push fail</p><p className="text-xs text-gray-500">Auto-send SMS if push doesn't deliver</p></div><Toggle checked={form.smsFallbackOnPushFail} onChange={(v) => set('smsFallbackOnPushFail', v)} /></div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1"><EnvelopeIcon className="h-4 w-4 text-orange-500" /><h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Email</h2></div>
        <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-900">Enable email</p><Toggle checked={form.emailEnabled} onChange={(v) => set('emailEnabled', v)} /></div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
          <input type="email" value={form.emailAddress} onChange={(e) => set('emailAddress', e.target.value)} placeholder="driver@example.com" disabled={!form.emailEnabled}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
        {loading ? 'Saving…' : 'Save notification settings'}
      </button>
    </form>
  );
};

export default NotificationSettingsScreen;
