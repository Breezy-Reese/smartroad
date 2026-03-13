import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Circle,
} from '@react-google-maps/api';

import { Incident } from '../../../types/emergency.types';
import { Coordinates, normalizeCoordinates } from '../../../types/location.types';

interface IncidentMapProps {
  incidents: Incident[];
  center?: Coordinates;
  zoom?: number;
  onMarkerClick?: (incident: Incident) => void;
  selectedIncident?: Incident | null;
  showRadius?: boolean;
  radius?: number; // km
  showHotspots?: boolean; // toggle hotspot layer (default true)
  hotspotThreshold?: number; // min incidents to flag as hotspot (default 3)
  hotspotRadiusKm?: number;  // cluster radius in km (default 1)
}

/* ─── Hotspot derived from clustering ─── */
interface Hotspot {
  center: Coordinates;
  count: number;
  incidents: Incident[];
  level: 'warning' | 'danger' | 'critical';
}

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '500px',
};

const defaultCenter: Coordinates = {
  lat: -1.286389,
  lng: 36.817223,
};

/* ─── Haversine distance in km ─── */
function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

/* ─── Cluster incidents into hotspots ─── */
function computeHotspots(
  incidents: Incident[],
  radiusKm: number,
  threshold: number
): Hotspot[] {
  // Build list of valid positions
  const positioned: { incident: Incident; coords: Coordinates }[] = [];
  for (const inc of incidents) {
    try {
      positioned.push({ incident: inc, coords: normalizeCoordinates(inc.location) });
    } catch {
      // skip invalid
    }
  }

  const visited = new Set<number>();
  const hotspots: Hotspot[] = [];

  for (let i = 0; i < positioned.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [positioned[i]];
    visited.add(i);

    for (let j = i + 1; j < positioned.length; j++) {
      if (visited.has(j)) continue;
      if (distanceKm(positioned[i].coords, positioned[j].coords) <= radiusKm) {
        cluster.push(positioned[j]);
        visited.add(j);
      }
    }

    if (cluster.length < threshold) continue;

    // Centroid
    const centerLat = cluster.reduce((s, p) => s + p.coords.lat, 0) / cluster.length;
    const centerLng = cluster.reduce((s, p) => s + p.coords.lng, 0) / cluster.length;

    const count = cluster.length;
    const level: Hotspot['level'] =
      count >= 10 ? 'critical' :
      count >= 6  ? 'danger'   :
                    'warning';

    hotspots.push({
      center: { lat: centerLat, lng: centerLng },
      count,
      incidents: cluster.map(c => c.incident),
      level,
    });
  }

  return hotspots;
}

/* ─── Hotspot visual config ─── */
const HOTSPOT_STYLE: Record<Hotspot['level'], {
  fill: string; stroke: string; fillOpacity: number; label: string;
}> = {
  warning:  { fill: '#fbbf24', stroke: '#d97706', fillOpacity: 0.15, label: '⚠ High-Risk Zone'      },
  danger:   { fill: '#f97316', stroke: '#ea580c', fillOpacity: 0.20, label: '🔶 Danger Zone'         },
  critical: { fill: '#ef4444', stroke: '#dc2626', fillOpacity: 0.25, label: '🔴 Critical Hotspot'    },
};

