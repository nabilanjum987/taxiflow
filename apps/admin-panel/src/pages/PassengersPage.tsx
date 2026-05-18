// src/pages/PassengersPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Star } from 'lucide-react';
import api from '../lib/api';

export default function PassengersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['passengers', page, search],
    queryFn: () => api.get(`/passengers?page=${page}&limit=15${search ? `&search=${search}` : ''}`).then(r => r.data),
    keepPreviousData: true,
  });

  const passengers = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Passengers</h1>
        <p className="text-gray-500 text-sm mt-0.5">All registered passengers</p>
      </div>
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search passengers..." className="input pl-9 py-2 text-sm" />
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>{['Passenger', 'Phone', 'Email', 'Trips', 'Rating', 'Joined'].map(h => (
              <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3.5">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>)}</tr>)
              : passengers.map((p: { id: string; user: { firstName: string; lastName: string; phone: string; email?: string; createdAt: string }; rating: number; _count: { bookings: number } }) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                        {p.user.firstName[0]}{p.user.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">{p.user.firstName} {p.user.lastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{p.user.phone}</td>
                  <td className="px-5 py-4 text-gray-500">{p.user.email ?? '—'}</td>
                  <td className="px-5 py-4 font-medium text-gray-700">{p._count?.bookings ?? 0}</td>
                  <td className="px-5 py-4"><span className="text-amber-600">★ {p.rating?.toFixed(1) ?? '—'}</span></td>
                  <td className="px-5 py-4 text-xs text-gray-400">{new Date(p.user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {!isLoading && passengers.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No passengers found</div>}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">Total: {pagination.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
