import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layouts
import MainLayout from './components/common/Layout/MainLayout';
import AuthLayout from './components/common/Layout/AuthLayout';
import EmergencyLayout from './components/common/Layout/EmergencyLayout';

// Auth Components
import Login from './components/common/auth/Login';
import Register from './components/common/auth/Register';
import ProtectedRoute from './components/common/auth/ProtectedRoute';

// Driver Components
import DriverDashboard from './components/common/driver/Dashboard/DriverDashboard';
import EmergencyContacts from './components/common/driver/Dashboard/Emergency/EmergencyContacts';
import TripHistory from './components/common/driver/Dashboard/Trips/TripHistory';

// Hospital Components
import HospitalDashboard from './components/common/hospital/HospitalDashboard';
import IncidentList from './components/common/hospital/IncidentList';

// Emergency Components
import AlertScreen from "./components/common/emergency/AlertScreen";

// Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          <Routes>
            {/* Public Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Emergency Routes - Public */}
            <Route element={<EmergencyLayout />}>
              <Route path="/alert/:incidentId" element={<AlertScreen />} />
            </Route>

            {/* Main Routes with Layout */}
            <Route element={<MainLayout />}>
              {/* Home/Info Pages */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Driver Routes */}
              <Route
                path="/driver"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/contacts"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <EmergencyContacts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/trips"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <TripHistory />
                  </ProtectedRoute>
                }
              />

              {/* Hospital Routes */}
              <Route
                path="/hospital"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                    <HospitalDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/incidents"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                    <IncidentList />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;