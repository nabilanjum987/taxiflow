// src/pages/BookingDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, CreditCard, Star, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data.data),
    refetchInterval: 10_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => api.patch(`/bookings/${id}/cancel`, { reason }),
    onSuccess: () => { toast.success('Booking cancelled'); void qc.invalidateQueries({ queryKey: ['booking', id] }); },
  });

  const refundMutation = useMutation({
    mutationFn: () => api.post(`/payments/${id}/refund`, { reason: 'Admin initiated refund' }),
    onSuccess: () => { toast.success('Refund processed'); void qc.invalidateQueries({ queryKey: ['booking', id] }); },
  });

  const statusColors: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
    SEARCHING: 'bg-amber-50 text-amber-700 border-amber-200',
    DRIVER_ARRIVED: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-6"><div className="skeleton h-6 w-48 mb-4" /><div className="skeleton h-4 w-full" /></div>)}
    </div>
  );

  if (!booking) return <div className="text-center py-20 text-gray-400">Booking not found</div>;

  const b = booking;
  const canCancel = ['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(b.status);
  const canRefund = b.status === 'COMPLETED' && b.payment?.status === 'PAID' && b.paymentMethod === 'CARD';

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Booking #{b.id.slice(0, 8).toUpperCase()}</h1>
            <span className={`badge border text-xs font-medium px-2.5 py-1 ${statusColors[b.status] ?? 'bg-gray-50 text-gray-600'}`}>
              {b.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">{new Date(b.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <button onClick={() => { if (confirm('Cancel this booking?')) cancelMutation.mutate('Admin cancelled'); }}
              className="btn-danger text-sm">Cancel Booking</button>
          )}
          {canRefund && (
            <button onClick={() => { if (confirm('Process full refund?')) refundMutation.mutate(); }}
              className="btn-secondary text-sm flex items-center gap-1.5">
              <RefreshCw size={14} /> Refund
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Route */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin size={16} className="text-amber-500" /> Route</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 ring-2 ring-emerald-100" />
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Pickup</div>
                <div className="text-sm text-gray-800">{b.pickupAddress}</div>
              </div>
            </div>
            <div className="ml-1 border-l-2 border-dashed border-gray-200 h-6" />
            <div className="flex gap-3">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 ring-2 ring-red-100" />
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Dropoff</div>
                <div className="text-sm text-gray-800">{b.dropoffAddress}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-50">
            {[
              { label: 'Distance', value: b.distanceKm ? `${b.distanceKm.toFixed(1)} km` : '—' },
              { label: 'Duration', value: b.durationMinutes ? `${Math.round(b.durationMinutes)} min` : '—' },
              { label: 'Vehicle', value: b.vehicleType },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-sm font-semibold text-gray-900">{value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-amber-500" /> Payment</h2>
          <div className="space-y-2.5">
            {[
              { label: 'Estimated Fare', value: `£${b.estimatedFare?.toFixed(2)}` },
              { label: 'Actual Fare', value: b.actualFare ? `£${b.actualFare.toFixed(2)}` : '—' },
              { label: 'Discount', value: b.discountAmount > 0 ? `-£${b.discountAmount.toFixed(2)}` : '—' },
              { label: 'Method', value: b.paymentMethod },
              { label: 'Payment Status', value: b.paymentStatus },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          {b.promoCode && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-sm">
              <span className="text-gray-500">Promo Code</span>
              <span className="font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs">{b.promoCode}</span>
            </div>
          )}
        </div>

        {/* Passenger */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Passenger</h2>
          {b.passenger && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {b.passenger.user.firstName[0]}{b.passenger.user.lastName[0]}
              </div>
              <div>
                <div className="font-medium text-gray-900">{b.passenger.user.firstName} {b.passenger.user.lastName}</div>
                <div className="text-sm text-gray-500">{b.passenger.user.phone}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs text-gray-500">{b.passenger.rating?.toFixed(1) ?? '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Driver */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Driver</h2>
          {b.driver ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                {b.driver.user.firstName[0]}{b.driver.user.lastName[0]}
              </div>
              <div>
                <div className="font-medium text-gray-900">{b.driver.user.firstName} {b.driver.user.lastName}</div>
                <div className="text-sm text-gray-500">{b.driver.user.phone}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs text-gray-500">{b.driver.rating?.toFixed(1) ?? '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">No driver assigned</div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-amber-500" /> Timeline</h2>
        <div className="flex flex-wrap gap-6">
          {[
            { label: 'Created', time: b.createdAt },
            { label: 'Accepted', time: b.acceptedAt },
            { label: 'Driver Arrived', time: b.arrivedAt },
            { label: 'Started', time: b.startedAt },
            { label: 'Completed', time: b.completedAt },
            { label: 'Cancelled', time: b.cancelledAt },
          ].filter(e => e.time).map(({ label, time }) => (
            <div key={label}>
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className="text-sm font-medium text-gray-800">{new Date(time).toLocaleTimeString()}</div>
              <div className="text-xs text-gray-400">{new Date(time).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
        {b.cancellationReason && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="text-xs text-gray-400 mb-1">Cancellation Reason</div>
            <div className="text-sm text-gray-700">{b.cancellationReason}</div>
          </div>
        )}
      </div>
    </div>
  );
}
