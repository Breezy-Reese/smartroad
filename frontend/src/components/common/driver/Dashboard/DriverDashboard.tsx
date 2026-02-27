import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../../../hooks/useAuth";
import { useEmergency } from "../../../../hooks/useEmergency";
import { useLocation } from "../../../../hooks/useLocation";
import { useSocket } from "../../../../hooks/useSocket";
import EmergencyButton from "../../Buttons/EmergencyButton";
import StatsCard from "../../Cards/StatsCard";
import ConfirmModal from "../../Modals/ConfirmModal";
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
  const { isEmergencyActive, currentIncident, triggerEmergency, cancelEmergency, loading } = useEmergency();
  const { location, startWatching, stopWatching, isWatching } = useLocation();
  const { connected, emit } = useSocket();
  const navigate = useNavigate();
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [tripStats, setTripStats] = useState({
    todayTrips: 0,
    totalDistance: 0,
    drivingHours: 0,
    safetyScore: 98,
  });

  useEffect(() => {
    // Start location tracking
    startWatching();

    // Send location updates via socket
    if (connected && location) {
      emit('location-update', {
        driverId: user?._id || '',
        ...location,
        driverName: user?.name,
        status: 'driving',
      });
    }

    return () => {
      stopWatching();
    };
  }, [connected, location, user]);

  const handleEmergency = async () => {
    await triggerEmergency();
  };

  const handleCancelEmergency = async () => {
    await cancelEmergency();
    setShowCancelModal(false);
    toast.success('Emergency cancelled');
  };

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
                <p className="font-mono">{currentIncident.incidentId.slice(-8)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Severity</p>
                <p className="font-bold capitalize text-red-600">{currentIncident.severity}</p>
              </div>
            </div>

            {currentIncident.responders && currentIncident.responders.length > 0 ? (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Responders En Route:</h3>
                <div className="space-y-2">
                  {currentIncident.responders.map((responder) => (
                    <div key={responder.id} className="bg-green-50 p-3 rounded-lg flex justify-between">
                      <span className="font-medium">{responder.name}</span>
                      <span className="text-green-600">ETA: {responder.eta} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="animate-pulse flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
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

          <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="font-semibold mb-4">Safety Instructions:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                <span>Stay calm and remain in a safe location</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                <span>Keep your hazard lights on</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                <span>Do not move if you're injured</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                <span>Help will arrive shortly</span>
              </li>
            </ul>
          </div>
        </div>

        <ConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelEmergency}
          title="Cancel Emergency"
          message="Are you sure you want to cancel this emergency? This should only be done if it's a false alarm."
          confirmText="Yes, Cancel"
          cancelText="No, Keep Active"
          type="warning"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Current Location */}
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
              Accuracy: ±{location.accuracy?.toFixed(0)}m | Speed: {location.speed?.toFixed(1)} km/h
            </p>
          </div>
        )}
      </div>

      {/* Emergency Button */}
      <div className="bg-white rounded-lg shadow-lg p-8 flex justify-center">
        <EmergencyButton
          onClick={handleEmergency}
          loading={loading}
          size="lg"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Trips"
          value={tripStats.todayTrips}
          icon={TruckIcon}
          color="info"
          trend={{ value: 12, label: 'vs yesterday', positive: true }}
        />
        <StatsCard
          title="Total Distance"
          value={`${tripStats.totalDistance} km`}
          icon={MapPinIcon}
          color="success"
          trend={{ value: 8, label: 'vs yesterday', positive: true }}
        />
        <StatsCard
          title="Driving Hours"
          value={`${tripStats.drivingHours}h`}
          icon={ClockIcon}
          color="warning"
        />
        <StatsCard
          title="Safety Score"
          value={`${tripStats.safetyScore}%`}
          icon={UserGroupIcon}
          color="emergency"
          trend={{ value: 2, label: 'vs average', positive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/driver/trips')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <TruckIcon className="h-6 w-6 mx-auto mb-2 text-emergency-600" />
            <span className="text-sm font-medium">View Trips</span>
          </button>
          <button
            onClick={() => navigate('/driver/contacts')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <UserGroupIcon className="h-6 w-6 mx-auto mb-2 text-emergency-600" />
            <span className="text-sm font-medium">Emergency Contacts</span>
          </button>
          <button
            onClick={() => navigate('/driver/profile')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <MapPinIcon className="h-6 w-6 mx-auto mb-2 text-emergency-600" />
            <span className="text-sm font-medium">Update Profile</span>
          </button>
          <button
            onClick={() => navigate('/driver/safety')}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-2 text-emergency-600" />
            <span className="text-sm font-medium">Safety Tips</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Trip to CBD</p>
              <p className="text-sm text-gray-500">Today, 09:30 AM</p>
            </div>
            <span className="text-green-600 text-sm">Completed</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Trip to Westlands</p>
              <p className="text-sm text-gray-500">Yesterday, 02:15 PM</p>
            </div>
            <span className="text-green-600 text-sm">Completed</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Trip to Airport</p>
              <p className="text-sm text-gray-500">Yesterday, 10:00 AM</p>
            </div>
            <span className="text-green-600 text-sm">Completed</span>
          </div>
        </div>
      </div>

      {/* Safety Tips */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 className="font-medium text-green-800 mb-2">🛡️ Safety Tips</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Keep your emergency contacts updated</li>
          <li>• Ensure GPS is always on while driving</li>
          <li>• In case of emergency, press the red button</li>
          <li>• Take breaks every 2 hours to avoid fatigue</li>
        </ul>
      </div>
    </div>
  );
};

export default DriverDashboard;