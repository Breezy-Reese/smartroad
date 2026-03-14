import React, { useState } from 'react';
import { useEscalation, DEFAULT_POLICY } from '../../../../hooks/useEscalation';
import { EscalationStep, NotificationChannel } from '../../../../types/notification.types';
import { BoltIcon, ClockIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const CHANNEL_LABELS: Record<NotificationChannel, string> = { push: 'Push', sms: 'SMS', call: 'Call', email: 'Email' };
const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  push: 'bg-blue-100 text-blue-700', sms: 'bg-green-100 text-green-700',
  call: 'bg-purple-100 text-purple-700', email: 'bg-orange-100 text-orange-700',
};
const LEVEL_BG: Record<number, string> = { 1: 'bg-green-50 border-green-200 text-green-700', 2: 'bg-amber-50 border-amber-200 text-amber-700', 3: 'bg-red-50 border-red-200 text-red-700' };
const formatDelay = (s: number) => s === 0 ? 'Immediately' : s < 60 ? `After ${s}s` : `After ${s / 60} min`;
const ALL_RECIPIENTS = ['primary_kin', 'secondary_kin', 'all_kin', 'fleet_manager'];
const RECIPIENT_LABELS: Record<string, string> = { primary_kin: 'Primary contact', secondary_kin: 'Secondary contact', all_kin: 'All contacts', fleet_manager: 'Fleet manager' };
const ALL_CHANNELS: NotificationChannel[] = ['push', 'sms', 'call', 'email'];

const EscalationPolicyScreen: React.FC = () => {
  const { policy, updatePolicy } = useEscalation();
  const [steps, setSteps] = useState(policy.steps);
  const [saved, setSaved] = useState(false);

  const updateStep = (i: number, updated: EscalationStep) =>
    setSteps((prev) => prev.map((s, idx) => idx === i ? updated : s));

  const handleSave = async () => {
    await updatePolicy({ ...policy, steps });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Escalation policy</h1>
        <p className="text-sm text-gray-500 mt-1">How notifications escalate if the emergency is not acknowledged.</p>
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.level} className={`border rounded-xl p-5 ${LEVEL_BG[step.level]}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${LEVEL_BG[step.level]}`}>Level {step.level}</span>
              <span className="text-sm text-gray-600 ml-auto">{formatDelay(step.delaySeconds)}</span>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">Trigger delay</label>
              <input type="range" min={0} max={600} step={30} value={step.delaySeconds} disabled={step.level === 1}
                onChange={(e) => updateStep(i, { ...step, delaySeconds: Number(e.target.value) })} className="w-full disabled:opacity-40" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">Notify</label>
              <div className="flex flex-wrap gap-2">
                {ALL_RECIPIENTS.map((r) => (
                  <button key={r} type="button"
                    onClick={() => updateStep(i, { ...step, recipients: step.recipients.includes(r) ? step.recipients.filter((x) => x !== r) : [...step.recipients, r] })}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${step.recipients.includes(r) ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {RECIPIENT_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Via</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_CHANNELS.map((ch) => (
                  <button key={ch} type="button"
                    onClick={() => updateStep(i, { ...step, channels: step.channels.includes(ch) ? step.channels.filter((c) => c !== ch) : [...step.channels, ch] })}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${step.channels.includes(ch) ? `${CHANNEL_COLORS[ch]} border-transparent` : 'bg-white text-gray-400 border-gray-200'}`}>
                    {CHANNEL_LABELS[ch]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => setSteps(DEFAULT_POLICY.steps)}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          Reset to default
        </button>
        <button type="button" onClick={handleSave}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          {saved ? '✓ Saved' : 'Save policy'}
        </button>
      </div>
    </div>
  );
};

export default EscalationPolicyScreen;
