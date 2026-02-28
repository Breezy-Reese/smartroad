import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { Incident } from '../../../types/incident.types';
import { Coordinates } from '../../../types/location.types';

interface IncidentMapProps {
  incidents: Incident[];
  center?: Coordinates;
  zoom?: number;
  onMarkerClick?: (incident: Incident) => void;
  selectedIncident?: Incident | null;
  showRadius?: boolean;
  radius?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter: Coordinates = {
  lat: -1.286389, // Nairobi
  lng: 36.817223,
};

const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  center = defaultCenter,
  zoom = 12,
  onMarkerClick,
  selectedIncident,
  showRadius = false,
  radius = 5, // km
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selected, setSelected] = useState<Incident | null>(selectedIncident || null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (selectedIncident) {
      setSelected(selectedIncident);
    }
  }, [selectedIncident]);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          console.log('Unable to get user location');
        }
      );
    }
  }, []);

  const onLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  const getMarkerIcon = (severity: string) => {
    const icons = {
      low: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      medium: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
      high: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
      critical: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      fatal: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    };
    return icons[severity as keyof typeof icons] || icons.medium;
  };

  return (
<LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
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
        {/* User location */}
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

        {/* Incident markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident._id}
            position={incident.location}
            icon={getMarkerIcon(incident.severity)}
            onClick={() => {
              setSelected(incident);
              if (onMarkerClick) onMarkerClick(incident);
            }}
          />
        ))}

        {/* Selected incident info window */}
        {selected && (
          <InfoWindow
            position={selected.location}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-sm mb-1">
                Incident #{selected.incidentId.slice(-6)}
              </h3>
              <p className="text-xs mb-1">
                Severity: <span className="font-medium capitalize">{selected.severity}</span>
              </p>
              <p className="text-xs mb-1">
                Status: <span className="font-medium capitalize">{selected.status}</span>
              </p>
              {selected.driver && (
                <p className="text-xs mb-1">
                  Driver: {selected.driver.name}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {new Date(selected.timestamp).toLocaleString()}
              </p>
            </div>
          </InfoWindow>
        )}

        {/* Search radius circle */}
        {showRadius && userLocation && (
          <Circle
            center={userLocation}
            radius={radius * 1000} // Convert to meters
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