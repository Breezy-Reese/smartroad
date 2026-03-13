import React, { useEffect, useState } from 'react';
import { hospitalService } from '../../../services/api/hospital.service';
import { BuildingOfficeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface BedWard {
  name: string;
  available: number;
  total: number;
  category: 'icu' | 'emergency' | 'general' | 'theatre';
}

interface BedTrackerProps {
  hospitalId?: string;
  refreshInterval?: number; // ms, default 30s
}

const CATEGORY_STYLE: Record<BedWard['category'], { bg: string; text: string; bar: string; label: string }> = {
  icu:       { bg: 'bg-red-50',    text: 'text-red-700',    bar: '#ef4444', label: 'ICU'         },
  emergency: { bg: 'bg-orange-50', text: 'text-orange-700', bar: '#f97316', label: 'Emergency'   },
  general:   { bg: 'bg-blue-50',   text: 'text-blue-700',   bar: '#3b82f6', label: 'General'     },
  theatre:   { bg: 'bg-purple-50', text: 'text-purple-700', bar: '#8b5cf6', label: 'Theatre'     },
};

const BedTracker: React.FC<BedTrackerProps> = ({
  hospitalId,
  refreshInterval = 30000,
}) => {
  const [wards, setWards] = useState<BedWard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBeds = async () => {
    try {
      // Try API first — fall back to mock data if endpoint doesn't exist yet
      let data: BedWard[] = [];
      try {
        const res = await hospitalService.getBedAvailability?.(hospitalId);
        data = res ?? [];
      } catch {
        // Mock data until backend endpoint is ready
        data = [
          { name: 'ICU',             available: 3,  total: 10, category: 'icu'       },
          { name: 'Emergency',       available: 8,  total: 20, category: 'emergency' },
          { name: 'General Ward A',  available: 14, total: 30, category: 'general'   },
          { name: 'General Ward B',  available: 6,  total: 25, category: 'general'   },
          { name: 'Operating Theatre', available: 2, total: 4, category: 'theatre'   },
        ];
      }
      setWards(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
    const interval = setInterval(fetchBeds, refreshInterval);
    return () => clearInterval(interval);
  }, [hospitalId, refreshInterval]);

  const totalAvailable = wards.reduce((s, w) => s + w.available, 0);
  const totalBeds      = wards.reduce((s, w) => s + w.total, 0);
  const overallPct     = totalBeds > 0 ? Math.round((totalAvailable / totalBeds) * 100) : 0;
  const overallStatus  =
    overallPct <= 15 ? { label: 'Critical',  color: 'text-red-600',    bg: 'bg-red-100'    } :
    overallPct <= 35 ? { label: 'Low',        color: 'text-orange-600', bg: 'bg-orange-100' } :
    overallPct <= 60 ? { label: 'Moderate',   color: 'text-yellow-600', bg: 'bg-yellow-100' } :
                       { label: 'Available',  color: 'text-green-600',  bg: 'bg-green-100'  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Bed Availability</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overallStatus.bg} ${overallStatus.color}`}>
            {overallStatus.label}
          </span>
          <button onClick={fetchBeds} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-gray-500">Total available</span>
        <span className="font-bold text-gray-900">{totalAvailable} / {totalBeds} beds</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${overallPct}%`,
            background: overallPct <= 15 ? '#ef4444' : overallPct <= 35 ? '#f97316' : '#22c55e',
          }}
        />
      </div>

      {/* Ward rows */}
      <div className="space-y-3">
        {wards.map((ward) => {
          const style   = CATEGORY_STYLE[ward.category];
          const pct     = ward.total > 0 ? Math.round((ward.available / ward.total) * 100) : 0;
          const urgency = ward.available === 0 ? 'FULL' : ward.available <= 2 ? 'LOW' : null;

          return (
            <div key={ward.name} className={`${style.bg} rounded-xl p-3`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${style.bg} ${style.text} border border-current/20`}>
                    {style.label}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{ward.name}</span>
                  {urgency && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${urgency === 'FULL' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                      {urgency}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-bold ${style.text}`}>
                  {ward.available}<span className="text-gray-400 font-normal">/{ward.total}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: style.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-4 text-right">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default BedTracker;
