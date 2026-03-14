import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Circle,
  Polyline,
} from '@react-google-maps/api';

import { Incident } from '../../../types/emergency.types';
import { Coordinates, normalizeCoordinates } from '../../../types/location.types';
import { useDriverLocations, LiveDriverLocation, LiveResponderLocation } from '../../../hooks/useDriverLocations';

interface IncidentMapProps {
  incidents: Incident[];
  center?: Coordinates;
  zoom?: number;
  onMarkerClick?: (incident: Incident) => void;
  selectedIncident?: Incident | null;
  showRadius?: boolean;
  radius?: number;
  showHotspots?: boolean;
  hotspotThreshold?: number;
  hotspotRadiusKm?: number;
  // New props
  showDrivers?: boolean;       // show live driver markers (default true)
  showResponders?: boolean;    // show live responder markers (default true)
  showDriverTrails?: boolean;  // show recent path trails (default false)
}

interface Hotspot {
  center: Coordinates;
  count: number;
  incidents: Incident[];
  level: 'warning' | 'danger' | 'critical';
}

// ── Selected entity union ─────────────────────────────────────────────────────
type SelectedEntity =
  | { kind: 'incident';  data: Incident }
  | { kind: 'driver';    data: LiveDriverLocation }
  | { kind: 'responder'; data: LiveResponderLocation }
  | { kind: 'hotspot';   data: Hotspot };

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '500px',
};

const defaultCenter: Coordinates = { lat: -1.286389, lng: 36.817223 };

// ── Haversine distance ────────────────────────────────────────────────────────
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

// ── Hotspot clustering ────────────────────────────────────────────────────────
function computeHotspots(
  incidents: Incident[],
  radiusKm: number,
  threshold: number
): Hotspot[] {
  const positioned: { incident: Incident; coords: Coordinates }[] = [];
  for (const inc of incidents) {
    try {
      positioned.push({ incident: inc, coords: normalizeCoordinates(inc.location) });
    } catch { /* skip invalid */ }
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

    const centerLat = cluster.reduce((s, p) => s + p.coords.lat, 0) / cluster.length;
    const centerLng = cluster.reduce((s, p) => s + p.coords.lng, 0) / cluster.length;
    const count = cluster.length;

    hotspots.push({
      center: { lat: centerLat, lng: centerLng },
      count,
      incidents: cluster.map(c => c.incident),
      level: count >= 10 ? 'critical' : count >= 6 ? 'danger' : 'warning',
    });
  }
  return hotspots;
}

const HOTSPOT_STYLE: Record<Hotspot['level'], {
  fill: string; stroke: string; fillOpacity: number; label: string;
}> = {
  warning:  { fill: '#fbbf24', stroke: '#d97706', fillOpacity: 0.15, label: '⚠ High-Risk Zone'   },
  danger:   { fill: '#f97316', stroke: '#ea580c', fillOpacity: 0.20, label: '🔶 Danger Zone'      },
  critical: { fill: '#ef4444', stroke: '#dc2626', fillOpacity: 0.25, label: '🔴 Critical Hotspot' },
};

// ── Marker icons ──────────────────────────────────────────────────────────────
const INCIDENT_ICONS: Record<string, string> = {
  low:      'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  medium:   'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  high:     'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  critical: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  fatal:    'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
};

const DRIVER_STATUS_COLOR: Record<string, string> = {
  online:    '#22c55e',
  offline:   '#6b7280',
  driving:   '#3b82f6',
  emergency: '#ef4444',
};

