import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layouts
import MainLayout from './components/common/Layout/MainLayout';
import AuthLayout from './components/common/Layout/AuthLayout';
import EmergencyLayout from './components/common/Layout/EmergencyLayout';

// Auth
import Login from './components/common/auth/Login';
import Register from './components/common/auth/Register';
import ForgotPassword from './components/common/auth/ForgotPassword/ForgotPassword';
import ResetPassword from './components/common/auth/ForgotPassword/ResetPassword';
import ProtectedRoute from './components/common/auth/ProtectedRoute';

// Driver — existing
import DriverDashboard from './components/common/driver/Dashboard/DriverDashboard';
import EmergencyContacts from './components/common/driver/Dashboard/Emergency/EmergencyContacts';
import TripHistory from './components/common/driver/Dashboard/Trips/TripHistory';
import DriverProfile from './components/common/driver/Dashboard/Profile/DriverProfile';

// Driver — Phase 3
import MedicalProfileScreen from './components/common/driver/Dashboard/MedicalProfileScreen';
import TripScoringScreen from './components/common/driver/Dashboard/TripScoringScreen';
import OfflineModeScreen from './components/common/driver/Dashboard/OfflineModeScreen';
import DriverPreferencesScreen from './components/common/driver/Dashboard/DriverPreferencesScreen';

// Driver — Phase 4
import NextOfKinScreen from './components/common/driver/Dashboard/NextOfKinScreen';
import EscalationPolicyScreen from './components/common/driver/Dashboard/EscalationPolicyScreen';
import NotificationSettingsScreen from './components/common/driver/Dashboard/NotificationSettingsScreen';
import DeliveryReceiptsScreen from './components/common/driver/Dashboard/DeliveryReceiptsScreen';

// Hospital
import HospitalDashboard from './components/common/hospital/HospitalDashboard';
import IncidentList from './components/common/hospital/IncidentList';
import AmbulanceList from './components/common/hospital/Ambulances/AmbulanceList';
import ResponderList from './components/common/hospital/Responders/ResponderList';
import ResponseAnalytics from './components/common/hospital/Analytics/ResponseAnalytics';
import HospitalProfile from './components/common/hospital/Settings/HospitalProfile';
import BedTracker from './components/common/hospital/BedTracker';
import ShiftManager from './components/common/hospital/ShiftManager';
import HospitalIncidents from './components/common/hospital/Incidents/HospitalIncidents';
import ETAPage from './components/common/hospital/ETAPage';
// Admin — existing
import AdminDashboard from './components/common/admin/Dashboard/AdminDashboard';
import UserManagement from './components/common/admin/Users/UserManagement';
import UserRoles from './components/common/admin/Users/UserRoles';
import SystemHealth from './components/common/admin/System/SystemHealth';
import Logs from './components/common/admin/System/Logs';
import SystemReports from './components/common/admin/Reports/SystemReports';

// Admin — Phase 5
import FleetAdminDashboard from './components/screens/AdminDashboard';
import HeatmapScreen from './components/screens/HeatmapScreen';
import AuditLogScreen from './components/screens/AuditLogScreen';
import ExportsScreen from './components/screens/ExportsScreen';

// Emergency
import AlertScreen from './components/common/emergency/AlertScreen';

// Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff' },
              success: {
                duration: 3000,
                iconTheme: { primary: '#10b981', secondary: '#fff' },
              },
              error: {
                duration: 5000,
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />

          <Routes>
            {/* Public Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Emergency Routes */}
            <Route element={<EmergencyLayout />}>
              <Route path="/alert/:incidentId" element={<AlertScreen />} />
            </Route>

            {/* Main Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* ── Driver Routes ── */}
              <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
              <Route path="/driver/contacts" element={<ProtectedRoute allowedRoles={['driver']}><EmergencyContacts /></ProtectedRoute>} />
              <Route path="/driver/trips" element={<ProtectedRoute allowedRoles={['driver']}><TripHistory /></ProtectedRoute>} />
              <Route path="/driver/profile" element={<ProtectedRoute allowedRoles={['driver']}><DriverProfile /></ProtectedRoute>} />

              {/* Phase 3 — Driver layer */}
              <Route path="/driver/medical" element={<ProtectedRoute allowedRoles={['driver']}><MedicalProfileScreen /></ProtectedRoute>} />
              <Route path="/driver/scoring" element={<ProtectedRoute allowedRoles={['driver']}><TripScoringScreen /></ProtectedRoute>} />
              <Route path="/driver/offline" element={<ProtectedRoute allowedRoles={['driver']}><OfflineModeScreen /></ProtectedRoute>} />
              <Route path="/driver/preferences" element={<ProtectedRoute allowedRoles={['driver']}><DriverPreferencesScreen /></ProtectedRoute>} />

              {/* Phase 4 — Notifications */}
              <Route path="/driver/next-of-kin" element={<ProtectedRoute allowedRoles={['driver']}><NextOfKinScreen /></ProtectedRoute>} />
              <Route path="/driver/escalation" element={<ProtectedRoute allowedRoles={['driver']}><EscalationPolicyScreen /></ProtectedRoute>} />
              <Route path="/driver/notification-settings" element={<ProtectedRoute allowedRoles={['driver']}><NotificationSettingsScreen /></ProtectedRoute>} />
              <Route path="/driver/delivery-receipts" element={<ProtectedRoute allowedRoles={['driver']}><DeliveryReceiptsScreen /></ProtectedRoute>} />

              {/* ── Hospital Routes ── */}
              <Route path="/hospital" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><HospitalDashboard /></ProtectedRoute>} />
              <Route path="/hospital/incidents" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><HospitalIncidents /></ProtectedRoute>} />
              <Route path="/hospital/responders" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><ResponderList /></ProtectedRoute>} />
              <Route path="/hospital/ambulances" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><AmbulanceList /></ProtectedRoute>} />
              <Route path="/hospital/analytics" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><ResponseAnalytics /></ProtectedRoute>} />
              <Route path="/hospital/beds" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><BedTracker /></ProtectedRoute>} />
              <Route path="/hospital/shifts" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><ShiftManager /></ProtectedRoute>} />
              <Route path="/hospital/settings" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><HospitalProfile /></ProtectedRoute>} />
              <Route path="/hospital/eta" element={<ProtectedRoute allowedRoles={['hospital', 'admin']}><ETAPage /></ProtectedRoute>} />
              {/* ── Admin Routes — existing ── */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
              <Route path="/admin/users/roles" element={<ProtectedRoute allowedRoles={['admin']}><UserRoles /></ProtectedRoute>} />
              <Route path="/admin/system" element={<ProtectedRoute allowedRoles={['admin']}><SystemHealth /></ProtectedRoute>} />
              <Route path="/admin/system/logs" element={<ProtectedRoute allowedRoles={['admin']}><Logs /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><SystemReports /></ProtectedRoute>} />

              {/* Phase 5 — Fleet admin */}
              <Route path="/admin/fleet" element={<ProtectedRoute allowedRoles={['admin']}><FleetAdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/heatmap" element={<ProtectedRoute allowedRoles={['admin']}><HeatmapScreen /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogScreen /></ProtectedRoute>} />
              <Route path="/admin/exports" element={<ProtectedRoute allowedRoles={['admin']}><ExportsScreen /></ProtectedRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
