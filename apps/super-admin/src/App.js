"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/super-admin/src/App.tsx — Complete Super Admin Panel
const react_1 = __importStar(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = __importStar(require("react-hot-toast"));
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const lucide_react_1 = require("lucide-react");
require("./index.css");
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const SUPER_TENANT_ID = import.meta.env.VITE_SUPER_TENANT_ID ?? '';
function getApi() {
    const token = localStorage.getItem('sa_token') ?? '';
    return axios_1.default.create({
        baseURL: API,
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': SUPER_TENANT_ID },
    });
}
// ─── LOGIN ────────────────────────────────────────────────
const loginSchema = zod_2.z.object({
    email: zod_2.z.string().email(),
    password: zod_2.z.string().min(1),
});
function LoginPage({ onLogin }) {
    const [showPass, setShowPass] = (0, react_1.useState)(false);
    const { register, handleSubmit, formState: { isSubmitting, errors } } = (0, react_hook_form_1.useForm)({ resolver: (0, zod_1.zodResolver)(loginSchema) });
    const onSubmit = async (data) => {
        try {
            const res = await axios_1.default.post(`${API}/auth/login`, data, { headers: { 'x-tenant-id': SUPER_TENANT_ID } });
            const user = res.data.data.user;
            if (user.role !== 'SUPER_ADMIN')
                throw new Error('Not a super admin account');
            localStorage.setItem('sa_token', res.data.data.accessToken);
            localStorage.setItem('sa_user', JSON.stringify(user));
            react_hot_toast_1.default.success('Welcome, Super Admin');
            onLogin();
        }
        catch (err) {
            react_hot_toast_1.default.error(err instanceof Error ? err.message : 'Login failed');
        }
    };
    return (<div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center"><lucide_react_1.Car size={22} className="text-white"/></div>
          <div><div className="text-white text-xl font-bold">TaxiFlow</div><div className="text-slate-400 text-xs">Super Admin Platform</div></div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-6 border border-white/5">
          <h1 className="text-white text-lg font-semibold mb-5">Sign In</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Email</label>
              <input {...register('email')} type="email" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-amber-500/50"/>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPass ? 'text' : 'password'} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-amber-500/50 pr-10"/>
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  {showPass ? <lucide_react_1.EyeOff size={15}/> : <lucide_react_1.Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting ? <lucide_react_1.Loader2 size={16} className="animate-spin"/> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>);
}
// ─── CREATE TENANT MODAL ──────────────────────────────────
const createTenantSchema = zod_2.z.object({
    name: zod_2.z.string().min(1),
    email: zod_2.z.string().email(),
    phone: zod_2.z.string().min(7),
    country: zod_2.z.string().length(2),
    currency: zod_2.z.string().length(3),
    timezone: zod_2.z.string().min(1),
    adminFirstName: zod_2.z.string().min(1),
    adminLastName: zod_2.z.string().min(1),
    adminPassword: zod_2.z.string().min(8),
    subscriptionPlanId: zod_2.z.string().uuid(),
});
function CreateTenantModal({ plans, onClose, onSuccess }) {
    const { register, handleSubmit, formState: { isSubmitting, errors } } = (0, react_hook_form_1.useForm)({ resolver: (0, zod_1.zodResolver)(createTenantSchema) });
    const onSubmit = async (data) => {
        try {
            await getApi().post('/tenants', data);
            react_hot_toast_1.default.success('Tenant created! Onboarding email sent.');
            onSuccess();
        }
        catch {
            react_hot_toast_1.default.error('Failed to create tenant');
        }
    };
    return (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-xl border border-white/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5">
          <h2 className="text-white font-bold text-lg">Create New Client</h2>
          <p className="text-slate-400 text-sm mt-0.5">Set up a new white-label tenant</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
            { f: 'name', l: 'Company Name', span: 2 },
            { f: 'email', l: 'Admin Email' },
            { f: 'phone', l: 'Phone' },
            { f: 'country', l: 'Country Code (e.g. GB)' },
            { f: 'currency', l: 'Currency (e.g. GBP)' },
            { f: 'timezone', l: 'Timezone (e.g. Europe/London)', span: 2 },
            { f: 'adminFirstName', l: 'Admin First Name' },
            { f: 'adminLastName', l: 'Admin Last Name' },
            { f: 'adminPassword', l: 'Admin Password', span: 2, type: 'password' },
        ].map(({ f, l, span, type }) => (<div key={f} className={span === 2 ? 'col-span-2' : ''}>
                <label className="block text-slate-400 text-xs mb-1">{l}</label>
                <input {...register(f)} type={type ?? 'text'} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-amber-500/50"/>
                {errors[f] && (<p className="text-red-400 text-xs mt-0.5">{String(errors[f]?.message)}</p>)}
              </div>))}
            <div className="col-span-2">
              <label className="block text-slate-400 text-xs mb-1">Subscription Plan</label>
              <select {...register('subscriptionPlanId')} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
                {plans.map(p => <option key={p.id} value={p.id} className="bg-gray-900">{p.name} — £{p.priceMonthly}/mo</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting ? <lucide_react_1.Loader2 size={14} className="animate-spin"/> : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
// ─── MAIN APP ─────────────────────────────────────────────
function SuperAdminApp() {
    const [tenants, setTenants] = (0, react_1.useState)([]);
    const [plans, setPlans] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [showCreateModal, setShowCreateModal] = (0, react_1.useState)(false);
    const [page, setPage] = (0, react_1.useState)(1);
    const [totalTenants, setTotalTenants] = (0, react_1.useState)(0);
    const [selectedTenant, setSelectedTenant] = (0, react_1.useState)(null);
    const user = JSON.parse(localStorage.getItem('sa_user') ?? '{}');
    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await getApi().get(`/tenants?page=${page}&limit=20`);
            setTenants(res.data.data);
            setTotalTenants(res.data.pagination?.total ?? 0);
        }
        catch {
            react_hot_toast_1.default.error('Failed to fetch tenants');
        }
        finally {
            setLoading(false);
        }
    };
    const fetchPlans = async () => {
        try {
            // Plans seeded in DB — fetch from seed
            setPlans([
                { id: 'starter', name: 'Starter', priceMonthly: 99 },
                { id: 'business', name: 'Business', priceMonthly: 199 },
                { id: 'pro', name: 'Pro', priceMonthly: 349 },
                { id: 'enterprise', name: 'Enterprise', priceMonthly: 599 },
            ]);
        }
        catch { /* ignore */ }
    };
    (0, react_1.useEffect)(() => { void fetchTenants(); void fetchPlans(); }, [page]);
    const suspendTenant = async (id, name) => {
        if (!confirm(`Suspend ${name}?`))
            return;
        try {
            await getApi().post(`/tenants/${id}/suspend`, { reason: 'Super admin action' });
            react_hot_toast_1.default.success('Tenant suspended');
            void fetchTenants();
        }
        catch {
            react_hot_toast_1.default.error('Failed to suspend');
        }
    };
    const activateTenant = async (id) => {
        try {
            await getApi().post(`/tenants/${id}/activate`);
            react_hot_toast_1.default.success('Tenant activated');
            void fetchTenants();
        }
        catch {
            react_hot_toast_1.default.error('Failed to activate');
        }
    };
    const logout = () => { localStorage.clear(); window.location.reload(); };
    const statusBadge = (s) => {
        const m = { ACTIVE: 'text-emerald-400 bg-emerald-400/10', SUSPENDED: 'text-red-400 bg-red-400/10', TRIAL: 'text-amber-400 bg-amber-400/10', CANCELLED: 'text-gray-400 bg-gray-400/10' };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m[s] ?? 'text-gray-400 bg-gray-400/10'}`}>{s}</span>;
    };
    return (<div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><lucide_react_1.Car size={15} className="text-white"/></div>
            <div><div className="text-white text-sm font-bold">TaxiFlow</div><div className="text-slate-500 text-xs">Super Admin</div></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { icon: lucide_react_1.Building2, label: 'Clients', active: true },
            { icon: lucide_react_1.CreditCard, label: 'Billing', active: false },
            { icon: lucide_react_1.TrendingUp, label: 'Analytics', active: false },
            { icon: lucide_react_1.Settings, label: 'Platform', active: false },
        ].map(({ icon: Icon, label, active }) => (<button key={label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active ? 'bg-amber-500/10 text-amber-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <Icon size={16}/>{label}
            </button>))}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white font-medium truncate">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-slate-500">Super Admin</div>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors"><lucide_react_1.LogOut size={14}/></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/5 bg-gray-900/50 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-white font-bold text-lg">Client Management</h1>
            <p className="text-slate-400 text-xs mt-0.5">{totalTenants} total clients</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-all">
            <lucide_react_1.Plus size={15}/> New Client
          </button>
        </header>

        {/* Stats row */}
        <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b border-white/5 flex-shrink-0">
          {[
            { label: 'Total Clients', value: totalTenants, icon: lucide_react_1.Building2 },
            { label: 'Active', value: tenants.filter(t => t.status === 'ACTIVE').length, icon: lucide_react_1.CheckCircle },
            { label: 'Trial', value: tenants.filter(t => t.status === 'TRIAL').length, icon: lucide_react_1.TrendingUp },
            { label: 'Suspended', value: tenants.filter(t => t.status === 'SUSPENDED').length, icon: lucide_react_1.AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (<div key={label} className="bg-gray-900/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2"><Icon size={14} className="text-slate-500"/><span className="text-xs text-slate-400">{label}</span></div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </div>))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-950 border-b border-white/5">
              <tr>{['Company', 'Email', 'Country', 'Plan', 'Sub Status', 'Status', 'Joined', 'Actions'].map(h => (<th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
            ? Array.from({ length: 8 }).map((_, i) => (<tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse w-20"/></td>)}</tr>))
            : tenants.map(t => (<tr key={t.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedTenant(t === selectedTenant ? null : t)}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{t.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{t.email}</td>
                    <td className="px-5 py-4 text-slate-400">{t.country}</td>
                    <td className="px-5 py-4">
                      <div className="text-slate-300">{t.subscription?.plan?.name ?? '—'}</div>
                      {t.subscription && <div className="text-xs text-slate-500">£{t.subscription.plan.priceMonthly}/mo</div>}
                    </td>
                    <td className="px-5 py-4">
                      {t.subscription ? (<span className={`text-xs px-2 py-0.5 rounded-full ${t.subscription.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10' : t.subscription.status === 'TRIALING' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {t.subscription.status}
                        </span>) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-5 py-4">{statusBadge(t.status)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {t.status !== 'SUSPENDED' ? (<button onClick={() => suspendTenant(t.id, t.name)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Suspend">
                            <lucide_react_1.XCircle size={14}/>
                          </button>) : (<button onClick={() => activateTenant(t.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Activate">
                            <lucide_react_1.CheckCircle size={14}/>
                          </button>)}
                      </div>
                    </td>
                  </tr>))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalTenants > 20 && (<div className="px-6 py-3 border-t border-white/5 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-500">Page {page} of {Math.ceil(totalTenants / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs disabled:opacity-40 hover:bg-white/10 transition-colors">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalTenants / 20)} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs disabled:opacity-40 hover:bg-white/10 transition-colors">Next</button>
            </div>
          </div>)}
      </main>

      {showCreateModal && (<CreateTenantModal plans={plans} onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); void fetchTenants(); }}/>)}
    </div>);
}
function Root() {
    const [loggedIn, setLoggedIn] = (0, react_1.useState)(!!localStorage.getItem('sa_token'));
    return (<>
      <react_hot_toast_1.Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', fontSize: '13px' } }}/>
      {loggedIn ? <SuperAdminApp /> : <LoginPage onLogin={() => setLoggedIn(true)}/>}
    </>);
}
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode><Root /></react_1.default.StrictMode>);
//# sourceMappingURL=App.js.map