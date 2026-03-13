import React from 'react';
import { ShieldExclamationIcon, HeartIcon, GlobeAltIcon, BoltIcon } from '@heroicons/react/24/outline';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── HERO ─── */}
      <section className="relative bg-gradient-to-br from-red-900 via-red-800 to-gray-900 py-28 overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-red-400" />
            <span className="text-xs font-semibold tracking-[.2em] uppercase text-red-400">Our Story</span>
            <div className="h-px w-8 bg-red-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            About Smart Accident<br /><span className="text-red-400">Detection System</span>
          </h1>
          <p className="text-xl text-red-100 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to reduce emergency response times and save lives through
            innovative technology built for Nairobi's roads.
          </p>
        </div>
      </section>

      {/* ─── MISSION ─── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-red-600" />
              <span className="text-xs font-bold tracking-[.2em] uppercase text-red-600">Our Mission</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 tracking-tight">
              Every Second Counts.
            </h2>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              Our system is designed to eliminate the critical gap between an accident occurring
              and emergency services being notified.
            </p>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              By leveraging real-time data, AI-powered detection, and instant communication,
              we ensure that help arrives as quickly as possible when it matters most.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              We believe technology should serve humanity — and there's no better application
              than saving lives on our roads.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <HeartIcon className="h-7 w-7 text-red-600" />, title: '500+ Lives Impacted', sub: 'And counting every day' },
              { icon: <GlobeAltIcon className="h-7 w-7 text-red-600" />, title: 'Nationwide Coverage', sub: 'Partnered with 50+ hospitals' },
              { icon: <BoltIcon className="h-7 w-7 text-red-600" />, title: '4 Min Avg Response', sub: '80% faster than manual dispatch' },
              { icon: <ShieldExclamationIcon className="h-7 w-7 text-red-600" />, title: '99.9% Uptime', sub: 'Enterprise-grade reliability' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="bg-red-50 border border-red-100 w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TEAM ─── */}
      <section className="bg-white py-24 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-red-600" />
              <span className="text-xs font-bold tracking-[.2em] uppercase text-red-600">The People</span>
              <div className="h-px w-8 bg-red-600" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Our Team</h2>
            <p className="text-xl text-gray-500">
              Dedicated professionals working to make roads safer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { initials: 'JD', name: 'John Doe', role: 'Founder & CEO', bio: 'Former emergency responder with 15 years of field experience.' },
              { initials: 'JS', name: 'Jane Smith', role: 'CTO', bio: 'AI and IoT expert passionate about emergency response technology.' },
              { initials: 'MK', name: 'Dr. Mary Kim', role: 'Medical Director', bio: 'Emergency physician ensuring medical protocols are followed.' },
            ].map((person, i) => (
              <div key={i} className="text-center group">
                <div className="w-28 h-28 bg-red-50 border-2 border-red-100 rounded-full mx-auto mb-5 flex items-center justify-center group-hover:border-red-400 transition-colors">
                  <span className="text-3xl font-black text-red-600">{person.initials}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{person.name}</h3>
                <p className="text-red-600 font-semibold text-sm mb-3 tracking-wide">{person.role}</p>
                <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{person.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
