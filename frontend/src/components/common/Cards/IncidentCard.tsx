import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Incident } from '../../../types/incident.types';
import {
  MapPinIcon,
  ClockIcon,
  UserIcon,
  TruckIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface IncidentCardProps {
  incident: Incident;
  onAccept?: (incidentId: string) => void;
  showActions?: boolean;
}

const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onAccept,
  showActions = true,
}) => {
  const navigate = useNavigate();

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
      fatal: 'bg-black text-white',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      detected: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-red-100 text-red-800',
      dispatched: 'bg-blue-100 text-blue-800',
      'en-route': 'bg-purple-100 text-purple-800',
      arrived: 'bg-green-100 text-green-800',
      treating: 'bg-teal-100 text-teal-800',
      transporting: 'bg-indigo-100 text-indigo-800',
      resolved: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    return new Date(date).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
              {incident.severity.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
              {incident.status.replace('-', ' ').toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            ID: {incident.incidentId.slice(-6)}
          </span>
        </div>

        {/* Location */}
        <div className="mb-4">
          <div className="flex items-start space-x-2 text-gray-600">
            <MapPinIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                Lat: {incident.location.lat.toFixed(6)}, Lng: {incident.location.lng.toFixed(6)}
              </p>
              {incident.locationAddress && (
                <p className="text-xs text-gray-500">{incident.locationAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <UserIcon className="h-4 w-4" />
            <span className="text-sm">{incident.driver?.name || 'Unknown'}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <TruckIcon className="h-4 w-4" />
            <span className="text-sm">{incident.vehicleNumber || 'N/A'}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <ClockIcon className="h-4 w-4" />
            <span className="text-sm">{formatTime(incident.timestamp)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <span className="text-sm font-medium">Speed:</span>
            <span className="text-sm">{incident.speed || 0} km/h</span>
          </div>
        </div>

        {/* Responders */}
        {incident.responders && incident.responders.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Responders:</p>
            <div className="space-y-2">
              {incident.responders.map((responder) => (
                <div key={responder.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{responder.name}</span>
                  <span className="text-gray-500">ETA: {responder.eta} min</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2">
            {incident.status === 'pending' && onAccept && (
              <button
                onClick={() => onAccept(incident._id)}
                className="flex-1 bg-emergency-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emergency-700 transition-colors"
              >
                Accept & Dispatch
              </button>
            )}
            <button
              onClick={() => navigate(`/alert/${incident._id}`)}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
              Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentCard;