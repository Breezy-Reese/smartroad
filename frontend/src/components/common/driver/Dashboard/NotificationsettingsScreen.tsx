import React, { useState } from "react";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: "trip_updates",
    label: "Trip Updates",
    description: "Receive notifications for trip assignments and status changes.",
    enabled: true,
  },
  {
    id: "delivery_receipts",
    label: "Delivery Receipts",
    description: "Get notified when a delivery is confirmed or rejected.",
    enabled: true,
  },
  {
    id: "escalations",
    label: "Escalation Alerts",
    description: "Receive alerts when an escalation policy is triggered.",
    enabled: true,
  },
  {
    id: "kin_alerts",
    label: "Next of Kin Alerts",
    description: "Notify your next of kin contacts during emergencies.",
    enabled: false,
  },
  {
    id: "reminders",
    label: "Reminders",
    description: "Daily reminders for scheduled trips and pending tasks.",
    enabled: false,
  },
  {
    id: "promotions",
    label: "Promotions & Announcements",
    description: "Stay updated on platform news and offers.",
    enabled: false,
  },
];

const NotificationSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setSaved(false);
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = () => {
    // TODO: persist settings via API
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage how and when you receive notifications.
          </p>
        </div>

        {/* Settings list */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {settings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">{setting.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
              </div>
              {/* Toggle */}
              <button
                role="switch"
                aria-checked={setting.enabled}
                onClick={() => toggle(setting.id)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  setting.enabled ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    setting.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors duration-150"
          >
            Save Preferences
          </button>
          {saved && (
            <p className="text-center text-sm text-green-600 mt-3 font-medium">
              ✓ Preferences saved successfully
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsScreen;
