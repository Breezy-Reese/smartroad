import { validateEmail, validatePhone } from './authValidator';

export interface EmergencyContactData {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export interface ContactValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateEmergencyContact = (data: EmergencyContactData): ContactValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }
  
  if (!data.relationship || data.relationship.trim().length < 2) {
    errors.relationship = 'Relationship is required';
  }
  
  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateEmergencyContacts = (contacts: EmergencyContactData[]): boolean => {
  if (!contacts || contacts.length === 0) return false;
  
  // Check if there's at least one primary contact
  const hasPrimary = contacts.some(contact => contact.isPrimary);
  if (!hasPrimary && contacts.length > 0) {
    return false;
  }
  
  // Validate each contact
  return contacts.every(contact => 
    validateEmergencyContact(contact).isValid
  );
};