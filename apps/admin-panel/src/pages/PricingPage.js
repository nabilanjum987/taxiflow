"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PricingPage;
// src/pages/PricingPage.tsx
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const lucide_react_1 = require("lucide-react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const api_1 = __importDefault(require("../lib/api"));
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const ruleSchema = zod_2.z.object({
    vehicleType: zod_2.z.enum(['STANDARD', 'EXECUTIVE', 'MPV', 'WAV']),
    baseFare: zod_2.z.string().transform(Number),
    perKmRate: zod_2.z.string().transform(Number),
    perMinuteRate: zod_2.z.string().transform(Number),
    minimumFare: zod_2.z.string().transform(Number),
    bookingFee: zod_2.z.string().transform(Number),
    nightMultiplier: zod_2.z.string().transform(Number),
});
const surgeSchema = zod_2.z.object({
    multiplier: zod_2.z.string().transform(Number),
    reason: zod_2.z.string().min(1),
    startTime: zod_2.z.string().min(1),
    endTime: zod_2.z.string().min(1),
});
function Field({ label, name, register, type = 'text', step }) {
    return (<div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input {...register(name)} type={type} step={step} className="input py-2 text-sm"/>
    </div>);
}
function PricingPage() {
    const qc = (0, react_query_1.useQueryClient)();
    const [showRuleForm, setShowRuleForm] = (0, react_1.useState)(false);
    const [showSurgeForm, setShowSurgeForm] = (0, react_1.useState)(false);
    const { data: rules, isLoading: rulesLoading } = (0, react_query_1.useQuery)({
        queryKey: ['pricing-rules'],
        queryFn: () => api_1.default.get('/pricing/rules').then(r => r.data.data),
    });
    const { data: surge } = (0, react_query_1.useQuery)({
        queryKey: ['surge'],
        queryFn: () => api_1.default.get('/pricing/surge').then(r => r.data.data),
    });
    const ruleForm = (0, react_hook_form_1.useForm)({ resolver: (0, zod_1.zodResolver)(ruleSchema) });
    const surgeForm = (0, react_hook_form_1.useForm)({ resolver: (0, zod_1.zodResolver)(surgeSchema) });
    const createRuleMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.default.post('/pricing/rules', data),
        onSuccess: () => { react_hot_toast_1.default.success('Rule created'); void qc.invalidateQueries({ queryKey: ['pricing-rules'] }); setShowRuleForm(false); ruleForm.reset(); },
    });
    const deleteRuleMutation = (0, react_query_1.useMutation)({
        mutationFn: (id) => api_1.default.delete(`/pricing/rules/${id}`),
        onSuccess: () => { react_hot_toast_1.default.success('Rule deleted'); void qc.invalidateQueries({ queryKey: ['pricing-rules'] }); },
    });
    const createSurgeMutation = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.default.post('/pricing/surge', { ...data, startTime: new Date(data.startTime).toISOString(), endTime: new Date(data.endTime).toISOString() }),
        onSuccess: () => { react_hot_toast_1.default.success('Surge created'); void qc.invalidateQueries({ queryKey: ['surge'] }); setShowSurgeForm(false); surgeForm.reset(); },
    });
    const deactivateSurgeMutation = (0, react_query_1.useMutation)({
        mutationFn: (id) => api_1.default.delete(`/pricing/surge/${id}`),
        onSuccess: () => { react_hot_toast_1.default.success('Surge deactivated'); void qc.invalidateQueries({ queryKey: ['surge'] }); },
    });
    return (<div className="space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-bold text-gray-900">Pricing & Zones</h1><p className="text-gray-500 text-sm mt-0.5">Configure fare rules and surge pricing</p></div>

      {/* Pricing Rules */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Fare Rules</h2>
          <button onClick={() => setShowRuleForm(!showRuleForm)} className="btn-primary text-sm py-2"><lucide_react_1.Plus size={15}/> Add Rule</button>
        </div>

        {showRuleForm && (<div className="p-5 border-b border-gray-50 bg-amber-50/30 animate-fade-in">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">New Pricing Rule</h3>
            <form onSubmit={ruleForm.handleSubmit(d => createRuleMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vehicle Type</label>
                <select {...ruleForm.register('vehicleType')} className="input py-2 text-sm">
                  {['STANDARD', 'EXECUTIVE', 'MPV', 'WAV'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <Field label="Base Fare (£)" name="baseFare" register={ruleForm.register} type="number" step="0.01"/>
              <Field label="Per KM Rate (£)" name="perKmRate" register={ruleForm.register} type="number" step="0.01"/>
              <Field label="Per Minute Rate (£)" name="perMinuteRate" register={ruleForm.register} type="number" step="0.01"/>
              <Field label="Minimum Fare (£)" name="minimumFare" register={ruleForm.register} type="number" step="0.01"/>
              <Field label="Booking Fee (£)" name="bookingFee" register={ruleForm.register} type="number" step="0.01"/>
              <Field label="Night Multiplier" name="nightMultiplier" register={ruleForm.register} type="number" step="0.1"/>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full text-sm py-2.5">Save Rule</button>
              </div>
            </form>
          </div>)}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50"><tr>
              {['Vehicle Type', 'Base Fare', 'Per KM', 'Per Min', 'Min Fare', 'Booking Fee', 'Night ×', 'Zone', ''].map(h => (<th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rulesLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-5 py-3"><div className="skeleton h-4 w-16"/></td>)}</tr>)
            : (rules ?? []).map((r) => (<tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{r.vehicleType}</td>
                    <td className="px-5 py-3.5 text-gray-600">£{r.baseFare.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-gray-600">£{r.perKmRate.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-gray-600">£{r.perMinuteRate.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-gray-600">£{r.minimumFare.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-gray-600">£{r.bookingFee.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{r.nightMultiplier}×</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{r.zone?.name ?? 'Default'}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => { if (confirm('Delete this rule?'))
                deleteRuleMutation.mutate(r.id); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><lucide_react_1.Trash2 size={14}/></button>
                    </td>
                  </tr>))}
            </tbody>
          </table>
          {!rulesLoading && !rules?.length && <div className="text-center py-12 text-gray-400 text-sm">No pricing rules. Add your first rule above.</div>}
        </div>
      </div>

      {/* Surge Pricing */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <div className="flex items-center gap-2"><lucide_react_1.Zap size={16} className="text-amber-500"/><h2 className="font-semibold text-gray-900">Surge Pricing</h2></div>
          <button onClick={() => setShowSurgeForm(!showSurgeForm)} className="btn-primary text-sm py-2"><lucide_react_1.Plus size={15}/> Add Surge</button>
        </div>

        {showSurgeForm && (<div className="p-5 border-b border-gray-50 bg-amber-50/30 animate-fade-in">
            <form onSubmit={surgeForm.handleSubmit(d => createSurgeMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Multiplier (1–5)</label>
                <input {...surgeForm.register('multiplier')} type="number" step="0.1" min="1" max="5" className="input py-2 text-sm"/></div>
              <div className="md:col-span-3"><label className="block text-xs text-gray-500 mb-1">Reason</label>
                <input {...surgeForm.register('reason')} placeholder="e.g. Rush hour, Event nearby" className="input py-2 text-sm"/></div>
              <div><label className="block text-xs text-gray-500 mb-1">Start Time</label>
                <input {...surgeForm.register('startTime')} type="datetime-local" className="input py-2 text-sm"/></div>
              <div><label className="block text-xs text-gray-500 mb-1">End Time</label>
                <input {...surgeForm.register('endTime')} type="datetime-local" className="input py-2 text-sm"/></div>
              <div className="flex items-end md:col-span-2">
                <button type="submit" className="btn-primary text-sm py-2.5 w-full">Create Surge</button>
              </div>
            </form>
          </div>)}

        <div className="divide-y divide-gray-50">
          {(surge ?? []).map((s) => (<div key={s.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-amber-500">{s.multiplier}×</span>
                  <span className="text-sm font-medium text-gray-800">{s.reason}</span>
                  <span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>{s.isActive ? 'Active' : 'Ended'}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleString()}
                  {s.zone && ` · ${s.zone.name}`}
                </div>
              </div>
              {s.isActive && (<button onClick={() => deactivateSurgeMutation.mutate(s.id)} className="btn-secondary text-xs py-1.5 px-3">Deactivate</button>)}
            </div>))}
          {!surge?.length && <div className="text-center py-12 text-gray-400 text-sm">No surge pricing active</div>}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=PricingPage.js.map