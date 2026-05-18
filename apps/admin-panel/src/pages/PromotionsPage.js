"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PromotionsPage;
// src/pages/PromotionsPage.tsx
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const lucide_react_1 = require("lucide-react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const api_1 = __importDefault(require("../lib/api"));
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const schema = zod_2.z.object({
    code: zod_2.z.string().min(3).max(20),
    description: zod_2.z.string().min(1),
    discountType: zod_2.z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: zod_2.z.string().transform(Number),
    usageLimit: zod_2.z.string().optional().transform(v => v ? Number(v) : undefined),
    validFrom: zod_2.z.string().min(1),
    validUntil: zod_2.z.string().min(1),
});
function PromotionsPage() {
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const qc = (0, react_query_1.useQueryClient)();
    const { data: promos, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['promotions'],
        queryFn: () => api_1.default.get('/promotions?limit=50').then(r => r.data.data),
    });
    const { register, handleSubmit, reset, formState: { errors } } = (0, react_hook_form_1.useForm)({ resolver: (0, zod_1.zodResolver)(schema) });
    const createMutation = (0, react_query_1.useMutation)({
        mutationFn: (d) => api_1.default.post('/promotions', { ...d, validFrom: new Date(d.validFrom).toISOString(), validUntil: new Date(d.validUntil).toISOString() }),
        onSuccess: () => { react_hot_toast_1.default.success('Promo code created'); void qc.invalidateQueries({ queryKey: ['promotions'] }); setShowForm(false); reset(); },
    });
    const toggleMutation = (0, react_query_1.useMutation)({
        mutationFn: ({ id, isActive }) => api_1.default.patch(`/promotions/${id}/toggle`, { isActive }),
        onSuccess: () => { void qc.invalidateQueries({ queryKey: ['promotions'] }); },
    });
    return (<div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Promotions</h1><p className="text-gray-500 text-sm mt-0.5">Manage discount codes</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><lucide_react_1.Plus size={15}/> New Promo</button>
      </div>

      {showForm && (<div className="card p-5 animate-fade-in">
          <h2 className="font-semibold text-gray-900 mb-4">Create Promo Code</h2>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code</label>
              <input {...register('code')} placeholder="SAVE10" className="input py-2 text-sm uppercase"/>
              {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input {...register('description')} placeholder="10% off first ride" className="input py-2 text-sm"/>
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
              <input {...register('discountValue')} type="number" step="0.01" placeholder="10" className="input py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Usage Limit (optional)</label>
              <input {...register('usageLimit')} type="number" placeholder="100" className="input py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid From</label>
              <input {...register('validFrom')} type="datetime-local" className="input py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid Until</label>
              <input {...register('validUntil')} type="datetime-local" className="input py-2 text-sm"/>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full py-2.5 text-sm">Create Code</button>
            </div>
          </form>
        </div>)}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100"><tr>
            {['Code', 'Description', 'Discount', 'Used', 'Limit', 'Valid Until', 'Status', ''].map(h => (<th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3.5">{h}</th>))}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-16"/></td>)}</tr>)
            : (promos ?? []).map((p) => (<tr key={p.id} className="hover:bg-gray-50/50">
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
                    <button onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })} className={`text-${p.isActive ? 'emerald' : 'gray'}-500 hover:opacity-70 transition-opacity`}>
                      {p.isActive ? <lucide_react_1.ToggleRight size={22}/> : <lucide_react_1.ToggleLeft size={22}/>}
                    </button>
                  </td>
                </tr>))}
          </tbody>
        </table>
        {!isLoading && !promos?.length && <div className="text-center py-12 text-gray-400 text-sm">No promo codes yet</div>}
      </div>
    </div>);
}
//# sourceMappingURL=PromotionsPage.js.map