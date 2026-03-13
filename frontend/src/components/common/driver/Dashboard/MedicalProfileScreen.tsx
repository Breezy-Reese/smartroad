import React, { useState } from 'react';
import { useMedicalProfile, MedicalProfile } from '../../../hooks/useMedicalProfile';
import {
  HeartIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

/* ── Small reusable tag list editor ── */
const TagListEditor: React.FC<{
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}> = ({ label, items, placeholder, onChange }) => {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setInput('');
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={add}
          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
            {item}
            <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 ml-1">
              <TrashIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400">None added</p>}
      </div>
    </div>
  );
};

/* ── Section wrapper ── */
const Section: React.FC<{ title: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; children: React.ReactNode }> = ({
  title, icon: Icon, children,
}) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
    <div className="flex items-center gap-2 mb-5">
      <div className="bg-blue-50 p-2 rounded-lg">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

/* ── Main screen ── */
const MedicalProfileScreen: React.FC = () => {
  const { profile, loading, saveProfile } = useMedicalProfile();
  const [form, setForm] = useState<MedicalProfile>(profile);

  const set = <K extends keyof MedicalProfile>(key: K, value: MedicalProfile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setContact = (key: keyof MedicalProfile['emergencyContact'], value: string) =>
    setForm((prev) => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [key]: value } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medical Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Shared with emergency responders when an SOS is triggered.
        </p>
      </div>

      {/* Basic medical info */}
      <Section title="Medical information" icon={HeartIcon}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood type</label>
          <select
            value={form.bloodType}
            onChange={(e) => set('bloodType', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select blood type</option>
            {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <TagListEditor
          label="Allergies"
          items={form.allergies}
          placeholder="e.g. Penicillin"
          onChange={(v) => set('allergies', v)}
        />
        <TagListEditor
          label="Medical conditions"
          items={form.conditions}
          placeholder="e.g. Diabetes"
          onChange={(v) => set('conditions', v)}
        />
        <TagListEditor
          label="Current medications"
          items={form.medications}
          placeholder="e.g. Metformin 500mg"
          onChange={(v) => set('medications', v)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any other information paramedics should know…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </Section>

      {/* Emergency contact */}
      <Section title="Emergency contact" icon={UserIcon}>
        {(['name', 'relationship', 'phone'] as const).map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
            <input
              type={field === 'phone' ? 'tel' : 'text'}
              value={form.emergencyContact[field]}
              onChange={(e) => setContact(field, e.target.value)}
              placeholder={field === 'name' ? 'Full name' : field === 'relationship' ? 'e.g. Spouse' : '+1 555 000 0000'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </Section>

      {/* Doctor */}
      <Section title="Primary doctor" icon={PhoneIcon}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor name</label>
          <input
            type="text"
            value={form.doctorName}
            onChange={(e) => set('doctorName', e.target.value)}
            placeholder="Dr. Jane Smith"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor phone</label>
          <input
            type="tel"
            value={form.doctorPhone}
            onChange={(e) => set('doctorPhone', e.target.value)}
            placeholder="+1 555 000 0000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Section>

      {/* Save */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {loading ? 'Saving…' : 'Save medical profile'}
      </button>
    </form>
  );
};

export default MedicalProfileScreen;