// ── Driver trail: store last N positions per driver ───────────────────────────
const MAX_TRAIL_POINTS = 10;
type TrailMap = Record<string, Coordinates[]>;

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
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
  showDrivers = true,
  showResponders = true,
  showDriverTrails = false,
}) => {
  const [selected, setSelected]         = useState<SelectedEntity | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [driverTrails, setDriverTrails] = useState<TrailMap>({});

  // ── Live locations from socket ──────────────────────────────────────────────
  const { driverLocations, responderLocations } = useDriverLocations();

  const drivers    = useMemo(() => Object.values(driverLocations),    [driverLocations]);
  const responders = useMemo(() => Object.values(responderLocations), [responderLocations]);

  // ── Sync selected incident from parent ─────────────────────────────────────
  useEffect(() => {
    if (selectedIncident) setSelected({ kind: 'incident', data: selectedIncident });
  }, [selectedIncident]);

  // ── Update driver trails ────────────────────────────────────────────────────
  useEffect(() => {
    if (!showDriverTrails) return;
    setDriverTrails((prev) => {
      const next = { ...prev };
      for (const d of drivers) {
        const trail = prev[d.driverId] ?? [];
        const newPoint = { lat: d.latitude, lng: d.longitude };
        next[d.driverId] = [...trail.slice(-(MAX_TRAIL_POINTS - 1)), newPoint];
      }
      return next;
    });
  }, [drivers, showDriverTrails]);

  // ── User geolocation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('Geolocation failed:', err.message)
    );
  }, []);

  // ── Hotspots ────────────────────────────────────────────────────────────────
  const hotspots = useMemo(
    () => showHotspots ? computeHotspots(incidents, hotspotRadiusKm, hotspotThreshold) : [],
    [incidents, showHotspots, hotspotRadiusKm, hotspotThreshold]
  );

  const safeCenter = useMemo(() => {
    try { return normalizeCoordinates(center); }
    catch { return defaultCenter; }
  }, [center]);

  // ── Info window position ────────────────────────────────────────────────────
  const infoPosition = useMemo((): Coordinates | null => {
    if (!selected) return null;
    switch (selected.kind) {
      case 'incident':
        try { return normalizeCoordinates(selected.data.location); } catch { return null; }
      case 'driver':
        return { lat: selected.data.latitude, lng: selected.data.longitude };
      case 'responder':
        return { lat: selected.data.latitude, lng: selected.data.longitude };
      case 'hotspot':
        return selected.data.center;
    }
  }, [selected]);

  // ── Stats bar counts ────────────────────────────────────────────────────────
  const emergencyDriverCount = drivers.filter(d => d.status === 'emergency').length;
  const activeResponderCount = responders.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Stats bar ── */}
      <div className="flex gap-3 mb-2 flex-wrap">
        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full">
          🚨 {incidents.filter(i => !['resolved','cancelled','false-alarm'].includes(i.status)).length} Active Incidents
        </span>
        {showDrivers && (
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full">
            🚗 {drivers.length} Drivers Online
            {emergencyDriverCount > 0 && (
              <span className="ml-1 text-red-600">({emergencyDriverCount} emergency)</span>
            )}
          </span>
        )}
        {showResponders && (
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
            🚑 {activeResponderCount} Responders Active
          </span>
        )}
      </div>

      {/* ── Hotspot legend ── */}
      {showHotspots && hotspots.length > 0 && (
        <div className="absolute top-12 left-3 z-10 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs space-y-1.5 max-w-[180px]">
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

      {/* ── Driver legend ── */}
      {showDrivers && drivers.length > 0 && (
        <div className="absolute top-12 right-3 z-10 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs space-y-1.5">
          <p className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-2">Driver Status</p>
          {Object.entries(DRIVER_STATUS_COLOR).map(([status, color]) => {
            const count = drivers.filter(d => d.status === status).length;
            if (!count) return null;
            return (
              <div key={status} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-gray-600 capitalize">{status}</span>
                <span className="ml-auto font-semibold">{count}</span>
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
                    fillColor: style.fill, fillOpacity: style.fillOpacity,
                    strokeColor: style.stroke, strokeOpacity: 0.8, strokeWeight: 2,
                    clickable: true, zIndex: 1,
                  }}
                  onClick={() => setSelected({ kind: 'hotspot', data: hotspot })}
                />
                <Marker
                  position={hotspot.center}
                  label={{ text: hotspot.count.toString(), color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 16,
                    fillColor: style.stroke, fillOpacity: 1,
                    strokeColor: '#fff', strokeWeight: 2,
                  }}
                  title={`${style.label} — ${hotspot.count} incidents`}
                  onClick={() => setSelected({ kind: 'hotspot', data: hotspot })}
                  zIndex={2}
                />
              </React.Fragment>
            );
          })}

          {/* ── Incident markers ── */}
          {incidents.map((incident) => {
            let position: Coordinates | null = null;
            try { position = normalizeCoordinates(incident.location); } catch { return null; }
            return (
              <Marker
                key={incident._id}
                position={position}
                icon={INCIDENT_ICONS[incident.severity] ?? INCIDENT_ICONS.medium}
                onClick={() => {
                  setSelected({ kind: 'incident', data: incident });
                  onMarkerClick?.(incident);
                }}
                zIndex={3}
              />
            );
          })}

          {/* ── Live driver markers ── */}
          {showDrivers && drivers.map((driver) => (
            <React.Fragment key={`driver-${driver.driverId}`}>
              {/* Trail polyline */}
              {showDriverTrails && (driverTrails[driver.driverId]?.length ?? 0) > 1 && (
                <Polyline
                  path={driverTrails[driver.driverId]}
                  options={{
                    strokeColor:   DRIVER_STATUS_COLOR[driver.status] ?? '#3b82f6',
                    strokeOpacity: 0.5,
                    strokeWeight:  2,
                    zIndex: 1,
                  }}
                />
              )}
              <Marker
                position={{ lat: driver.latitude, lng: driver.longitude }}
                icon={{
                  path:         google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale:        5,
                  fillColor:    DRIVER_STATUS_COLOR[driver.status] ?? '#3b82f6',
                  fillOpacity:  1,
                  strokeColor:  '#fff',
                  strokeWeight: 1.5,
                  rotation:     driver.heading ?? 0,
                }}
                title={`Driver · ${driver.status}`}
                onClick={() => setSelected({ kind: 'driver', data: driver })}
                zIndex={driver.status === 'emergency' ? 10 : 4}
              />
            </React.Fragment>
          ))}

          {/* ── Live responder markers ── */}
          {showResponders && responders.map((responder) => (
            <Marker
              key={`responder-${responder.responderId}`}
              position={{ lat: responder.latitude, lng: responder.longitude }}
              icon={{
                url:        'http://maps.google.com/mapfiles/ms/icons/hospitals.png',
                scaledSize: new google.maps.Size(32, 32),
              }}
              title="Responder"
              onClick={() => setSelected({ kind: 'responder', data: responder })}
              zIndex={5}
            />
          ))}

          {/* ── User location ── */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url:        'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new google.maps.Size(40, 40),
              }}
              title="Your Location"
            />
          )}

          {/* ── Search radius ── */}
          {showRadius && userLocation && (
            <Circle
              center={userLocation}
              radius={radius * 1000}
              options={{
                fillColor: '#3b82f6', fillOpacity: 0.1,
                strokeColor: '#3b82f6', strokeOpacity: 0.5, strokeWeight: 1,
              }}
            />
          )}

          {/* ── Unified info window ── */}
          {selected && infoPosition && (
            <InfoWindow
              position={infoPosition}
              onCloseClick={() => setSelected(null)}
            >
              <div className="p-2 max-w-xs text-sm">

                {selected.kind === 'incident' && (() => {
                  const inc = selected.data;
                  return (
                    <>
                      <h3 className="font-bold mb-1">
                        Incident #{inc.incidentId?.slice(-6) ?? inc._id?.slice(-6)}
                      </h3>
                      <p className="text-xs mb-0.5">Severity: <span className="font-medium capitalize">{inc.severity}</span></p>
                      <p className="text-xs mb-0.5">Status: <span className="font-medium capitalize">{inc.status}</span></p>
                      <p className="text-xs mb-0.5">Type: <span className="font-medium capitalize">{inc.type}</span></p>
                      {inc.driverName && <p className="text-xs mb-0.5">Driver: {inc.driverName}</p>}
                      {inc.locationAddress && <p className="text-xs text-gray-500">{inc.locationAddress}</p>}
                      {inc.timestamp && (
                        <p className="text-xs text-gray-400 mt-1">{new Date(inc.timestamp).toLocaleString()}</p>
                      )}
                    </>
                  );
                })()}

                {selected.kind === 'driver' && (() => {
                  const d = selected.data;
                  const color = DRIVER_STATUS_COLOR[d.status] ?? '#3b82f6';
                  return (
                    <>
                      <h3 className="font-bold mb-1">🚗 Live Driver</h3>
                      <p className="text-xs mb-0.5">
                        Status:{' '}
                        <span className="font-semibold capitalize" style={{ color }}>{d.status}</span>
                      </p>
                      {d.speed !== undefined && (
                        <p className="text-xs mb-0.5">Speed: {Math.round(d.speed)} km/h</p>
                      )}
                      {d.heading !== undefined && (
                        <p className="text-xs mb-0.5">Heading: {Math.round(d.heading)}°</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Last update: {d.updatedAt.toLocaleTimeString()}
                      </p>
                    </>
                  );
                })()}

                {selected.kind === 'responder' && (() => {
                  const r = selected.data;
                  return (
                    <>
                      <h3 className="font-bold mb-1">🚑 Responder</h3>
                      {r.incidentId && (
                        <p className="text-xs mb-0.5">
                          Incident: <span className="font-mono">{r.incidentId.slice(-6)}</span>
                        </p>
                      )}
                      {r.speed !== undefined && (
                        <p className="text-xs mb-0.5">Speed: {Math.round(r.speed)} km/h</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Last update: {r.updatedAt.toLocaleTimeString()}
                      </p>
                    </>
                  );
                })()}

                {selected.kind === 'hotspot' && (() => {
                  const h = selected.data;
                  return (
                    <>
                      <p className="font-bold mb-1">{HOTSPOT_STYLE[h.level].label}</p>
                      <p className="text-xs text-gray-600 mb-1">
                        {h.count} incidents within {hotspotRadiusKm} km
                      </p>
                      <div className="space-y-1 mt-2 max-h-28 overflow-y-auto">
                        {h.incidents.slice(0, 5).map(inc => (
                          <div key={inc._id} className="text-xs flex justify-between gap-3 border-b pb-1">
                            <span className="font-mono text-gray-500">{inc.incidentId?.slice(-6) ?? inc._id?.slice(-6)}</span>
                            <span className="capitalize text-gray-700">{inc.severity}</span>
                          </div>
                        ))}
                        {h.count > 5 && (
                          <p className="text-xs text-gray-400 pt-1">+{h.count - 5} more</p>
                        )}
                      </div>
                    </>
                  );
                })()}

              </div>
            </InfoWindow>
          )}

        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default IncidentMap;
