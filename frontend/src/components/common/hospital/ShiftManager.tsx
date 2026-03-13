import React, { useEffect, useState } from 'react';
import { hospitalService } from '../../../services/api/hospital.service';
import { UserGroupIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ShiftResponder {
  _id: string;
  name: string;
  role: string;
  shiftStart: string; // ISO or HH:mm
  shiftEnd: string;
  status: 'on-duty' | 'off-duty' | 'on-call' | 'responding';
  assignedIncident?: string;
}

interface ShiftManagerProps {
  hospitalId?: string;
  refreshInterval?: number;
}

const STATUS_STYLE: Record<ShiftResponder['status'], { bg: string; text: string; dot: string; label: string }> = {
  'on-duty':    { bg: 'bg-green-100',  text: 'text-green-700',  dot: '#22c55e', label: 'On Duty'    },
  'off-duty':   { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: '#9ca3af', label: 'Off Duty'   },
  'on-call':    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: '#3b82f6', label: 'On Call'    },
  'responding': { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#f97316', label: 'Responding' },
};

const ShiftManager: React.FC<ShiftManagerProps> = ({
  hospitalId,
  refreshInterval = 60000,
}) => {
  const [responders, setResponders] = useState<ShiftResponder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<ShiftResponder['status'] | 'all'>('all');

  const fetchShifts = async () => {
    try {
      let data: ShiftResponder[] = [];
      try {
        const res = await hospitalService.getShifts?.(hospitalId);
        data = res ?? [];
      } catch {
        // Mock data until backend is ready
        const now = new Date();
        const fmt = (d: Date) => d.toTimeString().slice(0, 5);
        const add = (h: number) => { const d = new Date(now); d.setHours(d.getHours() + h); return d; };
        data = [
          { _id: '1', name: 'James Mwangi',   role: 'Paramedic',    shiftStart: fmt(now),     shiftEnd: fmt(add(8)),  status: 'on-duty'    },
          { _id: '2', name: 'Aisha Odhiambo', role: 'EMT',          shiftStart: fmt(now),     shiftEnd: fmt(add(8)),  status: 'responding', assignedIncident: 'INC-4821' },
          { _id: '3', name: 'Brian Kariuki',  role: 'Paramedic',    shiftStart: fmt(add(-4)), shiftEnd: fmt(add(4)),  status: 'on-duty'    },
          { _id: '4', name: 'Grace Wanjiku',  role: 'Nurse',        shiftStart: fmt(add(2)),  shiftEnd: fmt(add(10)), status: 'on-call'    },
          { _id: '5', name: 'Peter Otieno',   role: 'EMT',          shiftStart: fmt(add(-8)), shiftEnd: fmt(now),     status: 'off-duty'   },
          { _id: '6', name: 'Mary Njeri',     role: 'Paramedic',    shiftStart: fmt(add(4)),  shiftEnd: fmt(add(12)), status: 'on-call'    },
        ];
      }
      setResponders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
    const interval = setInterval(fetchShifts, refreshInterval);
    return () => clearInterval(interval);
  }, [hospitalId, refreshInterval]);

  const counts = {
    all:        responders.length,
    'on-duty':  responders.filter(r => r.status === 'on-duty').length,
    'responding': responders.filter(r => r.status === 'responding').length,
    'on-call':  responders.filter(r => r.status === 'on-call').length,
    'off-duty': responders.filter(r => r.status === 'off-duty').length,
  };

  const displayed = filter === 'all'
    ? responders
    : responders.filter(r => r.status === filter);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Responder Shifts</h2>
        </div>
        <button onClick={fetchShifts} className="text-gray-400 hover:text-gray-600">
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'on-duty', 'responding', 'on-call', 'off-duty'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === tab
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'all' ? 'All' : STATUS_STYLE[tab].label}
            <span className="ml-1.5 opacity-70">{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Responder list */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No responders in this category</p>
        ) : (
          displayed.map(responder => {
            const style = STATUS_STYLE[responder.status];
            return (
              <div
                key={responder._id}
                className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar initials */}
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {responder.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{responder.name}</p>
                    <p className="text-xs text-gray-500">{responder.role}
                      {responder.assignedIncident && (
                        <span className="ml-2 text-orange-600 font-medium">→ {responder.assignedIncident}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Shift times */}
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Shift</p>
                    <p className="text-xs font-mono text-gray-600">{responder.shiftStart} – {responder.shiftEnd}</p>
                  </div>

                  {/* Status badge */}
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-black text-green-600">{counts['on-duty'] + counts['responding']}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div>
          <p className="text-lg font-black text-blue-600">{counts['on-call']}</p>
          <p className="text-xs text-gray-400">On Call</p>
        </div>
        <div>
          <p className="text-lg font-black text-gray-400">{counts['off-duty']}</p>
          <p className="text-xs text-gray-400">Off Duty</p>
        </div>
      </div>
    </div>
  );
};

export default ShiftManager;
