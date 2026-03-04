import React, { useState, useEffect } from 'react';
import { locationService } from '../../../../../services/api/location.service';
import { Trip } from '../../../../../types/location.types';
import { format } from 'date-fns';
import {
  MapPinIcon,
  CalendarIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

const TripHistory: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      // Replace later with API
      const mockTrips: Trip[] = [
        {
          _id: '1',
          driverId: 'driver1',
          startPoint: { lat: -1.286389, lng: 36.817223 },
          endPoint: { lat: -1.292066, lng: 36.821946 },
          waypoints: [],
          distance: 5.2,
          duration: 25,
          status: 'completed',
          startedAt: new Date('2024-01-15T09:00:00'),
          completedAt: new Date('2024-01-15T09:25:00'),
        },
        {
          _id: '2',
          driverId: 'driver1',
          startPoint: { lat: -1.286389, lng: 36.817223 },
          endPoint: { lat: -1.300, lng: 36.800 },
          waypoints: [],
          distance: 8.5,
          duration: 35,
          status: 'completed',
          startedAt: new Date('2024-01-14T14:00:00'),
          completedAt: new Date('2024-01-14T14:35:00'),
        },
      ];

      setTrips(mockTrips);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /* ✅ SAFE CALCULATIONS */
  const formatDuration = (minutes: number) => {
    const safeMinutes = minutes || 0;
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  /* ✅ Safe totals */
  const totalDistance = trips.reduce(
    (sum, trip) => sum + (trip.distance ?? 0),
    0
  );

  const totalDuration = trips.reduce(
    (sum, trip) => sum + (trip.duration ?? 0),
    0
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emergency-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Trip History
        </h2>

        {/* ================= FILTERS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) =>
                setFilter({ ...filter, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) =>
                setFilter({ ...filter, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
            />
          </div>
        </div>

        {/* ================= STATS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600">Total Trips</p>
            <p className="text-2xl font-bold text-blue-800">
              {trips.length}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600">Total Distance</p>
            <p className="text-2xl font-bold text-green-800">
              {totalDistance.toFixed(1)} km
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600">Total Time</p>
            <p className="text-2xl font-bold text-purple-800">
              {formatDuration(totalDuration)}
            </p>
          </div>
        </div>

        {/* ================= TRIP LIST ================= */}
        <div className="space-y-4">
          {trips.map((trip) => {
            const safeDistance = trip.distance ?? 0;
            const safeDuration = trip.duration ?? 0;

            const speed =
              safeDuration > 0
                ? (safeDistance / (safeDuration / 60)).toFixed(1)
                : '0.0';

            return (
              <div
                key={trip._id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() =>
                  setSelectedTrip(
                    selectedTrip?._id === trip._id ? null : trip
                  )
                }
              >
                {/* HEADER */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {trip.startedAt &&
                        format(trip.startedAt, 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      trip.status
                    )}`}
                  >
                    {trip.status}
                  </span>
                </div>

                {/* LOCATION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="text-sm font-mono">
                      {trip.startPoint?.lat?.toFixed(6)},{' '}
                      {trip.startPoint?.lng?.toFixed(6)}
                    </p>
                  </div>

                  {trip.endPoint && (
                    <div>
                      <p className="text-xs text-gray-500">End</p>
                      <p className="text-sm font-mono">
                        {trip.endPoint.lat.toFixed(6)}, {trip.endPoint.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span>
                      <strong>Distance:</strong> {safeDistance} km
                    </span>

                    <span>
                      <strong>Duration:</strong>{' '}
                      {formatDuration(safeDuration)}
                    </span>
                  </div>

                  <ArrowDownIcon
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      selectedTrip?._id === trip._id
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </div>

                {/* EXPANDED */}
                {selectedTrip?._id === trip._id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">
                      Route Details
                    </h4>

                    <div className="bg-gray-50 h-48 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">
                        Map would display route here
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">
                          Average Speed
                        </p>
                        <p className="font-medium">
                          {speed} km/h
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Fuel Efficiency
                        </p>
                        <p className="font-medium">
                          8.5 L/100km
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {trips.length === 0 && (
            <div className="text-center py-12">
              <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Trips Found
              </h3>
              <p className="text-gray-500">
                You haven't taken any trips yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistory;