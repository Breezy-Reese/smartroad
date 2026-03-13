import React, { useState } from 'react';
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── HERO ─── */}
      <section className="relative bg-gradient-to-br from-red-900 via-red-800 to-gray-900 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-red-400" />
            <span className="text-xs font-semibold tracking-[.2em] uppercase text-red-400">Get In Touch</span>
            <div className="h-px w-8 bg-red-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            Contact <span className="text-red-400">Us</span>
          </h1>
          <p className="text-xl text-red-100 max-w-2xl mx-auto leading-relaxed">
            Get in touch with our team for any questions or support
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-20">

        {/* ─── CONTACT CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {[
            {
              icon: <PhoneIcon className="h-6 w-6 text-red-600" />,
              title: 'Emergency Support',
              primary: '+254 700 000 000',
              sub: '24/7 available',
            },
            {
              icon: <EnvelopeIcon className="h-6 w-6 text-red-600" />,
              title: 'Email Us',
              primary: 'support@sads.co.ke',
              sub: 'info@sads.co.ke',
            },
            {
              icon: <MapPinIcon className="h-6 w-6 text-red-600" />,
              title: 'Visit Us',
              primary: '123 Tech Park, Nairobi',
              sub: 'Kenya',
            },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="bg-red-50 border border-red-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5">
                {card.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-red-600 font-bold text-lg mb-1">{card.primary}</p>
              <p className="text-sm text-gray-400">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ─── FORM ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-red-600" />
              <span className="text-xs font-bold tracking-[.2em] uppercase text-red-600">Message Us</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Send us a Message</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
                <input
                  type="text" name="name" required value={formData.name} onChange={handleChange}
                  placeholder="Dr. James Mwangi"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email" name="email" required value={formData.email} onChange={handleChange}
                  placeholder="james@hospital.co.ke"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
              <input
                type="text" name="subject" required value={formData.subject} onChange={handleChange}
                placeholder="Partnership inquiry / Technical support / General"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
              <textarea
                name="message" required rows={6} value={formData.message} onChange={handleChange}
                placeholder="Tell us how we can help..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
              />
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-600/25 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
              ) : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
