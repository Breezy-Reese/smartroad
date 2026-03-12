import React, { useState, useEffect } from 'react';
import { BuildingOfficeIcon, PhoneIcon, BellIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../hooks/useAuth';
import axiosInstance from '../../../../services/api/axiosInstance';

type Tab = 'profile' | 'contact' | 'notifications' | 'password';

const HospitalProfile: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ hospitalName: '', address: '', registrationNumber: '' });
  const [contact, setContact] = useState({ contactNumber: '', emergencyContact: '', email: '' });
  const [notifications, setNotifications] = useState({
    newIncident: true, incidentUpdate: true, responderDispatch: true, emailAlerts: false, smsAlerts: true,
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setProfile({
        hospitalName: (user as any).hospitalName || '',
        address: (user as any).address || '',
        registrationNumber: (user as any).registrationNumber || '',
      });
      setContact({
        contactNumber: (user as any).contactNumber || '',
        emergencyContact: (user as any).emergencyContact || '',
        email: (user as any).email || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/users/profile', profile);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/users/profile', contact);
      toast.success('Contact info updated!');
    } catch { toast.error('Failed to update contact info'); }
    finally { setSaving(false); }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/users/notifications', notifications);
      toast.success('Preferences saved!');
    } catch { toast.error('Failed to save preferences'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwords.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await axiosInstance.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Hospital Profile', icon: BuildingOfficeIcon },
    { id: 'contact', label: 'Contact Info', icon: PhoneIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'password', label: 'Change Password', icon: LockClosedIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your hospital profile and preferences</p>
      </div>

      <div className="flex space-x-6">
        {/* Tab Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeTab === tab.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon className="h-5 w-5" /><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow-lg p-6">

          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Hospital Profile</h2>
              {[
                { label: 'Hospital Name', key: 'hospitalName', value: profile.hospitalName },
                { label: 'Registration Number', key: 'registrationNumber', value: profile.registrationNumber },
                { label: 'Address', key: 'address', value: profile.address },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="text" value={f.value} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
              <button onClick={handleSaveProfile} disabled={saving} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Contact Information</h2>
              {[
                { label: 'Email Address', key: 'email', type: 'email', value: contact.email },
                { label: 'Contact Number', key: 'contactNumber', type: 'tel', value: contact.contactNumber },
                { label: 'Emergency Contact', key: 'emergencyContact', type: 'tel', value: contact.emergencyContact },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => setContact(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
              <button onClick={handleSaveContact} disabled={saving} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { key: 'newIncident', label: 'New Incident Alerts', desc: 'Get notified when a new incident is reported' },
                  { key: 'incidentUpdate', label: 'Incident Updates', desc: 'Get notified when incident status changes' },
                  { key: 'responderDispatch', label: 'Responder Dispatch', desc: 'Get notified when a responder is dispatched' },
                  { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive alerts via email' },
                  { key: 'smsAlerts', label: 'SMS Alerts', desc: 'Receive alerts via SMS' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-red-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveNotifications} disabled={saving} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Preferences'}</button>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Change Password</h2>
              {[
                { label: 'Current Password', key: 'currentPassword', value: passwords.currentPassword },
                { label: 'New Password', key: 'newPassword', value: passwords.newPassword },
                { label: 'Confirm New Password', key: 'confirmPassword', value: passwords.confirmPassword },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="password" value={f.value} onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
              {passwords.newPassword && passwords.confirmPassword && (
                <div className={`flex items-center space-x-2 text-sm ${passwords.newPassword === passwords.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{passwords.newPassword === passwords.confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
              <p className="text-xs text-gray-500">Min 8 characters with uppercase, lowercase, number and special character</p>
              <button onClick={handleChangePassword} disabled={saving} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Changing...' : 'Change Password'}</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HospitalProfile;
