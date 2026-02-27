import React, { useState, useEffect, useRef } from 'react';
import { emergencyService } from '../../../../../services/api/emergency.service';
import { PlusIcon, PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import ConfirmModal from "../../../Modals/ConfirmModal";

interface EmergencyContact {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    isPrimary: false,
  });
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchContacts();
  }, []);

  // Fallback to stop loading after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const fetchContacts = async () => {
    try {
      const data = await emergencyService.getEmergencyContacts();
      setContacts(data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedContact) {
        await emergencyService.updateEmergencyContact(selectedContact._id, formData);
        toast.success('Contact updated successfully');
      } else {
        await emergencyService.addEmergencyContact(formData);
        toast.success('Contact added successfully');
      }
      
      setShowAddModal(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error('Failed to save contact');
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    
    try {
      await emergencyService.deleteEmergencyContact(selectedContact._id);
      toast.success('Contact deleted successfully');
      setShowDeleteModal(false);
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      isPrimary: false,
    });
    setSelectedContact(null);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || '',
      isPrimary: contact.isPrimary,
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emergency-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Emergency Contacts</h2>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-emergency-600 text-white px-4 py-2 rounded-lg hover:bg-emergency-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Contact</span>
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Contacts</h3>
            <p className="text-gray-500 mb-4">
              Add emergency contacts who will be notified in case of an accident.
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-emergency-600 text-white px-6 py-2 rounded-lg hover:bg-emergency-700"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className={`border rounded-lg p-4 ${
                  contact.isPrimary ? 'border-emergency-500 bg-emergency-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">{contact.name}</h3>
                      {contact.isPrimary && (
                        <span className="bg-emergency-600 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{contact.relationship}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {contact.phone}
                      </p>
                      {contact.email && (
                        <p className="text-sm">
                          <span className="font-medium">Email:</span> {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-2 text-gray-600 hover:text-emergency-600 hover:bg-gray-100 rounded"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {selectedContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
                  placeholder="+254 XXX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emergency-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="h-4 w-4 text-emergency-600 focus:ring-emergency-500 border-gray-300 rounded"
                />
                <label htmlFor="isPrimary" className="ml-2 text-sm text-gray-700">
                  Set as primary contact
                </label>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-emergency-600 text-white py-2 rounded-lg hover:bg-emergency-700"
                >
                  {selectedContact ? 'Update' : 'Add'} Contact
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${selectedContact?.name} from your emergency contacts?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default EmergencyContacts;