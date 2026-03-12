import React, { useState, useEffect } from 'react';
import { UserGroupIcon, PlusIcon, TrashIcon, MapPinIcon, PhoneIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../../../services/api/axiosInstance';

interface Responder {
  _id: string;
  name: string;
  email: string;
  phone: string;
  responderType: string;
  isActive: boolean;
  currentLocation?: { lat: number; lng: number };
  certifications?: string[];
  experience?: number;
}

const typeColors: Record<string, string> = {
  ambulance: 'bg-red-100 text-red-700',
  police: 'bg-blue-100 text-blue-700',
  fire: 'bg-orange-100 text-orange-700',
  rescue: 'bg-green-100 text-green-700',
};

const ResponderList: React.FC = () => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [newResponder, setNewResponder] = useState({
    name: '', email: '', phone: '', responderType: 'ambulance', password: 'Password123!',
  });

  useEffect(() => { fetchResponders(); }, []);

  const fetchResponders = async () => {
  try {
    const res = await axiosInstance.get('/users/responders');
    const list = res.data?.data?.responders || [];
    setResponders(list);
  } catch {
    toast.error('Failed to load responders');
  } finally {
    setLoading(false);
  }
};

  const handleAddResponder = async () => {
    try {
      await axiosInstance.post('/auth/register', { ...newResponder, role: 'responder' });
      toast.success('Responder added!');
      setShowAddModal(false);
      setNewResponder({ name: '', email: '', phone: '', responderType: 'ambulance', password: 'Password123!' });
      fetchResponders();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add responder');
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this responder?')) return;
    try {
      await axiosInstance.delete(`/users/${id}`);
      toast.success('Responder removed');
      setResponders(prev => prev.filter(r => r._id !== id));
    } catch {
      toast.error('Failed to remove responder');
    }
  };

  const filtered = responders.filter(r => {
    if (filterType && r.responderType !== filterType) return false;
    if (filterStatus === 'active' && !r.isActive) return false;
    if (filterStatus === 'inactive' && r.isActive) return false;
    return true;
  });

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Responders</h1>
            <p className="text-gray-500 mt-1">{responders.length} total responders</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <PlusIcon className="h-5 w-5" /><span>Add Responder</span>
          </button>
        </div>
        <div className="flex space-x-4 mt-4">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Types</option>
            <option value="ambulance">Ambulance</option>
            <option value="police">Police</option>
            <option value="fire">Fire</option>
            <option value="rescue">Rescue</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => (
          <div key={r._id} className="bg-white rounded-lg shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <UserGroupIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[r.responderType] || 'bg-gray-100 text-gray-700'}`}>
                    {r.responderType}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {r.isActive ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-gray-400" />}
                <span className={`text-xs ${r.isActive ? 'text-green-600' : 'text-gray-400'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center space-x-2"><PhoneIcon className="h-4 w-4" /><span>{r.phone}</span></div>
              {r.currentLocation && (
                <div className="flex items-center space-x-2"><MapPinIcon className="h-4 w-4" /><span className="font-mono text-xs">{r.currentLocation.lat.toFixed(4)}, {r.currentLocation.lng.toFixed(4)}</span></div>
              )}
              {r.experience !== undefined && <p><span className="font-medium">Experience:</span> {r.experience} yrs</p>}
              {r.certifications?.length ? (
                <div className="flex flex-wrap gap-1">
                  {r.certifications.map(c => <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{c}</span>)}
                </div>
              ) : null}
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setSelectedResponder(r)} className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-100">Details</button>
              <button onClick={() => handleRemove(r._id)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No responders found</h3>
          <p className="text-gray-500 mt-1">Add a responder or adjust your filters.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Responder</h2>
            <div className="space-y-4">
              {[{label:'Full Name',key:'name',type:'text',placeholder:'John Doe'},{label:'Email',key:'email',type:'email',placeholder:'responder@email.com'},{label:'Phone',key:'phone',type:'tel',placeholder:'+254700000000'},{label:'Temp Password',key:'password',type:'text',placeholder:'Password123!'}].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(newResponder as any)[f.key]} onChange={e => setNewResponder(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={newResponder.responderType} onChange={e => setNewResponder(p => ({ ...p, responderType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500">
                  <option value="ambulance">Ambulance</option>
                  <option value="police">Police</option>
                  <option value="fire">Fire</option>
                  <option value="rescue">Rescue</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={handleAddResponder} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Add Responder</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedResponder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">{selectedResponder.name}</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Email:</span> {selectedResponder.email}</p>
              <p><span className="font-medium">Phone:</span> {selectedResponder.phone}</p>
              <p><span className="font-medium">Type:</span> {selectedResponder.responderType}</p>
              <p><span className="font-medium">Status:</span> {selectedResponder.isActive ? 'Active' : 'Inactive'}</p>
              <p><span className="font-medium">Experience:</span> {selectedResponder.experience ?? 0} years</p>
              {selectedResponder.certifications?.length ? (
                <div><span className="font-medium">Certifications:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{selectedResponder.certifications.map(c => <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{c}</span>)}</div>
                </div>
              ) : null}
            </div>
            <button onClick={() => setSelectedResponder(null)} className="w-full mt-6 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponderList;
