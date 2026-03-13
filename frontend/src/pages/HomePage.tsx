import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldExclamationIcon,
  TruckIcon,
  BuildingOfficeIcon,
  BoltIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ incidents: 0, hospitals: 0, time: 0 });

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statsVisible) return;
    const targets = { incidents: 12400, hospitals: 58, time: 4 };
    const duration = 2000;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCounts({
        incidents: Math.floor(ease * targets.incidents),
        hospitals: Math.floor(ease * targets.hospitals),
        time: Math.floor(ease * targets.time),
      });
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [statsVisible]);

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.4);opacity:0} }
        @keyframes scanLine { 0%{top:0;opacity:0} 5%{opacity:1} 95%{opacity:1} 100%{top:100%;opacity:0} }
        .fade-up { opacity:0; }
        .go .fade-up:nth-child(1){animation:fadeUp .7s ease .1s forwards}
        .go .fade-up:nth-child(2){animation:fadeUp .7s ease .25s forwards}
        .go .fade-up:nth-child(3){animation:fadeUp .7s ease .4s forwards}
        .go .fade-up:nth-child(4){animation:fadeUp .7s ease .55s forwards}
        .go .fade-up:nth-child(5){animation:fadeUp .7s ease .7s forwards}
        .pulse-ring{position:absolute;border-radius:9999px;border:1px solid rgba(220,38,38,.3);animation:pulseRing 2.5s ease-out infinite}
        .scan-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(220,38,38,.5),transparent);animation:scanLine 5s linear infinite}
        .ticker-strip{display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem 3rem;}
        .card-lift{transition:transform .3s ease,box-shadow .3s ease}
        .card-lift:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(220,38,38,.1)}
      `}</style>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-800 to-gray-900" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="scan-line" />

        {/* decorative */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
          {/* pulse GPS dot */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 hidden md:block">
            <div className="pulse-ring w-20 h-20" style={{ animationDelay: '0s' }} />
            <div className="pulse-ring w-20 h-20" style={{ animationDelay: '.8s' }} />
            <div className="pulse-ring w-20 h-20" style={{ animationDelay: '1.6s' }} />
            <div className="w-20 h-20 rounded-full bg-red-900/50 border border-red-500/40 flex items-center justify-center">
              <MapPinIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* ghost word */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[22vw] font-black text-white/[.025] select-none pointer-events-none leading-none">SAVE</div>

        {/* content */}
        <div className={`relative z-10 text-center px-6 max-w-4xl mx-auto ${visible ? 'go' : ''}`}>
          <div className="fade-up flex justify-center mb-6">
            <div className="bg-white/10 backdrop-blur border border-white/20 p-5 rounded-2xl">
              <ShieldExclamationIcon className="h-14 w-14 text-red-400" />
            </div>
          </div>

          <div className="fade-up flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-red-400" />
            <span className="text-xs font-semibold tracking-[.2em] uppercase text-red-400">Real-Time Emergency Response</span>
            <div className="h-px w-8 bg-red-400" />
          </div>

          <h1 className="fade-up text-5xl md:text-7xl font-black mb-4 leading-[1.05] tracking-tight">
            Smart Accident Detection
            <span className="block text-red-400">& Emergency Response</span>
          </h1>

          <p className="fade-up text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time accident detection, automatic emergency alerts,
            and instant response coordination to save lives on the road.
          </p>

          <div className="fade-up flex justify-center gap-4 flex-wrap mb-10">
            <Link to="/register" className="bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-600/30 flex items-center gap-2">
              Get Started <BoltIcon className="h-4 w-4" />
            </Link>
            <Link to="/login" className="border-2 border-white/30 text-white px-8 py-3.5 rounded-lg font-bold hover:bg-white/10 transition-all hover:-translate-y-0.5">
              Sign In
            </Link>
          </div>

          <div className="fade-up inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse" />
            System live · monitoring <strong className="text-white ml-1">Nairobi &amp; surroundings</strong>
          </div>
        </div>
      </section>

      {/* ─── TICKER (static) ─── */}
      <div className="bg-red-600 py-3 overflow-hidden">
        <div className="ticker-strip">
          {['REAL-TIME DETECTION','INSTANT DISPATCH','LIVE TRACKING','HOSPITAL ALERTS','24/7 MONITORING','NAIROBI COVERAGE'].map((t, j) => (
            <span key={j} className="text-xs font-black tracking-[.2em] uppercase flex items-center gap-8">
              {t} <span className="text-red-300 opacity-60">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── STATS ─── */}
      <section ref={statsRef} className="bg-gray-900 border-y border-gray-800 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-800 border border-gray-800 rounded-2xl overflow-hidden">
          {[
            { value: counts.incidents.toLocaleString() + '+', label: 'Incidents Tracked' },
            { value: counts.hospitals + '+', label: 'Partner Hospitals' },
            { value: counts.time + ' min', label: 'Avg Response Time' },
            { value: '99.9%', label: 'System Uptime' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-900 p-8 text-center">
              <div className="text-4xl md:text-5xl font-black text-white mb-2">{s.value}</div>
              <div className="text-sm text-gray-400 tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-white text-gray-900 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-red-600" />
              <span className="text-xs font-bold tracking-[.2em] uppercase text-red-600">The Process</span>
              <div className="h-px w-8 bg-red-600" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
              From Crash to Care <span className="text-red-600">in Minutes.</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Our system provides comprehensive emergency response capabilities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'Automatic Detection', desc: 'Advanced sensors detect accidents in real-time using speed, impact, and GPS — no manual input needed.', icon: <ShieldExclamationIcon className="h-7 w-7 text-red-600" /> },
              { num: '02', title: 'Instant Alerts', desc: 'Hospitals and responders receive immediate location-based notifications with severity level and patient info.', icon: <BoltIcon className="h-7 w-7 text-red-600" /> },
              { num: '03', title: 'Coordinated Response', desc: 'Nearest available ambulance dispatched and tracked in real-time on the hospital dashboard.', icon: <TruckIcon className="h-7 w-7 text-red-600" /> },
            ].map((item, i) => (
              <div key={i} className="card-lift bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-7xl font-black text-red-600/[.06] leading-none select-none">{item.num}</div>
                <div className="bg-red-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO IT'S FOR ─── */}
      <section className="bg-gray-100 text-gray-900 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-red-600" />
              <span className="text-xs font-bold tracking-[.2em] uppercase text-red-600">Built For</span>
              <div className="h-px w-8 bg-red-600" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Who It's For</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Drivers', desc: 'Automatic SOS — no button needed. Sensors detect any crash and call for help even if you are unconscious.', icon: <TruckIcon className="h-10 w-10 text-red-600" />, link: '/register?role=driver' },
              { title: 'Hospitals', desc: 'Receive live emergency alerts with GPS, severity, and patient info before the ambulance arrives.', icon: <BuildingOfficeIcon className="h-10 w-10 text-red-600" />, link: '/register?role=hospital' },
              { title: 'Responders', desc: 'Accept incidents, navigate routes, and update your status in real-time from your mobile dashboard.', icon: <ShieldExclamationIcon className="h-10 w-10 text-red-600" />, link: '/contact' },
            ].map((item, i) => (
              <div key={i} className="card-lift bg-white rounded-2xl shadow-md p-8 text-center flex flex-col items-center">
                <div className="bg-red-50 border border-red-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-500 mb-6 leading-relaxed">{item.desc}</p>
                <Link to={item.link} className="mt-auto text-red-600 font-bold hover:text-red-700 flex items-center gap-1 group">
                  Learn More <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURE STRIP ─── */}
      <section className="bg-gray-900 border-t border-gray-800 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { icon: <ClockIcon className="h-6 w-6" />, label: '24/7 Monitoring', desc: 'Always on, never misses an incident' },
            { icon: <MapPinIcon className="h-6 w-6" />, label: 'GPS Precision', desc: 'Meter-accurate location reporting' },
            { icon: <BoltIcon className="h-6 w-6" />, label: 'Instant Alerts', desc: 'Sub-second notification delivery' },
            { icon: <BuildingOfficeIcon className="h-6 w-6" />, label: 'Multi-Hospital', desc: 'Connects entire hospital networks' },
          ].map((f, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="text-red-400 mb-1">{f.icon}</div>
              <div className="font-bold text-white text-sm">{f.label}</div>
              <div className="text-gray-500 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative bg-red-700 text-white py-24 text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-900" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[20vw] font-black text-white/[.04] select-none pointer-events-none leading-none">JOIN</div>
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Ready to enhance<br />road safety?
          </h2>
          <p className="text-lg mb-10 text-red-100 leading-relaxed">
            Join our network of drivers and hospitals today.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/register" className="bg-white text-red-700 px-8 py-3.5 rounded-lg font-bold hover:bg-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-xl">
              Get Started Now
            </Link>
            <Link to="/login" className="border-2 border-white/40 text-white px-8 py-3.5 rounded-lg font-bold hover:bg-white/10 transition-all hover:-translate-y-0.5">
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
