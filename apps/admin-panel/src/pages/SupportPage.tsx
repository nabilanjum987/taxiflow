// src/pages/SupportPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const STATUSES = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function SupportPage() {
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['support', statusFilter],
    queryFn: () => api.get(`/support?limit=30${statusFilter ? `&status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/support/${id}/status`, { status }),
    onSuccess: () => { toast.success('Ticket updated'); void qc.invalidateQueries({ queryKey: ['support'] }); },
  });

  const tickets = data?.data ?? [];

  const priorityClass: Record<string, string> = {
    LOW: 'badge-gray', MEDIUM: 'badge-blue', HIGH: 'badge-yellow', URGENT: 'badge-red',
  };
  const statusClass: Record<string, string> = {
    OPEN: 'badge-yellow', IN_PROGRESS: 'badge-blue', RESOLVED: 'badge-green', CLOSED: 'badge-gray',
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-bold text-gray-900">Support</h1><p className="text-gray-500 text-sm mt-0.5">Customer support tickets</p></div>

      <div className="flex gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-5 w-48 mb-3" /><div className="skeleton h-4 w-full" /></div>)
          : tickets.map((t: { id: string; subject: string; description: string; status: string; priority: string; user: { firstName: string; lastName: string; phone: string }; createdAt: string }) => (
            <div key={t.id} className="card p-5 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={15} className="text-amber-500 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 truncate">{t.subject}</h3>
                    <span className={`badge ${priorityClass[t.priority] ?? 'badge-gray'}`}>{t.priority}</span>
                    <span className={`badge ${statusClass[t.status] ?? 'badge-gray'}`}>{t.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{t.user.firstName} {t.user.lastName} · {t.user.phone}</span>
                    <span>{new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <select value={t.status} onChange={e => updateMutation.mutate({ id: t.id, status: e.target.value })}
                    className="input py-1.5 text-xs w-auto pr-8">
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))
        }
        {!isLoading && tickets.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No tickets with this status</div>
        )}
      </div>
    </div>
  );
}
