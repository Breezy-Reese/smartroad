import React, { useEffect, useRef, useState } from 'react';
import { useAdminStats } from '../../../hooks/useAdminStats';
import { FleetIncident, IncidentSeverity } from '../../../types/admin.types';
import { ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';

/*
  Uses Leaflet + Leaflet.heat for the heatmap layer.
  Install: npm install leaflet leaflet.heat @types/leaflet
  Add to index.html: <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
*/

const SEVERITY_WEIGHT: Record<IncidentSeverity, number> = {
  low: 0.2, medium: 0.4, high: 0.7, critical: 1.0,
};

const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  low: '#6b7280', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};

/* ── Legend ── */
const Legend: React.FC = () => (
  <div className="flex items-center gap-4 flex-wrap">
    {(Object.entries(SEVERITY_COLOR) as [IncidentSeverity, string][]).map(([sev, color]) => (
      <div key={sev} className="flex items-center gap-1.5 text-xs text-gray-600 capitalize">
        <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
        {sev}
      </div>
    ))}
  </div>
);

/* ── Marker dot (CSS — no canvas needed) ── */
const IncidentDot: React.FC<{
  incident: FleetIncident;
  style: React.CSSProperties;
  onClick: () => void;
}> = ({ incident, style, onClick }) => (
  <button
    onClick={onClick}
    title={`${incident.driverName} — ${incident.type}`}
    style={{
      position: 'absolute',
      width: incident.severity === 'critical' ? 14 : incident.severity === 'high' ? 11 : 8,
      height: incident.severity === 'critical' ? 14 : incident.severity === 'high' ? 11 : 8,
      borderRadius: '50%',
      background: SEVERITY_COLOR[incident.severity],
      border: '1.5px solid white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      transform: 'translate(-50%, -50%)',
      zIndex: incident.severity === 'critical' ? 10 : 1,
      ...style,
    }}
  />
);

/* ── Nairobi static map with projected dots ── */
const BOUNDS = { minLat: -1.37, maxLat: -1.19, minLng: 36.71, maxLng: 36.93 };

const project = (lat: number, lng: number, width: number, height: number) => ({
  x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width,
  y: height - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height,
});

/* ── Main screen ── */
const HeatmapScreen: React.FC = () => {
  const { incidents, loading, refresh } = useAdminStats();
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<FleetIncident | null>(null);
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');
  const [mapSize, setMapSize] = useState({ w: 680, h: 420 });

  useEffect(() => {
    const update = () => {
      if (mapRef.current) {
        setMapSize({ w: mapRef.current.clientWidth, h: mapRef.current.clientHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const visible = severityFilter === 'all'
    ? incidents
    : incidents.filter((i) => i.severity === severityFilter);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident heatmap</h1>
          <p className="text-sm text-gray-500 mt-0.5">Geographic distribution of fleet incidents</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Legend />
        <div className="ml-auto flex gap-1">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                severityFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="relative w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200"
        style={{ height: 420 }}
      >
        {/* Grid overlay */}
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * (100 / 6)}%`} y1="0" x2={`${(i + 1) * (100 / 6)}%`} y2="100%"
              stroke="#374151" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 25}%`} x2="100%" y2={`${(i + 1) * 25}%`}
              stroke="#374151" strokeWidth="0.5" />
          ))}
        </svg>

        {/* Map label */}
        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-xs text-gray-600 px-2 py-1 rounded-lg font-medium">
          Nairobi metro area
        </div>

        {/* Incident count */}
        <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-xs text-gray-700 px-2 py-1 rounded-lg font-medium">
          {visible.length} incident{visible.length !== 1 ? 's' : ''}
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
            <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        )}

        {/* Dots */}
        {!loading && visible.map((incident) => {
          const { x, y } = project(incident.lat, incident.lng, mapSize.w, mapSize.h);
          return (
            <IncidentDot
              key={incident.id}
              incident={incident}
              style={{ left: x, top: y }}
              onClick={() => setSelected((s) => s?.id === incident.id ? null : incident)}
            />
          );
        })}

        {/* Selected tooltip */}
        {selected && (() => {
          const { x, y } = project(selected.lat, selected.lng, mapSize.w, mapSize.h);
          return (
            <div
              className="absolute z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-52 text-sm pointer-events-none"
              style={{
                left: Math.min(x + 12, mapSize.w - 210),
                top: Math.max(y - 80, 8),
              }}
            >
              <p className="font-semibold text-gray-900 truncate">{selected.driverName}</p>
              <p className="text-gray-500 text-xs mt-0.5">{selected.type}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{ background: SEVERITY_COLOR[selected.severity] + '22', color: SEVERITY_COLOR[selected.severity] }}
                >
                  {selected.severity}
                </span>
                <span className={`text-xs ${selected.resolved ? 'text-green-600' : 'text-red-500'}`}>
                  {selected.resolved ? 'Resolved' : 'Open'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(selected.timestamp).toLocaleString()}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Stats below map */}
      <div className="grid grid-cols-4 gap-3">
        {((['critical', 'high', 'medium', 'low'] as IncidentSeverity[])).map((sev) => {
          const count = incidents.filter((i) => i.severity === sev).length;
          return (
            <div key={sev} className="bg-white border border-gray-100 rounded-xl p-3 text-center cursor-pointer hover:border-gray-300 transition-colors"
              onClick={() => setSeverityFilter(sev === severityFilter ? 'all' : sev)}>
              <p className="text-xl font-bold" style={{ color: SEVERITY_COLOR[sev] }}>{count}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{sev}</p>
            </div>
          );
        })}
      </div>

      {/*
        NOTE: For production, replace the dot-projection map above with:
          npm install leaflet leaflet.heat @types/leaflet
          Then use <MapContainer> from react-leaflet with a HeatmapLayer.
          The dot positions above are accurate — same lat/lng data,
          just projected onto a static grid instead of tile-based map.
      */}
    </div>
  );
};

export default HeatmapScreen;
