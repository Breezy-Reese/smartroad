import React, { useState } from 'react';
import { useEscalation, DEFAULT_POLICY } from '../../../hooks/useEscalation';
import { EscalationStep, NotificationChannel, EscalationLevel } from '../../../types/notification.types';
import {
  BoltIcon,
  ClockIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  push: 'Push', sms: 'SMS', call: 'Call', email: 'Email',
};

const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  push:  'bg-blue-100 text-blue-700',
  sms:   'bg-green-100 text-green-700',
  call:  'bg-purple-100 text-purple-700',
  email: 'bg-orange-100 text-orange-700',
};

const LEVEL_COLORS: Record<EscalationLevel, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  2: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  3: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
};

const RECIPIENT_LABELS: Record<string, string> = {
  primary_kin:   'Primary contact (1st)',
  secondary_kin: 'Secondary contact (2nd)',
  all_kin:       'All contacts',
  fleet_manager: 'Fleet manager',
};

const formatDelay = (seconds: number) => {
  if (seconds === 0) return 'Immediately';
  if (seconds < 60) return `After ${seconds}s`;
  return `After ${seconds / 60} min`;
};

/* ── Step editor ── */
const StepEditor: React.FC<{
  step: EscalationStep;
  onChange: (updated: EscalationStep) => void;
}> = ({ step, onChange }) => {
  const c = LEVEL_COLORS[step.level];
  const allChannels: NotificationChannel[] = ['push', 'sms', 'call', 'email'];
  const allRecipients = ['primary_kin', 'secondary_kin', 'all_kin', 'fleet_manager'];

  const toggleChannel = (ch: NotificationChannel) =>
    onChange({
      ...step,
      channels: step.channels.includes(ch)
        ? step.channels.filter((c) => c !== ch)
        : [...step.channels, ch],
    });

  const toggleRecipient = (r: string) =>
    onChange({
      ...step,
      recipients: step.recipients.includes(r)
        ? step.recipients.filter((x) => x !== r)
        : [...step.recipients, r],
    });

  return (
    <div className={`border rounded-xl p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
          Level {step.level}
        </span>
        <div className="flex items-center gap-1 text-sm text-gray-600 ml-auto">
          <ClockIcon className="h-4 w-4" />
          <span>{formatDelay(step.delaySeconds)}</span>
        </div>
      </div>

      {/* Delay slider */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Trigger delay — {formatDelay(step.delaySeconds)}
        </label>
        <input
          type="range"
          min={0} max={600} step={30}
          value={step.delaySeconds}
          disabled={step.level === 1}
          onChange={(e) => onChange({ ...step, delaySeconds: Number(e.target.value) })}
          className="w-full disabled:opacity-40"
        />
        {step.level === 1 && (
          <p className="text-xs text-gray-400 mt-1">Level 1 always fires immediately.</p>
        )}
      </div>

      {/* Recipients */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">Notify</label>
        <div className="flex flex-wrap gap-2">
          {allRecipients.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleRecipient(r)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                step.recipients.includes(r)
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {RECIPIENT_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Via</label>
        <div className="flex gap-2 flex-wrap">
          {allChannels.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                step.channels.includes(ch)
                  ? `${CHANNEL_COLORS[ch]} border-transparent`
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >
              {CHANNEL_LABELS[ch]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Main screen ── */
const EscalationPolicyScreen: React.FC = () => {
  const { policy, updatePolicy } = useEscalation();
  const [steps, setSteps] = useState(policy.steps);
  const [saved, setSaved] = useState(false);

  const updateStep = (index: number, updated: EscalationStep) =>
    setSteps((prev) => prev.map((s, i) => i === index ? updated : s));

  const handleSave = () => {
    updatePolicy({ ...policy, steps });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSteps(DEFAULT_POLICY.steps);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Escalation policy</h1>
        <p className="text-sm text-gray-500 mt-1">
          Defines how notifications escalate if the emergency is not acknowledged.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Escalation flow</p>
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((step, i) => (
            <React.Fragment key={step.level}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${LEVEL_COLORS[step.level].bg} ${LEVEL_COLORS[step.level].border}`}>
                <BoltIcon className={`h-4 w-4 ${LEVEL_COLORS[step.level].text}`} />
                <span className={`font-medium ${LEVEL_COLORS[step.level].text}`}>
                  L{step.level} — {formatDelay(step.delaySeconds)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
          <ChevronRightIcon className="h-4 w-4 text-gray-300 flex-shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm">
            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Resolved</span>
          </div>
        </div>
      </div>

      {/* Step editors */}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <StepEditor key={step.level} step={step} onChange={(u) => updateStep(i, u)} />
        ))}
      </div>

      {/* SMS fallback note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>SMS fallback:</strong> If a push notification fails to deliver, the system automatically retries via SMS. This happens at every level regardless of channel settings.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Reset to default
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saved ? '✓ Saved' : 'Save policy'}
        </button>
      </div>
    </div>
  );
};

export default EscalationPolicyScreen;
