import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldExclamationIcon,
  TruckIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-screen flex items-center justify-center">

        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-700 to-red-900"></div>

        {/* Soft Overlay for Better Text Visibility */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        {/* Decorative Circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-5 rounded-full shadow-lg">
              <ShieldExclamationIcon className="h-16 w-16 text-red-700" />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Smart Accident Detection
            <span className="block text-red-200">
              & Emergency Response System
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto mb-10">
            Real-time accident detection, automatic emergency alerts,
            and instant response coordination to save lives on the road.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="bg-white text-red-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-700 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="bg-white text-gray-900 py-24 px-6">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Our system provides comprehensive emergency response capabilities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">

            {[
              {
                title: "Automatic Detection",
                desc: "Advanced sensors detect accidents in real-time using speed and impact data.",
                icon: <span className="text-2xl font-bold text-red-700">1</span>,
              },
              {
                title: "Instant Alerts",
                desc: "Hospitals and responders receive immediate location-based notifications.",
                icon: <span className="text-2xl font-bold text-red-700">2</span>,
              },
              {
                title: "Coordinated Response",
                desc: "Nearest ambulance dispatched and tracked in real-time.",
                icon: <span className="text-2xl font-bold text-red-700">3</span>,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl shadow-lg p-8 text-center hover:shadow-2xl transition"
              >
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ================= WHO IT'S FOR ================= */}
      <section className="bg-gray-100 text-gray-900 py-24 px-6">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Who It's For
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">

            {[
              {
                title: "Drivers",
                desc: "Help is one button away.",
                icon: <TruckIcon className="h-10 w-10 text-red-700" />,
                link: "/register?role=driver",
              },
              {
                title: "Hospitals",
                desc: "Receive live emergency alerts.",
                icon: <BuildingOfficeIcon className="h-10 w-10 text-red-700" />,
                link: "/register?role=hospital",
              },
              {
                title: "Responders",
                desc: "Get dispatched instantly.",
                icon: <ShieldExclamationIcon className="h-10 w-10 text-red-700" />,
                link: "/contact",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-2xl transition"
              >
                <div className="flex justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {item.desc}
                </p>
                <Link
                  to={item.link}
                  className="text-red-700 font-semibold hover:underline"
                >
                  Learn More →
                </Link>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-red-700 text-white py-20 text-center px-6">
        <h2 className="text-3xl font-bold mb-4">
          Ready to enhance road safety?
        </h2>

        <p className="text-lg mb-8 opacity-90">
          Join our network of drivers and hospitals today.
        </p>

        <Link
          to="/register"
          className="bg-white text-red-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Get Started Now
        </Link>
      </section>

    </div>
  );
};

export default HomePage;