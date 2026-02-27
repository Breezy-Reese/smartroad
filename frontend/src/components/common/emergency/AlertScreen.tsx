import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emergencyService } from '../../../services/api/emergency.service';
import { Incident, ResponderInfo } from '../../../types/incident.types';
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface AlertScreenParams {
  incidentId: string;
}

const AlertScreen: React.FC = () => {
  const { incidentId } = useParams<AlertScreenParams>();
  const navigate = useNavigate();
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [responders, setResponders] = useState<ResponderInfo[]>([]);

  useEffect(() => {
    if (incidentId) {
      fetchIncidentDetails();
    }

    // Timer for elapsed time
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [incidentId]);

  useEffect(() => {
    if (incident) {
      setResponders(incident.responders || []);
    }
  }, [incident]);

  const fetchIncidentDetails = async () => {
    try {
      const data = await emergencyService.getIncident(incidentId!);
      setIncident(data);
    } catch (error) {
      console.error('Failed to fetch incident:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityMessage = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'fatal':
        return 'Critical emergency - Immediate response required';
      case 'high':
        return 'High severity - Urgent medical attention needed';
      case 'medium':
        return 'Medium severity - Medical attention needed';
      default:
        return 'Low severity - Non-life threatening';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
        <div className="text-center text-white">
          <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Incident Not Found</h1>
          <p>The incident you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-white text-red-600 px-6 py-2 rounded-lg hover:bg-gray-100"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white p-4 rounded-full animate-pulse mb-4">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">EMERGENCY ALERT</h1>
          <p className="text-red-200">Incident ID: {incident.incidentId}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 text-center">
            <ClockIcon className="h-8 w-8 text-emergency-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Time Elapsed</p>
            <p className="text-3xl font-bold text-emergency-600">{formatTime(timeElapsed)}</p>
          </div>

          <div className="bg-white rounded-lg p-6 text-center">
            <MapPinIcon className="h-8 w-8 text-emergency-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Location</p>
            <p className="text-sm font-mono">
              {incident.location.lat.toFixed(6)}<br />
              {incident.location.lng.toFixed(6)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 text-center">
            <ArrowPathIcon className="h-8 w-8 text-emergency-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Severity</p>
            <p className="text-xl font-bold capitalize text-emergency-600">{incident.severity}</p>
          </div>
        </div>

        {/* Severity Message */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <p className="text-lg text-center text-gray-700">
            {getSeverityMessage(incident.severity)}
          </p>
        </div>

        {/* Map Placeholder */}
        <div className="bg-gray-200 rounded-lg h-64 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPinIcon className="h-12 w-12 text-emergency-600 mx-auto mb-2" />
              <p className="text-gray-600">Live tracking map would display here</p>
              <p className="text-sm text-gray-500">
                Responders are being directed to your location
              </p>
            </div>
          </div>
        </div>

        {/* Responders Status */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Responders En Route</h2>
          
          {responders.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emergency-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Waiting for responders to accept...</p>
              <p className="text-sm text-gray-500 mt-2">
                Nearby hospitals and emergency services are being notified
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {responders.map((responder) => (
                <div
                  key={responder.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{responder.name}</p>
                      <p className="text-sm text-gray-600">{responder.hospital}</p>
                      <p className="text-xs text-gray-500 capitalize">{responder.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emergency-600">ETA: {responder.eta} min</p>
                    <p className="text-xs text-gray-500">Distance: {responder.distance} km</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        {incident.emergencyContacts && incident.emergencyContacts.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Emergency Contacts Notified</h2>
            <div className="space-y-2">
              {incident.emergencyContacts.map((contact) => (
                <div key={contact._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{contact.name}</span>
                  <span className="text-gray-600">{contact.relationship}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white bg-opacity-10 rounded-lg p-6 text-white">
          <h3 className="font-bold text-xl mb-4">🚨 Instructions</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-white text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</span>
              <span>Stay calm and remain where you are if safe</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-white text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</span>
              <span>Keep your hazard lights on to alert other drivers</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-white text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</span>
              <span>Do not move if you're injured - wait for medical personnel</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-white text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</span>
              <span>If you can, move to a safe location away from traffic</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-white text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">5</span>
              <span>Help will arrive shortly - stay on this screen for updates</span>
            </li>
          </ul>
        </div>

        {/* Emergency Call Button */}
        <div className="mt-8 text-center">
          <a
            href="tel:911"
            className="inline-flex items-center space-x-2 bg-white text-red-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            <PhoneIcon className="h-6 w-6" />
            <span>Call Emergency Services (911)</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AlertScreen;