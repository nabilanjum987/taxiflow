// src/app/page.tsx — TaxiFlow Marketing Landing Page + Web Booking
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, MapPin, Clock, Star, Shield, Smartphone, ChevronRight, Check, Phone, Mail, Zap } from 'lucide-react';
import axios from 'axios';

const bookingSchema = z.object({
  phone: z.string().min(7, 'Enter a valid phone number'),
  pickupAddress: z.string().min(1, 'Pickup address required'),
  dropoffAddress: z.string().min(1, 'Drop-off address required'),
  vehicleType: z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
  scheduledAt: z.string().optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

const VEHICLE_TYPES = [
  { value: 'STANDARD', label: 'Standard', desc: 'Up to 4 passengers', emoji: '🚗', price: 'From £5' },
  { value: 'EXECUTIVE', label: 'Executive', desc: 'Premium comfort', emoji: '🚙', price: 'From £9' },
  { value: 'MPV', label: 'MPV', desc: 'Up to 7 passengers', emoji: '🚐', price: 'From £7' },
  { value: 'WAV', label: 'Accessible', desc: 'Wheelchair accessible', emoji: '♿', price: 'From £6' },
];

export default function LandingPage() {
  const [bookingStep, setBookingStep] = useState<'form' | 'otp' | 'confirmed'>('form');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('STANDARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

  const { register, handleSubmit, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { vehicleType: 'STANDARD' },
  });

  const apiWithTenant = axios.create({ baseURL: API, headers: { 'x-tenant-id': TENANT_ID } });

  const onSubmitBooking = async (data: BookingForm) => {
    setSubmitting(true);
    setError('');
    try {
      setPhone(data.phone);
      await apiWithTenant.post('/auth/send-otp', { phone: data.phone });
      setBookingStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAndBook = async () => {
    setSubmitting(true);
    setError('');
    try {
      const authRes = await apiWithTenant.post('/auth/verify-otp', { phone, code: otp });
      const token = authRes.data.data.accessToken;

      await apiWithTenant.post('/bookings', {
        pickupAddress: 'Pickup from web booking',
        pickupLatitude: 51.5074,
        pickupLongitude: -0.1278,
        dropoffAddress: 'Drop-off from web booking',
        dropoffLatitude: 51.5200,
        dropoffLongitude: -0.1000,
        vehicleType: selectedVehicle,
        paymentMethod: 'CASH',
      }, { headers: { Authorization: `Bearer ${token}` } });

      setBookingStep('confirmed');
    } catch {
      setError('Invalid OTP or booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center"><Car size={16} className="text-white" /></div>
            <span className="font-bold text-gray-900 text-lg">CityRide</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {['Services', 'About', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{item}</a>
            ))}
          </div>
          <a href="#book" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">Book Now</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #f59e0b 0%, transparent 60%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium mb-6 border border-amber-500/20">
              <Zap size={12} /> Available 24/7
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Your city.<br />Your ride.<br />
              <span className="text-amber-400">On demand.</span>
            </h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Fast, reliable, and professional taxi service. Book in seconds, track in real-time.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#book" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-all">
                Book a Ride <ChevronRight size={18} />
              </a>
              <a href="#" className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-medium transition-colors">
                <Smartphone size={18} /> Get the App
              </a>
            </div>
            <div className="flex items-center gap-6 mt-10">
              {[['50K+', 'Happy Riders'], ['1,200+', 'Expert Drivers'], ['4.9★', 'Average Rating']].map(([val, lbl]) => (
                <div key={lbl}><div className="text-xl font-bold text-amber-400">{val}</div><div className="text-gray-400 text-xs">{lbl}</div></div>
              ))}
            </div>
          </div>

          {/* Booking Widget */}
          <div id="book" className="bg-white rounded-2xl p-6 shadow-2xl">
            {bookingStep === 'form' && (
              <>
                <h2 className="text-gray-900 font-bold text-lg mb-5">Book Your Ride</h2>
                <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Your Phone Number</label>
                    <input {...register('phone')} placeholder="+44 7700 000000"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1"><MapPin size={11} className="text-emerald-500" /> Pickup</label>
                    <input {...register('pickupAddress')} placeholder="Enter pickup address"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1"><MapPin size={11} className="text-red-500" /> Drop-off</label>
                    <input {...register('dropoffAddress')} placeholder="Enter drop-off address"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Vehicle Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {VEHICLE_TYPES.map(v => (
                        <button key={v.value} type="button" onClick={() => setSelectedVehicle(v.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${selectedVehicle === v.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="text-lg mb-0.5">{v.emoji}</div>
                          <div className="text-xs font-semibold text-gray-800">{v.label}</div>
                          <div className="text-xs text-gray-400">{v.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Clock size={11} /> Schedule (optional)</label>
                    <input {...register('scheduledAt')} type="datetime-local"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400 transition-all" />
                  </div>
                  {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {submitting ? 'Sending OTP...' : 'Continue →'}
                  </button>
                </form>
              </>
            )}

            {bookingStep === 'otp' && (
              <div className="py-4">
                <h2 className="text-gray-900 font-bold text-lg mb-2">Enter OTP</h2>
                <p className="text-gray-500 text-sm mb-5">We sent a 6-digit code to <strong>{phone}</strong></p>
                <input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-amber-400 transition-all mb-4" />
                {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
                <button onClick={verifyAndBook} disabled={submitting || otp.length < 6}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all disabled:opacity-60">
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
                <button onClick={() => setBookingStep('form')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors">← Back</button>
              </div>
            )}

            {bookingStep === 'confirmed' && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <h2 className="text-gray-900 font-bold text-xl mb-2">Booking Confirmed! 🎉</h2>
                <p className="text-gray-500 text-sm mb-6">We're finding you a driver. You'll receive an SMS when your driver is assigned.</p>
                <button onClick={() => setBookingStep('form')} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Book Another Ride
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Why Choose Us?</h2>
            <p className="text-gray-500">Professional, safe, and always on time</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: 'Always On Time', desc: 'Real-time GPS tracking so you always know where your driver is', color: 'bg-blue-100 text-blue-600' },
              { icon: Shield, title: 'Safe & Vetted', desc: 'All drivers are DBS checked, licensed, and professionally trained', color: 'bg-emerald-100 text-emerald-600' },
              { icon: Star, title: 'Top Rated', desc: '4.9 stars from over 50,000 happy passengers across the city', color: 'bg-amber-100 text-amber-600' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}><Icon size={22} /></div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple Pricing</h2>
            <p className="text-gray-500">No hidden fees. No surge surprises.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {VEHICLE_TYPES.map(v => (
              <div key={v.value} className="p-6 rounded-2xl border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all text-center group">
                <div className="text-4xl mb-3">{v.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-1">{v.label}</h3>
                <p className="text-gray-500 text-xs mb-3">{v.desc}</p>
                <div className="text-amber-600 font-bold">{v.price}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">Prices include all taxes. Final fare calculated on actual distance and duration.</p>
        </div>
      </section>

      {/* App Download */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Smartphone size={40} className="text-amber-400 mx-auto mb-5" />
          <h2 className="text-3xl font-bold mb-3">Get the App</h2>
          <p className="text-gray-400 mb-8">Book, track, and manage your rides from anywhere</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {['App Store', 'Google Play'].map(store => (
              <button key={store} className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors">
                <Phone size={18} className="text-amber-400" />
                <div className="text-left"><div className="text-xs text-gray-400">Download on</div><div className="text-sm font-semibold">{store}</div></div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-500">Available 24/7 for bookings and enquiries</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { icon: Phone, label: 'Call Us', value: '0800 123 4567', link: 'tel:08001234567', color: 'text-emerald-600 bg-emerald-50' },
              { icon: Mail, label: 'Email Us', value: 'hello@cityride.com', link: 'mailto:hello@cityride.com', color: 'text-blue-600 bg-blue-50' },
              { icon: Clock, label: 'Operating Hours', value: '24/7 — Always Open', link: null, color: 'text-amber-600 bg-amber-50' },
            ].map(({ icon: Icon, label, value, link, color }) => (
              <div key={label} className="p-6 rounded-2xl border border-gray-100">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${color}`}><Icon size={20} /></div>
                <div className="text-xs text-gray-400 mb-1">{label}</div>
                {link ? <a href={link} className="font-semibold text-gray-900 hover:text-amber-600 transition-colors">{value}</a>
                  : <div className="font-semibold text-gray-900">{value}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center"><Car size={12} className="text-white" /></div>
            <span className="font-bold text-gray-700 text-sm">CityRide</span>
          </div>
          <div className="text-xs text-gray-400">Powered by TaxiFlow © {new Date().getFullYear()}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
