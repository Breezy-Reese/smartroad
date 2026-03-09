// src/components/auth/Register.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../api/';
import AuthLayout from './AuthLayout';
import type { UserRole, ResponderType } from '../../../api/';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  phone: string;
  licenseNumber: string;
  hospitalName: string;
  responderType: ResponderType | '';
  hospitalId: string;
}

const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*]/,
};

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!passwordRegex.uppercase.test(password)) return 'Password must contain at least one uppercase letter';
  if (!passwordRegex.lowercase.test(password)) return 'Password must contain at least one lowercase letter';
  if (!passwordRegex.number.test(password)) return 'Password must contain at least one number';
  if (!passwordRegex.special.test(password)) return 'Password must contain at least one special character (!@#$%^&*)';
  return null;
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading, error: authError } = useAuth();

  const [formData, setFormData] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'driver',
    phone: '',
    licenseNumber: '',
    hospitalName: '',
    responderType: '',
    hospitalId: '',
  });

  const [localError, setLocalError] = useState('');

  const error = localError || authError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    // Build payload — only include role-relevant fields
    const payload: any = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      phone: formData.phone,
    };

    if (formData.role === 'driver' && formData.licenseNumber) {
      payload.licenseNumber = formData.licenseNumber;
    }
    if (formData.role === 'hospital' && formData.hospitalName) {
      payload.hospitalName = formData.hospitalName;
    }
    if (formData.role === 'responder') {
      if (formData.responderType) payload.responderType = formData.responderType;
      if (formData.hospitalId) payload.hospitalId = formData.hospitalId;
    }

    try {
      await register(payload);
      const redirectMap: Record<UserRole, string> = {
        driver: '/driver/dashboard',
        hospital: '/hospital/dashboard',
        responder: '/responder/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(redirectMap[formData.role] ?? '/dashboard');
    } catch {
      // error already set via useAuth
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Join the emergency response network">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Full Name" name="name" type="text" value={formData.name} onChange={handleChange} />
        <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
        <InputField label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} />

        {/* Role Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="driver">Driver</option>
            <option value="hospital">Hospital</option>
            <option value="admin">Admin</option>
            <option value="responder">Responder</option>
          </select>
        </div>

        {/* Driver Fields */}
        {formData.role === 'driver' && (
          <InputField
            label="Driver License Number"
            name="licenseNumber"
            type="text"
            value={formData.licenseNumber}
            onChange={handleChange}
          />
        )}

        {/* Hospital Fields */}
        {formData.role === 'hospital' && (
          <InputField
            label="Hospital Name"
            name="hospitalName"
            type="text"
            value={formData.hospitalName}
            onChange={handleChange}
          />
        )}

        {/* Responder Fields */}
        {formData.role === 'responder' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responder Type</label>
              <select
                name="responderType"
                value={formData.responderType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">Select type...</option>
                <option value="ambulance">Ambulance</option>
                <option value="police">Police</option>
                <option value="fire">Fire</option>
                <option value="rescue">Rescue</option>
              </select>
            </div>
            <InputField
              label="Hospital ID (if applicable)"
              name="hospitalId"
              type="text"
              value={formData.hospitalId}
              onChange={handleChange}
              required={false}
            />
          </>
        )}

        {/* Password with hint */}
        <div>
          <InputField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Min 8 characters with uppercase, lowercase, number and special character (!@#$%^&*)
          </p>
        </div>

        <InputField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 hover:text-red-500 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

interface InputProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
}

const InputField: React.FC<InputProps> = ({ label, name, type, value, onChange, required = true }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      name={name}
      required={required}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
    />
  </div>
);

export default Register;