/* ══════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════ */
const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  center = defaultCenter,
  zoom = 12,
  onMarkerClick,
  selectedIncident,
  showRadius = false,
  radius = 5,
  showHotspots = true,
  hotspotThreshold = 3,
  hotspotRadiusKm = 1,
}) => {
  const [map, setMap]                   = useState<google.maps.Map | null>(null);
  const [selected, setSelected]         = useState<Incident | null>(selectedIncident ?? null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  /* ── Sync selected incident ── */
  useEffect(() => {
    if (selectedIncident) setSelected(selectedIncident);
  }, [selectedIncident]);

  /* ── User geolocation ── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('Geolocation failed:', err.message)
    );
  }, []);

  const onLoad = useCallback((mapInstance: google.maps.Map) => setMap(mapInstance), []);

  /* ── Compute hotspots (memoised) ── */
  const hotspots = useMemo(
    () => showHotspots ? computeHotspots(incidents, hotspotRadiusKm, hotspotThreshold) : [],
    [incidents, showHotspots, hotspotRadiusKm, hotspotThreshold]
  );

  const getMarkerIcon = (severity?: string) => {
    const icons: Record<string, string> = {
      low:      'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      medium:   'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
      high:     'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
      critical: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      fatal:    'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    };
    return icons[severity ?? 'medium'] ?? icons.medium;
  };

  const safeCenter = (() => {
    try { return normalizeCoordinates(center); }
    catch { return defaultCenter; }
  })();

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="relative">
      {/* ── Hotspot legend ── */}
      {showHotspots && hotspots.length > 0 && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs space-y-1.5 max-w-[180px]">
          <p className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-2">
            Hotspot Zones ({hotspots.length})
          </p>
          {Object.entries(HOTSPOT_STYLE).map(([level, style]) => {
            const count = hotspots.filter(h => h.level === level).length;
            if (!count) return null;
            return (
              <div key={level} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full border flex-shrink-0"
                  style={{ background: style.fill, borderColor: style.stroke }}
                />
                <span className="text-gray-600 capitalize">{level}</span>
                <span className="ml-auto font-semibold text-gray-800">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={safeCenter}
          zoom={zoom}
          onLoad={onLoad}
          options={{
            mapTypeControl:    true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl:       true,
          }}
        >
          {/* ── Hotspot circles ── */}
          {hotspots.map((hotspot, idx) => {
            const style = HOTSPOT_STYLE[hotspot.level];
            return (
              <React.Fragment key={`hotspot-${idx}`}>
                <Circle
                  center={hotspot.center}
                  radius={hotspotRadiusKm * 1000}
                  options={{
                    fillColor:    style.fill,
                    fillOpacity:  style.fillOpacity,
                    strokeColor:  style.stroke,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    clickable:    true,
                    zIndex:       1,
                  }}
                  onClick={() => setSelectedHotspot(hotspot)}
                />
                {/* Centre marker for the hotspot */}
                <Marker
                  position={hotspot.center}
                  label={{
                    text:      hotspot.count.toString(),
                    color:     '#fff',
                    fontWeight: 'bold',
                    fontSize:  '12px',
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 16,
                    fillColor:   style.stroke,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                  }}
                  title={`${style.label} — ${hotspot.count} incidents`}
                  onClick={() => setSelectedHotspot(hotspot)}
                  zIndex={2}
                />
              </React.Fragment>
            );
          })}

          {/* ── Hotspot info window ── */}
          {selectedHotspot && (
            <InfoWindow
              position={selectedHotspot.center}
              onCloseClick={() => setSelectedHotspot(null)}
            >
              <div className="p-2 max-w-xs">
                <p className="font-bold text-sm mb-1">
                  {HOTSPOT_STYLE[selectedHotspot.level].label}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  {selectedHotspot.count} incidents within {hotspotRadiusKm} km
                </p>
                <div className="space-y-1 mt-2 max-h-28 overflow-y-auto">
                  {selectedHotspot.incidents.slice(0, 5).map(inc => (
                    <div key={inc._id} className="text-xs flex justify-between gap-3 border-b pb-1">
                      <span className="font-mono text-gray-500">{inc.incidentId?.slice(-6) ?? inc._id?.slice(-6)}</span>
                      <span className="capitalize text-gray-700">{inc.severity}</span>
                    </div>
                  ))}
                  {selectedHotspot.count > 5 && (
                    <p className="text-xs text-gray-400 pt-1">+{selectedHotspot.count - 5} more</p>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}

          {/* ── User location marker ── */}
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

          {/* ── Incident markers ── */}
          {incidents.map((incident) => {
            let position: Coordinates | null = null;
            try { position = normalizeCoordinates(incident.location); }
            catch { return null; }

            return (
              <Marker
                key={incident._id}
                position={position}
                icon={getMarkerIcon(incident.severity)}
                onClick={() => {
                  setSelected(incident);
                  onMarkerClick?.(incident);
                }}
                zIndex={3}
              />
            );
          })}

          {/* ── Selected incident info window ── */}
          {selected && selected.location && (() => {
            let position: Coordinates | null = null;
            try { position = normalizeCoordinates(selected.location); }
            catch { return null; }

            return (
              <InfoWindow position={position} onCloseClick={() => setSelected(null)}>
                <div className="p-2 max-w-xs">
                  <h3 className="font-bold text-sm mb-1">
                    Incident #{selected.incidentId?.slice(-6) ?? selected._id?.slice(-6)}
                  </h3>
                  <p className="text-xs mb-1">
                    Severity: <span className="font-medium capitalize">{selected.severity ?? 'N/A'}</span>
                  </p>
                  <p className="text-xs mb-1">
                    Status: <span className="font-medium capitalize">{selected.status ?? 'N/A'}</span>
                  </p>
                  {selected.driver?.name && (
                    <p className="text-xs mb-1">Driver: {selected.driver.name}</p>
                  )}
                  {selected.timestamp && (
                    <p className="text-xs text-gray-500">
                      {new Date(selected.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </InfoWindow>
            );
          })()}

          {/* ── Search radius circle ── */}
          {showRadius && userLocation && (
            <Circle
              center={userLocation}
              radius={radius * 1000}
              options={{
                fillColor:    '#3b82f6',
                fillOpacity:  0.1,
                strokeColor:  '#3b82f6',
                strokeOpacity: 0.5,
                strokeWeight: 1,
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default IncidentMap;
