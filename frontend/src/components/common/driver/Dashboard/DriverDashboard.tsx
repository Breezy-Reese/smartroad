import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { useEmergency } from '../../../../hooks/useEmergency';
import { useLocation } from '../../../../hooks/useLocation';
import { useSocket } from '../../../../hooks/useSocket';
import { ResponderInfo } from '../../../../types/emergency.types';

import EmergencyButton from '../../Buttons/EmergencyButton';
import StatsCard from '../../Cards/StatsCard';
import ConfirmModal from '../../Modals/ConfirmModal';
import FalseAlarmCountdown from '../../FalseAlarmCountdown';

import {
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { toast } from 'react-hot-toast';

const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    isEmergencyActive,
    currentIncident,
    triggerEmergency,
    cancelEmergency,
    loading,
  } = useEmergency();

  const { location, startWatching, stopWatching } = useLocation();
  const { connected, emit } = useSocket();
  const navigate = useNavigate();

  const [showCancelModal, setShowCancelModal]         = useState(false);
  // Controls whether the 10-second false alarm countdown is visible
  const [showCountdown, setShowCountdown]             = useState(false);

  const [tripStats] = useState({
    todayTrips:    0,
    totalDistance: 0,
    drivingHours:  0,
    safetyScore:   98,
  });

  /* ── Location watch ── */
  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, [startWatching, stopWatching]);

  /* ── Emit location over socket ── */
  useEffect(() => {
    if (!connected || !location || !user?._id) return;
    emit('location-update', {
      driverId:   user._id,
      ...location,
      driverName: user.name,
      status:     'driving',
    });
  }, [connected, location, user, emit]);

  /* ── Emergency button pressed → show countdown first ── */
  const handleEmergency = useCallback(() => {
    setShowCountdown(true);
  }, []);

  /* ── Countdown reached 0 → actually trigger the emergency ── */
  const handleCountdownConfirm = useCallback(async () => {
    setShowCountdown(false);
    await triggerEmergency();
  }, [triggerEmergency]);

  /* ── Driver cancelled within the window ── */
  const handleCountdownCancel = useCallback(() => {
    setShowCountdown(false);
    toast.success('False alarm cancelled — no alert sent', {
      icon: '✅',
      duration: 4000,
    });
  }, []);

  /* ── Cancel an already-active emergency ── */
  const handleCancelEmergency = async () => {
    await cancelEmergency();
    setShowCancelModal(false);
    toast.success('Emergency cancelled');
  };

  /* ═══════════════════════════════════════════
     EMERGENCY ACTIVE SCREEN
  ═══════════════════════════════════════════ */
  if (isEmergencyActive && currentIncident) {
    return (
      <div className="min-h-screen bg-red-600 p-6">
        <div className="max-w-4xl mx-auto">

          <div className="bg-white rounded-lg shadow-xl p-8 text-center mb-6">
            <div className="animate-pulse mb-4">
              <ExclamationTriangleIcon className="h-24 w-24 text-red-600 mx-auto" />
            </div>

            <h1 className="text-4xl font-bold text-red-600 mb-4">EMERGENCY ACTIVE</h1>
            <p className="text-gray-600 mb-6">
              Emergency services have been notified. Help is on the way.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Incident ID</p>
                <p className="font-mono">{currentIncident.incidentId?.slice(-8) ?? 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Severity</p>
                <p className="font-bold capitalize text-red-600">{currentIncident.severity}</p>
              </div>
            </div>

            {currentIncident.responders?.length ? (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Responders En Route:</h3>
                <div className="space-y-2">
                  {currentIncident.responders.map((responder: ResponderInfo) => (
                    <div key={responder.id} className="bg-green-50 p-3 rounded-lg flex justify-between">
                      <span className="font-medium">{responder.name}</span>
                      <span className="text-green-600">ETA: {responder.eta ?? '--'} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="animate-pulse flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                </div>
                <p className="text-gray-500 mt-2">Waiting for responders to accept...</p>
              </div>
            )}

            <button
              onClick={() => setShowCancelModal(true)}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel Emergency (False Alarm)
            </button>
          </div>

          <ConfirmModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancelEmergency}
            title="Cancel Emergency"
            message="Are you sure you want to cancel this emergency?"
            confirmText="Yes, Cancel"
            cancelText="No, Keep Active"
            type="warning"
          />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     NORMAL DASHBOARD
  ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* False alarm countdown overlay — shown before alert is sent */}
      {showCountdown && (
        <FalseAlarmCountdown
          onConfirm={handleCountdownConfirm}
          onCancel={handleCountdownCancel}
          seconds={10}
        />
      )}

      {/* HEADER */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name ?? 'Driver'}!
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {location && (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700">
              <MapPinIcon className="h-5 w-5" />
              <span className="font-medium">Current Location:</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 font-mono">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Accuracy: ±{location.accuracy?.toFixed(0) ?? '--'}m | Speed: {location.speed?.toFixed(1) ?? '--'} km/h
            </p>
          </div>
        )}
      </div>

      {/* EMERGENCY BUTTON */}
      <div className="bg-white rounded-lg shadow-lg p-8 flex justify-center">
        <EmergencyButton
          onClick={handleEmergency}
          loading={loading}
          size="lg"
        />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Today's Trips"   value={tripStats.todayTrips}              icon={TruckIcon}      color="info"      />
        <StatsCard title="Total Distance"  value={`${tripStats.totalDistance} km`}   icon={MapPinIcon}     color="success"   />
        <StatsCard title="Driving Hours"   value={`${tripStats.drivingHours}h`}      icon={ClockIcon}      color="warning"   />
        <StatsCard title="Safety Score"    value={`${tripStats.safetyScore}%`}       icon={UserGroupIcon}  color="emergency" />
      </div>

    </div>
  );
};

export default DriverDashboard;
