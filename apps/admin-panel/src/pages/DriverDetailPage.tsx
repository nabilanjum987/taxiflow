// src/pages/DriverDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => api.get(`/drivers/${id}`).then(r => r.data.data),
  });

  const { data: earnings } = useQuery({
    queryKey: ['driver-earnings', id],
    queryFn: () => api.get(`/drivers/${id}/earnings?days=14`).then(r => r.data.data),
    enabled: !!driver,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/drivers/${id}/approve`),
    onSuccess: () => { toast.success('Driver approved!'); void qc.invalidateQueries({ queryKey: ['driver', id] }); },
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/drivers/${id}/suspend`, { reason: 'Admin action' }),
    onSuccess: () => { toast.success('Driver suspended'); void qc.invalidateQueries({ queryKey: ['driver', id] }); },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto"><div className="skeleton h-64 w-full rounded-2xl" /></div>;
  if (!driver) return <div className="text-center py-20 text-gray-400">Driver not found</div>;

  const d = driver;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-gray-900">Driver Profile</h1>
        <div className="flex-1" />
        {d.status === 'PENDING_APPROVAL' && (
          <>
            <button onClick={() => approveMutation.mutate()} className="btn-primary flex items-center gap-1.5">
              <CheckCircle size={15} /> Approve
            </button>
            <button onClick={() => toast.error('Use reject button below')} className="btn-danger flex items-center gap-1.5">
              <XCircle size={15} /> Reject
            </button>
          </>
        )}
        {d.status === 'APPROVED' && (
          <button onClick={() => { if (confirm('Suspend this driver?')) suspendMutation.mutate(); }} className="btn-danger flex items-center gap-1.5">
            <AlertTriangle size={15} /> Suspend
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Profile */}
        <div className="card p-5 lg:col-span-1">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 text-2xl font-bold mb-3">
              {d.user.firstName[0]}{d.user.lastName[0]}
            </div>
            <h2 className="font-bold text-gray-900 text-lg">{d.user.firstName} {d.user.lastName}</h2>
            <div className="text-gray-500 text-sm">{d.user.phone}</div>
            <div className="text-gray-400 text-xs">{d.user.email ?? '—'}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-gray-800">{d.rating?.toFixed(1) ?? '—'}</span>
              <span className="text-gray-400 text-xs">({d._count?.bookings ?? 0} trips)</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { l: 'Status', v: d.status.replace(/_/g, ' ') },
              { l: 'Online', v: d.onlineStatus },
              { l: 'License #', v: d.licenseNumber },
              { l: 'License Expiry', v: new Date(d.licenseExpiry).toLocaleDateString() },
              { l: 'Total Earnings', v: `£${d.totalEarnings?.toFixed(2) ?? '0.00'}` },
              { l: 'Total Trips', v: d.totalTrips },
              { l: 'Joined', v: new Date(d.createdAt).toLocaleDateString() },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between">
                <span className="text-gray-400">{l}</span>
                <span className="font-medium text-gray-800 text-right max-w-[150px] truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {/* Earnings Chart */}
          {earnings && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Earnings — Last 14 Days</h3>
              <div className="flex gap-6 mb-4">
                <div><div className="text-xl font-bold text-gray-900">£{earnings.totalEarnings?.toFixed(2)}</div><div className="text-xs text-gray-400">Period Total</div></div>
                <div><div className="text-xl font-bold text-gray-900">{earnings.totalTrips}</div><div className="text-xs text-gray-400">Trips</div></div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={earnings.breakdown ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `£${v}`} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: number) => [`£${v.toFixed(2)}`, 'Earnings']} />
                  <Bar dataKey="earnings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Vehicles */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Vehicles</h3>
            {d.vehicles?.length === 0 ? (
              <div className="text-sm text-gray-400">No vehicles registered</div>
            ) : (
              <div className="space-y-3">
                {d.vehicles?.map((v: { id: string; make: string; model: string; year: number; color: string; licensePlate: string; vehicleType: string; isActive: boolean }) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">{v.make} {v.model} ({v.year})</div>
                      <div className="text-xs text-gray-500">{v.color} · {v.vehicleType} · <span className="font-mono">{v.licensePlate}</span></div>
                    </div>
                    <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>{v.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Documents</h3>
            {d.documents?.length === 0 ? (
              <div className="text-sm text-gray-400">No documents uploaded</div>
            ) : (
              <div className="space-y-2">
                {d.documents?.map((doc: { id: string; type: string; status: string; expiryDate?: string; fileUrl: string }) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{doc.type.replace(/_/g, ' ')}</div>
                      {doc.expiryDate && <div className="text-xs text-gray-400">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${doc.status === 'APPROVED' ? 'badge-green' : doc.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>
                        {doc.status}
                      </span>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-600 hover:underline">View</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
