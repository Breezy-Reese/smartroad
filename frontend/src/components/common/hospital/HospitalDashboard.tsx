import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useSocket } from '../../../hooks/useSocket';
import { emergencyService } from '../../../services/api/emergency.service';
import { hospitalService } from '../../../services/api/hospital.service';
import IncidentCard from '../Cards/IncidentCard';
import StatsCard from '../Cards/StatsCard';
import IncidentMap from '../Maps/IncidentMap';
import BedTracker from './BedTracker';
import ShiftManager from './ShiftManager';
import ETACountdown from './ETACountdown';
import {
  TruckIcon,
  UserGroupIcon,
  ClockIcon,
  BellIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { Incident } from '../../../types/emergency.types';
import { toast } from 'react-hot-toast';

const HospitalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, connected, on, off } = useSocket();
  const navigate = useNavigate();

  const [incidents, setIncidents]               = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [stats, setStats] = useState({
    totalIncidents:      0,
    activeIncidents:     0,
    pendingIncidents:    0,
    availableAmbulances: 0,
    totalAmbulances:     0,
    activeResponders:    0,
    avgResponseTime:     0,
  });

  useEffect(() => {
    fetchIncidents();
    fetchHospitalStats();

    if (socket && connected) {
      on('new-incident',     handleNewIncident);
      on('incident-update',  handleIncidentUpdate);
    }

    return () => {
      off('new-incident',    handleNewIncident);
      off('incident-update', handleIncidentUpdate);
    };
  }, [socket, connected]);

  const fetchIncidents = async () => {
    try {
      const list = await emergencyService.getActiveIncidents({});
      setIncidents(list);
      setStats(prev => ({
        ...prev,
        totalIncidents:   list.length,
        activeIncidents:  list.filter((i: Incident) => ['assigned','responding','dispatched'].includes(i.status)).length,
        pendingIncidents: list.filter((i: Incident) => ['pending','reported'].includes(i.status)).length,
      }));
    } catch {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalStats = async () => {
    try {
      const data = await hospitalService.getHospitalStats();
      setStats(prev => ({
        ...prev,
        availableAmbulances: data.availableAmbulances ?? 0,
        totalAmbulances:     data.totalAmbulances ?? 0,
        activeResponders:    data.availableResponders ?? 0,
        avgResponseTime:     Math.round(data.averageResponseTime ?? 0),
      }));
    } catch (error) {
      console.error('Failed to fetch hospital stats:', error);
    }
  };

  const handleNewIncident = (incident: Incident) => {
    setIncidents(prev => [incident, ...prev]);
    setStats(prev => ({
      ...prev,
      totalIncidents:   prev.totalIncidents + 1,
      pendingIncidents: prev.pendingIncidents + 1,
    }));
    toast.error(
      `🚨 New accident reported at ${incident.timestamp && new Date(incident.timestamp).toLocaleTimeString()}`,
      { duration: 0, icon: '🚨' }
    );
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const handleIncidentUpdate = (updatedIncident: Incident) => {
    setIncidents(prev =>
      prev.map(inc => inc._id === updatedIncident._id ? updatedIncident : inc)
    );
  };

  const handleAcceptIncident = async (incidentId: string) => {
    try {
      await emergencyService.acceptIncident(incidentId, user?._id || '', 'responder1', 10);
      toast.success('Incident accepted. Dispatching ambulance...');
      fetchIncidents();
      fetchHospitalStats();
    } catch {
      toast.error('Failed to accept incident');
    }
  };

  // Active incidents = those with a responder dispatched
  const activeIncidents = incidents.filter(i =>
    ['assigned', 'responding', 'dispatched'].includes(i.status)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emergency-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hospital Emergency Dashboard</h1>
            <p className="text-gray-600 mt-1">{(user as any)?.hospitalName || 'City General Hospital'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">{connected ? 'Live' : 'Disconnected'}</span>
            </div>
            <button
              onClick={() => navigate('/hospital/incidents')}
              className="bg-emergency-600 text-white px-4 py-2 rounded-lg hover:bg-emergency-700"
            >
              View All Incidents
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard title="Total Incidents"  value={stats.totalIncidents}      icon={BellIcon}         color="emergency" />
        <StatsCard title="Active"           value={stats.activeIncidents}     icon={TruckIcon}        color="warning"   />
        <StatsCard title="Pending"          value={stats.pendingIncidents}    icon={ClockIcon}        color="info"      />
        <StatsCard title="Ambulances"       value={stats.availableAmbulances} icon={TruckIcon}        color="success"
          trend={{ value: stats.totalAmbulances, label: 'total', positive: true }} />
        <StatsCard title="Responders"       value={stats.activeResponders}    icon={UserGroupIcon}    color="hospital"  />
        <StatsCard title="Avg Response"     value={`${stats.avgResponseTime} min`} icon={ClockIcon}  color="warning"   />
      </div>

      {/* ── ETA Countdowns (only when there are active incidents) ── */}
      {activeIncidents.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ambulances En Route
            <span className="ml-2 text-sm font-normal text-gray-500">({activeIncidents.length} active)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeIncidents.map(incident => {
              const responder = incident.responders?.[0] as any;
              return (
                <div key={incident._id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-gray-500">
                      #{incident.incidentId?.slice(-6) ?? incident._id?.slice(-6)}
                    </span>
                    <span className="text-xs capitalize text-gray-600 font-medium">
                      {incident.severity}
                    </span>
                  </div>
                  <ETACountdown
                    etaMinutes={responder?.eta ?? 8}
                    dispatchedAt={responder?.dispatchedAt ?? incident.timestamp ?? new Date()}
                    incidentId={incident._id}
                    responderName={responder?.name}
                  />
                  {incident.locationAddress && (
                    <p className="text-xs text-gray-400 mt-2 truncate">{incident.locationAddress}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bed Tracker + Shift Manager (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BedTracker hospitalId={(user as any)?._id} />
        <ShiftManager hospitalId={(user as any)?._id} />
      </div>

      {/* ── Live Map ── */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Live Incidents Map</h2>
        <IncidentMap
          incidents={incidents}
          onMarkerClick={setSelectedIncident}
          selectedIncident={selectedIncident}
          showRadius={true}
          radius={10}
          showHotspots={true}
        />
      </div>

      {/* ── Active Incidents ── */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Active Incidents</h2>
          <span className="bg-emergency-100 text-emergency-800 text-sm px-3 py-1 rounded-full">
            {incidents.length} active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {incidents.slice(0, 4).map(incident => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              onAccept={handleAcceptIncident}
              showActions={true}
            />
          ))}
        </div>

        {incidents.length > 4 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/hospital/incidents')}
              className="text-emergency-600 hover:text-emergency-700 font-medium"
            >
              View all {incidents.length} incidents →
            </button>
          </div>
        )}

        {incidents.length === 0 && (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Incidents</h3>
            <p className="text-gray-500">
              The dashboard will update in real-time when new incidents occur.
            </p>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => navigate('/hospital/ambulances')} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-left">
          <TruckIcon className="h-8 w-8 text-emergency-600 mb-3" />
          <h3 className="font-semibold mb-1">Manage Ambulances</h3>
          <p className="text-sm text-gray-600">Track and dispatch ambulances</p>
        </button>
        <button onClick={() => navigate('/hospital/responders')} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-left">
          <UserGroupIcon className="h-8 w-8 text-emergency-600 mb-3" />
          <h3 className="font-semibold mb-1">Responder Team</h3>
          <p className="text-sm text-gray-600">View and manage responders</p>
        </button>
        <button onClick={() => navigate('/hospital/analytics')} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-left">
          <BuildingOfficeIcon className="h-8 w-8 text-emergency-600 mb-3" />
          <h3 className="font-semibold mb-1">Analytics & Reports</h3>
          <p className="text-sm text-gray-600">View performance metrics</p>
        </button>
      </div>

    </div>
  );
};

export default HospitalDashboard;
