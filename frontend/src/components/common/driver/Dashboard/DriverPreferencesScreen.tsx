import React, { useState } from 'react';
import { useDriverPreferences, DriverPreferences } from '../../../../hooks/useDriverPreferences';
import {
  BellIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

/* ── Toggle switch ── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      ${checked ? 'bg-blue-600' : 'bg-gray-200'}
    `}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

/* ── Setting row ── */
const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div className="flex-1 mr-4">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

/* ── Section ── */
const Section: React.FC<{
  title: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="bg-blue-50 p-2 rounded-lg">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h2>
    </div>
    {children}
  </div>
);

/* ── Select field ── */
const SelectField: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <p className="text-sm font-medium text-gray-900">{label}</p>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

/* ── Main screen ── */
const DriverPreferencesScreen: React.FC = () => {
  const { preferences, loading, savePreferences, resetToDefaults } = useDriverPreferences();
  const [form, setForm] = useState<DriverPreferences>(preferences);

  const set = <K extends keyof DriverPreferences>(key: K, value: DriverPreferences[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePreferences(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">Customize how the app behaves for you.</p>
      </div>

      {/* Units & language */}
      <Section title="Region & units" icon={GlobeAltIcon}>
        <SelectField
          label="Language"
          value={form.language}
          onChange={(v) => set('language', v)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'sw', label: 'Swahili' },
            { value: 'fr', label: 'French' },
            { value: 'ar', label: 'Arabic' },
          ]}
        />
        <SelectField
          label="Distance unit"
          value={form.distanceUnit}
          onChange={(v) => set('distanceUnit', v as DriverPreferences['distanceUnit'])}
          options={[{ value: 'km', label: 'Kilometres (km)' }, { value: 'miles', label: 'Miles' }]}
        />
        <SelectField
          label="Speed unit"
          value={form.speedUnit}
          onChange={(v) => set('speedUnit', v as DriverPreferences['speedUnit'])}
          options={[{ value: 'km/h', label: 'km/h' }, { value: 'mph', label: 'mph' }]}
        />
        <SelectField
          label="Appearance"
          value={form.darkMode}
          onChange={(v) => set('darkMode', v as DriverPreferences['darkMode'])}
          options={[
            { value: 'auto', label: 'Auto (system)' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Section>

      {/* Alerts */}
      <Section title="Alerts & notifications" icon={BellIcon}>
        <ToggleRow
          label="Push notifications"
          description="Receive alerts on your device"
          checked={form.notificationsEnabled}
          onChange={(v) => set('notificationsEnabled', v)}
        />
        <ToggleRow
          label="Sound alerts"
          checked={form.soundAlerts}
          onChange={(v) => set('soundAlerts', v)}
        />
        <ToggleRow
          label="Vibration alerts"
          checked={form.vibrationAlerts}
          onChange={(v) => set('vibrationAlerts', v)}
        />
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Emergency countdown</p>
            <p className="text-xs text-gray-500">Seconds before SOS fires automatically</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5} max={30} step={5}
              value={form.emergencyCountdownSeconds}
              onChange={(e) => set('emergencyCountdownSeconds', Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm font-semibold text-gray-900 min-w-[28px] text-right">
              {form.emergencyCountdownSeconds}s
            </span>
          </div>
        </div>
      </Section>

      {/* Privacy */}
      <Section title="Privacy & safety" icon={ShieldCheckIcon}>
        <ToggleRow
          label="Share location with fleet"
          description="Fleet managers can see your real-time location"
          checked={form.shareLocationWithFleet}
          onChange={(v) => set('shareLocationWithFleet', v)}
        />
        <ToggleRow
          label="Auto-start trip on drive"
          description="Detect driving and start a trip automatically"
          checked={form.autoStartTrip}
          onChange={(v) => set('autoStartTrip', v)}
        />
      </Section>

      {/* Trip scoring */}
      <Section title="Trip behaviour" icon={AdjustmentsHorizontalIcon}>
        <ToggleRow
          label="Auto-start trip on drive"
          description="Uses motion detection to begin scoring"
          checked={form.autoStartTrip}
          onChange={(v) => set('autoStartTrip', v)}
        />
      </Section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetToDefaults}
          disabled={loading}
          className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Reset to defaults
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </form>
  );
};

export default DriverPreferencesScreen;
