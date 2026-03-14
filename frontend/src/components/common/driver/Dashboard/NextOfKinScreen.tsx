import React, { useState } from 'react';
import { useNextOfKin } from '../../../../hooks/useNextOfKin';
import { NotificationChannel } from '../../../../types/notification.types';
import { UserPlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const CHANNELS: { value: NotificationChannel; label: string }[] = [
  { value: 'push', label: 'Push' }, { value: 'sms', label: 'SMS' },
  { value: 'call', label: 'Call' }, { value: 'email', label: 'Email' },
];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Manager', 'Other'];
const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  push: 'bg-blue-100 text-blue-700', sms: 'bg-green-100 text-green-700',
  call: 'bg-purple-100 text-purple-700', email: 'bg-orange-100 text-orange-700',
};

type FormData = { name: string; phone: string; email?: string; relationship: string; channels: NotificationChannel[]; isPrimary: boolean; };
const EMPTY: FormData = { name: '', phone: '', email: '', relationship: 'Spouse', channels: ['push', 'sms'], isPrimary: false };

const ContactForm: React.FC<{ initial?: FormData; onSave: (d: FormData) => void; onCancel: () => void; loading: boolean }> = ({ initial = EMPTY, onSave, onCancel, loading }) => {
  const [form, setForm] = useState<FormData>(initial);
  const toggle = (ch: NotificationChannel) => setForm((p) => ({ ...p, channels: p.channels.includes(ch) ? p.channels.filter((c) => c !== ch) : [...p.channels, ch] }));
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(['name', 'phone'] as const).map((f) => (
          <div key={f}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{f} *</label>
            <input value={form[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
              placeholder={f === 'phone' ? '+254 700 000 000' : 'Full name'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
          <select value={form.relationship} onChange={(e) => setForm((p) => ({ ...p, relationship: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="jane@example.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Notify via</label>
        <div className="flex gap-2 flex-wrap">
          {CHANNELS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => toggle(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.channels.includes(value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={() => onSave(form)} disabled={!form.name || !form.phone || loading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
          {loading ? 'Saving…' : 'Save contact'}
        </button>
      </div>
    </div>
  );
};

const NextOfKinScreen: React.FC = () => {
  const { contacts, loading, addContact, updateContact, removeContact } = useNextOfKin();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Next of kin</h1>
          <p className="text-sm text-gray-500 mt-1">Notified in order when an SOS is triggered.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <UserPlusIcon className="h-4 w-4" /> Add contact
          </button>
        )}
      </div>

      {showForm && <ContactForm onSave={async (d) => { await addContact(d); setShowForm(false); }} onCancel={() => setShowForm(false)} loading={loading} />}

      <div className="space-y-3">
        {contacts.map((contact) =>
          editingId === contact._id ? (
            <ContactForm key={contact._id}
              initial={{ name: contact.name, phone: contact.phone, email: contact.email, relationship: contact.relationship, channels: contact.channels, isPrimary: contact.isPrimary ?? false }}
              onSave={async (d) => { await updateContact(contact._id, d); setEditingId(null); }}
              onCancel={() => setEditingId(null)} loading={loading} />
          ) : (
            <div key={contact._id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                    {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">#{contact.priority}</span>
                    </div>
                    <p className="text-xs text-gray-500">{contact.relationship} · {contact.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingId(contact._id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><PencilIcon className="h-4 w-4" /></button>
                  <button onClick={() => removeContact(contact._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {contact.channels.map((ch) => <span key={ch} className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[ch]}`}>{ch.toUpperCase()}</span>)}
              </div>
            </div>
          )
        )}
      </div>

      {contacts.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white border border-gray-100 rounded-xl">
          <UserPlusIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">No contacts added</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">Add at least one person to notify in emergencies.</p>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">Add first contact</button>
        </div>
      )}
    </div>
  );
};

export default NextOfKinScreen;
