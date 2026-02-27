import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldExclamationIcon, TruckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emergency-600 to-emergency-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full opacity-10"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full opacity-10"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-white p-4 rounded-full">
                <ShieldExclamationIcon className="h-16 w-16 text-emergency-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Smart Accident Detection
              <span className="block text-emergency-200"> & Emergency Response System</span>
            </h1>
            <p className="text-xl text-emergency-100 mb-10 max-w-3xl mx-auto">
              Real-time accident detection, automatic emergency alerts, and instant response coordination
              to save lives on the road.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="bg-white text-emergency-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-emergency-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">
              Our system provides comprehensive emergency response capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-emergency-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emergency-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Automatic Detection</h3>
              <p className="text-gray-600">
                Advanced sensors and AI algorithms detect accidents in real-time using speed, impact force,
                and airbag deployment data.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-emergency-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emergency-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Alerts</h3>
              <p className="text-gray-600">
                Emergency contacts and nearby hospitals are immediately notified with your exact location
                and incident details.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-emergency-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emergency-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Coordinated Response</h3>
              <p className="text-gray-600">
                Hospitals can dispatch the nearest available ambulance and track responders in real-time
                to your location.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* For Whom Section */}
      <div className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Who It's For</h2>
            <p className="text-xl text-gray-600">
              Designed for drivers, hospitals, and emergency responders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="bg-emergency-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TruckIcon className="h-10 w-10 text-emergency-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Drivers</h3>
              <p className="text-gray-600 mb-4">
                Get peace of mind knowing that help is just a button press away. Your emergency contacts
                will be notified automatically.
              </p>
              <Link
                to="/register?role=driver"
                className="text-emergency-600 font-semibold hover:text-emergency-700"
              >
                Register as Driver →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="bg-emergency-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="h-10 w-10 text-emergency-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Hospitals</h3>
              <p className="text-gray-600 mb-4">
                Receive real-time incident alerts, dispatch ambulances, and coordinate with responders
                through our integrated dashboard.
              </p>
              <Link
                to="/register?role=hospital"
                className="text-emergency-600 font-semibold hover:text-emergency-700"
              >
                Register as Hospital →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="bg-emergency-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldExclamationIcon className="h-10 w-10 text-emergency-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Responders</h3>
              <p className="text-gray-600 mb-4">
                Get dispatched to incidents, navigate to the exact location, and provide critical updates
                during response.
              </p>
              <Link
                to="/contact"
                className="text-emergency-600 font-semibold hover:text-emergency-700"
              >
                Contact for Access →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-emergency-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-emergency-200">Drivers Protected</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-emergency-200">Partner Hospitals</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">1000+</div>
              <div className="text-emergency-200">Incidents Handled</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">8min</div>
              <div className="text-emergency-200">Average Response Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to enhance road safety?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join our network of drivers and hospitals today.
          </p>
          <Link
            to="/register"
            className="inline-block bg-emergency-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emergency-700 transition-colors"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;