import React from 'react';
import { ShieldExclamationIcon, HeartIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-emergency-600 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About Smart Accident Detection System
          </h1>
          <p className="text-xl text-emergency-100 max-w-3xl mx-auto">
            We're on a mission to reduce emergency response times and save lives through
            innovative technology.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-4">
                Every second counts in an emergency. Our system is designed to eliminate the
                critical gap between an accident occurring and emergency services being notified.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                By leveraging real-time data, AI-powered detection, and instant communication,
                we ensure that help arrives as quickly as possible when it matters most.
              </p>
              <p className="text-lg text-gray-600">
                We believe that technology should serve humanity, and there's no better application
                than saving lives on our roads.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-emergency-100 p-3 rounded-full">
                  <HeartIcon className="h-8 w-8 text-emergency-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">500+ Lives Impacted</h3>
                  <p className="text-gray-600">And counting</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-emergency-100 p-3 rounded-full">
                  <GlobeAltIcon className="h-8 w-8 text-emergency-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Nationwide Coverage</h3>
                  <p className="text-gray-600">Partnered with 50+ hospitals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Team</h2>
            <p className="text-xl text-gray-600">
              Dedicated professionals working to make roads safer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-32 h-32 bg-emergency-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl text-emergency-600">JD</span>
              </div>
              <h3 className="text-xl font-bold mb-1">John Doe</h3>
              <p className="text-emergency-600 mb-2">Founder & CEO</p>
              <p className="text-gray-600">
                Former emergency responder with 15 years of experience.
              </p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-emergency-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl text-emergency-600">JS</span>
              </div>
              <h3 className="text-xl font-bold mb-1">Jane Smith</h3>
              <p className="text-emergency-600 mb-2">CTO</p>
              <p className="text-gray-600">
                AI and IoT expert passionate about emergency response technology.
              </p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-emergency-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl text-emergency-600">MK</span>
              </div>
              <h3 className="text-xl font-bold mb-1">Dr. Mary Kim</h3>
              <p className="text-emergency-600 mb-2">Medical Director</p>
              <p className="text-gray-600">
                Emergency physician ensuring medical protocols are followed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;