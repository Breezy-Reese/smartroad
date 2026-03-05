import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import AuthLayout from './AuthLayout';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ================= HANDLE SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password, rememberMe });

      // Redirect after successful login
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access the emergency response system"
    >

      {/* ===== ERROR MESSAGE ===== */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ===== FORM ===== */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* EMAIL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl
            focus:ring-4 focus:ring-emergency-200 focus:border-emergency-500
            outline-none transition"
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl
            focus:ring-4 focus:ring-emergency-200 focus:border-emergency-500
            outline-none transition"
          />
        </div>

        {/* REMEMBER + FORGOT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-emergency-600 border-gray-300 rounded focus:ring-emergency-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <Link
            to="/forgot-password"
            className="text-sm text-emergency-600 hover:text-emergency-500"
          >
            Forgot password?
          </Link>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emergency-600 text-white py-3 px-4 rounded-xl
          font-medium hover:bg-emergency-700 transition
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-4 focus:ring-emergency-300"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

      </form>

      {/* REGISTER LINK */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-emergency-600 hover:text-emergency-500"
          >
            Register here
          </Link>
        </p>
      </div>

      {/* ===== DEMO CREDENTIALS ===== */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <p className="text-xs font-medium text-gray-500 mb-2">
          Demo Credentials:
        </p>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold">Driver:</p>
            <p>driver@test.com</p>
            <p>password123</p>
          </div>

          <div>
            <p className="font-semibold">Hospital:</p>
            <p>hospital@test.com</p>
            <p>password123</p>
          </div>
        </div>
      </div>

    </AuthLayout>
  );
};

export default Login;