// src/pages/DriversPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Eye, Wifi, WifiOff } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const STATUSES = ['', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export default function DriversPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, status, search],
    queryFn: () => api.get(`/drivers?page=${page}&limit=15${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`).then(r => r.data),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/drivers/${id}/approve`),
    onSuccess: () => { toast.success('Driver approved'); void qc.invalidateQueries({ queryKey: ['drivers'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/drivers/${id}/reject`, { reason: 'Does not meet requirements' }),
    onSuccess: () => { toast.success('Driver rejected'); void qc.invalidateQueries({ queryKey: ['drivers'] }); },
  });

  const drivers = data?.data ?? [];
  const pagination = data?.pagination;

  const statusBadge = (s: string, online: string) => {
    if (s === 'PENDING_APPROVAL') return <span className="badge badge-yellow">Pending</span>;
    if (s === 'APPROVED') return (
      <div className="flex items-center gap-1.5">
        <span className="badge badge-green">Approved</span>
        {online === 'ONLINE' && <span className="badge badge-blue flex items-center gap-1"><Wifi size={10} /> Online</span>}
        {online === 'ON_TRIP' && <span className="badge bg-violet-50 text-violet-700">On Trip</span>}
        {online === 'OFFLINE' && <span className="badge badge-gray flex items-center gap-1"><WifiOff size={10} /> Offline</span>}
      </div>
    );
    if (s === 'SUSPENDED') return <span className="badge badge-red">Suspended</span>;
    if (s === 'REJECTED') return <span className="badge badge-red">Rejected</span>;
    return <span className="badge badge-gray">{s}</span>;
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your driver fleet</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..." className="input pl-9 py-2 text-sm" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input py-2 text-sm w-auto pr-8">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                {['Driver', 'Phone', 'Vehicle', 'Trips', 'Rating', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>)}</tr>
                ))
                : drivers.map((d: {
                    id: string;
                    status: string;
                    onlineStatus: string;
                    rating: number;
                    totalTrips: number;
                    createdAt: string;
                    user: { firstName: string; lastName: string; phone: string; avatarUrl?: string };
                    vehicles: Array<{ make: string; model: string; licensePlate: string; vehicleType: string }>;
                  }) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                          {d.user.firstName[0]}{d.user.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900">{d.user.firstName} {d.user.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{d.user.phone}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {d.vehicles?.[0] ? (
                        <div>
                          <div>{d.vehicles[0].make} {d.vehicles[0].model}</div>
                          <div className="text-gray-400 font-mono">{d.vehicles[0].licensePlate}</div>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-700">{d.totalTrips}</td>
                    <td className="px-5 py-4">
                      <span className="text-amber-600 font-medium">★ {d.rating?.toFixed(1) ?? '—'}</span>
                    </td>
                    <td className="px-5 py-4">{statusBadge(d.status, d.onlineStatus)}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {d.status === 'PENDING_APPROVAL' && (
                          <>
                            <button onClick={() => approveMutation.mutate(d.id)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => rejectMutation.mutate(d.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        <Link to={`/drivers/${d.id}`}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Eye size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          {!isLoading && drivers.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No drivers found</div>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">Total: {pagination.total} drivers</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Prev</button>
              <span className="text-xs text-gray-500">Page {page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
