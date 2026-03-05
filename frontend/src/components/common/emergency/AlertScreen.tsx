// src/components/common/emergency/AlertScreen.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emergencyService } from '../../../services/api/emergency.service';

/* ✅ Correct type imports */
import { Incident } from '../../../types/emergency.types';
import { Responder } from '../../../types/user.types';

import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/* ✅ Safe param typing */
interface RouteParams {
  incidentId: string;
}

const AlertScreen: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [responders, setResponders] = useState<Responder[]>([]);

  /* ================= FETCH INCIDENT ================= */

  useEffect(() => {
    if (!incidentId) return;

    const fetchIncident = async () => {
      try {
        const data = await emergencyService.getIncident(incidentId);
        setIncident(data);
      } catch (error) {
        console.error('Failed to fetch incident:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();

    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [incidentId]);

  /* ================= UPDATE RESPONDERS ================= */

  useEffect(() => {
    if (incident?.responders) {
      setResponders((incident.responders ?? []) as unknown as Responder[]);
    }
  }, [incident]);

  /* ================= HELPERS ================= */

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityMessage = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'fatal':
        return 'Critical emergency — Immediate response required';
      case 'high':
        return 'High severity — Urgent medical attention needed';
      case 'medium':
        return 'Medium severity — Attention required';
      default:
        return 'Low severity — Non life-threatening';
    }
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
        <p className="text-white text-lg">Loading incident...</p>
      </div>
    );
  }

  /* ================= NOT FOUND ================= */

  if (!incident) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-center">
        <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Incident Not Found</h1>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-white text-red-600 px-6 py-2 rounded-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-8">
          <ExclamationTriangleIcon className="h-16 w-16 text-white mx-auto mb-4 animate-pulse" />
          <h1 className="text-4xl font-bold text-white">
            EMERGENCY ALERT
          </h1>
          <p className="text-red-200 mt-2">
            Incident ID: {incident._id}
          </p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">

          <div className="bg-white rounded-lg p-6 text-center">
            <ClockIcon className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-sm text-gray-600">Time Elapsed</p>
            <p className="text-2xl font-bold text-red-600">
              {formatTime(timeElapsed)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 text-center">
            <MapPinIcon className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-sm text-gray-600">Location</p>

            {incident.location && (
              <p className="text-sm font-mono">
                {(incident.location.lat ?? incident.location.latitude).toFixed(6)}
                <br />
                {(incident.location.lng ?? incident.location.longitude).toFixed(6)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 text-center">
            <ArrowPathIcon className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-sm text-gray-600">Severity</p>
            <p className="text-xl font-bold capitalize text-red-600">
              {incident.severity}
            </p>
          </div>

        </div>

        {/* SEVERITY MESSAGE */}
        <div className="bg-white rounded-lg p-6 mb-8 text-center">
          {getSeverityMessage(incident.severity)}
        </div>

        {/* RESPONDERS */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            Responders En Route
          </h2>

          {responders.length === 0 ? (
            <p className="text-gray-500">
              Waiting for responders to accept...
            </p>
          ) : (
            <div className="space-y-3">
              {responders.map((responder) => (
                <div
                  key={responder._id}
                  className="border rounded-lg p-4 flex justify-between"
                >
                  <div>
                    <p className="font-medium">{responder.name}</p>
                    <p className="text-sm text-gray-500">
                      {responder.hospitalName}
                    </p>
                    <p className="text-xs capitalize">
                      {responder.responderType}
                    </p>
                  </div>

                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CALL BUTTON */}
        <div className="text-center">
          <a
            href="tel:911"
            className="inline-flex items-center gap-2 bg-white text-red-600 px-8 py-4 rounded-lg font-bold"
          >
            <PhoneIcon className="h-6 w-6" />
            Call Emergency Services
          </a>
        </div>

      </div>
    </div>
  );
};

export default AlertScreen;