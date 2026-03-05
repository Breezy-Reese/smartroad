import React, { useEffect, useState, useCallback } from 'react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Circle,
} from '@react-google-maps/api';

import { Incident } from '../../../types/emergency.types';
import { Coordinates } from '../../../types/location.types';

interface IncidentMapProps {
  incidents: Incident[];
  center?: Coordinates;
  zoom?: number;
  onMarkerClick?: (incident: Incident) => void;
  selectedIncident?: Incident | null;
  showRadius?: boolean;
  radius?: number; // km
}

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '500px',
};

const defaultCenter: Coordinates = {
  lat: -1.286389,
  lng: 36.817223,
};

const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  center = defaultCenter,
  zoom = 12,
  onMarkerClick,
  selectedIncident,
  showRadius = false,
  radius = 5,
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selected, setSelected] = useState<Incident | null>(
    selectedIncident ?? null
  );
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  /* ------------------- Sync selected incident ------------------- */
  useEffect(() => {
    if (selectedIncident) {
      setSelected(selectedIncident);
    }
  }, [selectedIncident]);

  /* ------------------- Get User Location ------------------- */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
      }
    );
  }, []);

  /* ------------------- Map Load ------------------- */
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  /* ------------------- Marker Icon Based on Severity ------------------- */
  const getMarkerIcon = (severity?: string) => {
    const icons: Record<string, string> = {
      low: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      medium: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
      high: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
      critical: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      fatal: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    };

    return icons[severity ?? 'medium'] ?? icons.medium;
  };

  /* ------------------- Render ------------------- */
  return (
    <LoadScript
      googleMapsApiKey={
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''
      }
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        }}
      >
        {/* ------------------- User Location Marker ------------------- */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(40, 40),
            }}
            title="Your Location"
          />
        )}

        {/* ------------------- Incident Markers ------------------- */}
        {incidents
          .filter((incident) => incident.location)
          .map((incident) => (
            <Marker
              key={incident._id}
              position={incident.location as Coordinates}
              icon={getMarkerIcon(incident.severity)}
              onClick={() => {
                setSelected(incident);
                onMarkerClick?.(incident);
              }}
            />
          ))}

        {/* ------------------- Info Window ------------------- */}
        {selected && selected.location && (
          <InfoWindow
            position={{
  lat: selected.location.latitude ?? selected.location.lat ?? 0,
  lng: selected.location.longitude ?? selected.location.lng ?? 0,
}}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-sm mb-1">
                Incident #
                {selected.incidentId
                  ? selected.incidentId.slice(-6)
                  : selected._id?.slice(-6)}
              </h3>

              <p className="text-xs mb-1">
                Severity:{' '}
                <span className="font-medium capitalize">
                  {selected.severity ?? 'N/A'}
                </span>
              </p>

              <p className="text-xs mb-1">
                Status:{' '}
                <span className="font-medium capitalize">
                  {selected.status ?? 'N/A'}
                </span>
              </p>

              {selected.driver?.name && (
                <p className="text-xs mb-1">
                  Driver: {selected.driver.name}
                </p>
              )}

              {selected.timestamp && (
                <p className="text-xs text-gray-500">
                  {new Date(selected.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </InfoWindow>
        )}

        {/* ------------------- Search Radius Circle ------------------- */}
        {showRadius && userLocation && (
          <Circle
            center={userLocation}
            radius={radius * 1000}
            options={{
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              strokeColor: '#3b82f6',
              strokeOpacity: 0.5,
              strokeWeight: 1,
            }}
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default IncidentMap;