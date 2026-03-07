import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import AuthLayout from './AuthLayout';

type UserRole = 'driver' | 'hospital' | 'admin';

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'role' ? (value as UserRole) : value,
    }));
  };

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

  return (
    <AuthLayout title={''} subtitle={''} children={undefined}>
      {/* HEADER */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
        <p className="text-sm text-gray-600 mt-1">
          Join the emergency response network
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* FORM */}
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="driver">Driver</option>
            <option value="hospital">Hospital</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* DRIVER FIELD */}
        {formData.role === 'driver' && (
          <InputField
            label="Driver License Number"
            name="licenseNumber"
            type="text"
            value={formData.licenseNumber}
            onChange={handleChange}
          />
        )}

        {/* HOSPITAL FIELD */}
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
          className="w-full bg-red-600 text-white py-3 rounded-lg
          hover:bg-red-700 transition font-medium
          disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

      </form>

      {/* LOGIN LINK */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-red-600 hover:text-red-500 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

/* INPUT COMPONENT */
interface InputProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

const InputField: React.FC<InputProps> = ({ label, name, type, value, onChange }) => (
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
      className="w-full px-4 py-3 border border-gray-300 rounded-lg
      focus:ring-2 focus:ring-red-500 outline-none"
    />
  </div>
);

export default Register;