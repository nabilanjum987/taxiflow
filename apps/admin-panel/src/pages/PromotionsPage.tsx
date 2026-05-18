// src/pages/PromotionsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import toast from 'react-hot-toast';

const schema = z.object({
  code: z.string().min(3).max(20),
  description: z.string().min(1),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.string().transform(Number),
  usageLimit: z.string().optional().transform(v => v ? Number(v) : undefined),
  validFrom: z.string().min(1),
  validUntil: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function PromotionsPage() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: promos, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => api.get('/promotions?limit=50').then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/promotions', { ...d, validFrom: new Date(d.validFrom).toISOString(), validUntil: new Date(d.validUntil).toISOString() }),
    onSuccess: () => { toast.success('Promo code created'); void qc.invalidateQueries({ queryKey: ['promotions'] }); setShowForm(false); reset(); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/promotions/${id}/toggle`, { isActive }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['promotions'] }); },
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Promotions</h1><p className="text-gray-500 text-sm mt-0.5">Manage discount codes</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} /> New Promo</button>
      </div>

      {showForm && (
        <div className="card p-5 animate-fade-in">
          <h2 className="font-semibold text-gray-900 mb-4">Create Promo Code</h2>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code</label>
              <input {...register('code')} placeholder="SAVE10" className="input py-2 text-sm uppercase" />
              {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input {...register('description')} placeholder="10% off first ride" className="input py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Discount Type</label>
              <select {...register('discountType')} className="input py-2 text-sm">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Value</label>
              <input {...register('discountValue')} type="number" step="0.01" placeholder="10" className="input py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Usage Limit (optional)</label>
              <input {...register('usageLimit')} type="number" placeholder="100" className="input py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid From</label>
              <input {...register('validFrom')} type="datetime-local" className="input py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid Until</label>
              <input {...register('validUntil')} type="datetime-local" className="input py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full py-2.5 text-sm">Create Code</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100"><tr>
            {['Code', 'Description', 'Discount', 'Used', 'Limit', 'Valid Until', 'Status', ''].map(h => (
              <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3.5">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-16" /></td>)}</tr>)
              : (promos ?? []).map((p: { id: string; code: string; description: string; discountType: string; discountValue: number; usageCount: number; usageLimit?: number; validUntil: string; isActive: boolean }) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-mono font-bold text-amber-600 bg-amber-50/30">{p.code}</td>
                  <td className="px-5 py-4 text-gray-600">{p.description}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `£${p.discountValue.toFixed(2)}`}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{p.usageCount}</td>
                  <td className="px-5 py-4 text-gray-500">{p.usageLimit ?? '∞'}</td>
                  <td className="px-5 py-4 text-xs text-gray-400">{new Date(p.validUntil).toLocaleDateString()}</td>
                  <td className="px-5 py-4"><span className={`badge ${p.isActive ? 'badge-green' : 'badge-gray'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}
                      className={`text-${p.isActive ? 'emerald' : 'gray'}-500 hover:opacity-70 transition-opacity`}>
                      {p.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {!isLoading && !promos?.length && <div className="text-center py-12 text-gray-400 text-sm">No promo codes yet</div>}
      </div>
    </div>
  );
}
