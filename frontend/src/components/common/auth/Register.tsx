import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import AuthLayout from './AuthLayout';

/* ================= TYPES ================= */

type UserRole = 'driver' | 'hospital';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  phone: string;
  licenseNumber: string;
  hospitalName: string;
}

/* ======================================== */

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'driver',
    phone: '',
    licenseNumber: '',
    hospitalName: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ================= HANDLE CHANGE ================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'role' ? (value as UserRole) : value,
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...payload } = formData;

      await register(payload);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join the emergency response network"
    >

      {/* ===== ERROR ===== */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ===== FORM ===== */}
      <form onSubmit={handleSubmit} className="space-y-4">

        <InputField
          label="Full Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
        />

        <InputField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />

        <InputField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
        />

        {/* ROLE SELECT */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl 
            focus:ring-2 focus:ring-emergency-500 outline-none"
          >
            <option value="driver">Driver</option>
            <option value="hospital">Hospital</option>
          </select>
        </div>

        {/* CONDITIONAL FIELDS */}
        {formData.role === 'driver' && (
          <InputField
            label="Driver License Number"
            name="licenseNumber"
            type="text"
            value={formData.licenseNumber}
            onChange={handleChange}
          />
        )}

        {formData.role === 'hospital' && (
          <InputField
            label="Hospital Name"
            name="hospitalName"
            type="text"
            value={formData.hospitalName}
            onChange={handleChange}
          />
        )}

        <InputField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
        />

        <InputField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
        />

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emergency-600 text-white py-3 px-4 rounded-xl
          font-medium hover:bg-emergency-700 transition
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-4 focus:ring-emergency-300"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

      </form>

      {/* LOGIN LINK */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-emergency-600 hover:text-emergency-500"
          >
            Sign in
          </Link>
        </p>
      </div>

    </AuthLayout>
  );
};

/* ================= REUSABLE INPUT ================= */

interface InputProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

const InputField: React.FC<InputProps> = ({
  label,
  name,
  type,
  value,
  onChange,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>

    <input
      type={type}
      name={name}
      required
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 border border-gray-300 rounded-xl
      focus:ring-2 focus:ring-emergency-500 outline-none transition"
    />
  </div>
);

export default Register;