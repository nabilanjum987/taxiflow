"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
// src/pages/DashboardPage.tsx
const react_query_1 = require("@tanstack/react-query");
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../lib/api"));
const shared_utils_1 = require("@taxiflow/shared-utils");
const authStore_1 = require("../store/authStore");
const react_router_dom_1 = require("react-router-dom");
function StatCard({ label, value, sub, icon: Icon, color, trend }) {
    return (<div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white"/>
        </div>
        {trend && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>);
}
function BookingStatusBadge({ status }) {
    const map = {
        COMPLETED: 'badge-green', CANCELLED: 'badge-red', IN_PROGRESS: 'badge-blue',
        ACCEPTED: 'badge-blue', SEARCHING: 'badge-yellow', PENDING: 'badge-yellow',
        DRIVER_ARRIVED: 'badge-blue', NO_DRIVER_FOUND: 'badge-red',
    };
    return <span className={`badge ${map[status] ?? 'badge-gray'}`}>{status.replace(/_/g, ' ')}</span>;
}
function DashboardPage() {
    const { tenant } = (0, authStore_1.useAuthStore)((s) => ({ tenant: s.user }));
    const { data: stats, isLoading: statsLoading } = (0, react_query_1.useQuery)({
        queryKey: ['dashboard-stats'],
        queryFn: () => api_1.default.get('/reports/dashboard').then(r => r.data.data),
        refetchInterval: 30_000,
    });
    const { data: revenue } = (0, react_query_1.useQuery)({
        queryKey: ['revenue-7d'],
        queryFn: () => api_1.default.get('/reports/revenue?days=7').then(r => r.data.data),
    });
    const { data: recentBookings } = (0, react_query_1.useQuery)({
        queryKey: ['recent-bookings'],
        queryFn: () => api_1.default.get('/bookings?limit=6').then(r => r.data.data),
    });
    const { data: pendingDrivers } = (0, react_query_1.useQuery)({
        queryKey: ['pending-drivers'],
        queryFn: () => api_1.default.get('/drivers?status=PENDING_APPROVAL&limit=5').then(r => r.data.data),
    });
    const currency = 'GBP';
    return (<div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Here's what's happening today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Bookings" icon={lucide_react_1.Car} color="bg-amber-500" value={statsLoading ? '—' : stats?.today?.bookings ?? 0} sub="All statuses"/>
        <StatCard label="Today's Revenue" icon={lucide_react_1.TrendingUp} color="bg-emerald-500" value={statsLoading ? '—' : (0, shared_utils_1.formatCurrency)(stats?.today?.revenue ?? 0, currency)} trend="+12%"/>
        <StatCard label="Active Drivers" icon={lucide_react_1.Users} color="bg-blue-500" value={statsLoading ? '—' : stats?.drivers?.active ?? 0} sub={`${stats?.drivers?.online ?? 0} online now`}/>
        <StatCard label="Avg Rating" icon={lucide_react_1.Star} color="bg-violet-500" value={statsLoading ? '—' : `${stats?.averageRating ?? 0} ★`} sub="Passenger ratings"/>
      </div>

      {/* Quick status row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Completed', value: stats?.weeklyBookings?.COMPLETED ?? 0, icon: lucide_react_1.CheckCircle2, cls: 'text-emerald-500' },
            { label: 'Cancelled', value: stats?.weeklyBookings?.CANCELLED ?? 0, icon: lucide_react_1.XCircle, cls: 'text-red-500' },
            { label: 'In Progress', value: stats?.weeklyBookings?.IN_PROGRESS ?? 0, icon: lucide_react_1.Clock, cls: 'text-blue-500' },
            { label: 'Pending Approval', value: stats?.drivers?.pendingApproval ?? 0, icon: lucide_react_1.AlertCircle, cls: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, cls }) => (<div key={label} className="card p-4 flex items-center gap-3">
            <Icon size={20} className={cls}/>
            <div>
              <div className="text-lg font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label} (7d)</div>
            </div>
          </div>))}
      </div>

      {/* Revenue Chart + Pending Drivers */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Revenue — Last 7 Days</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">{currency}</span>
          </div>
          <recharts_1.ResponsiveContainer width="100%" height={200}>
            <recharts_1.AreaChart data={revenue?.byDay ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <recharts_1.XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)}/>
              <recharts_1.YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`}/>
              <recharts_1.Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [`£${v.toFixed(2)}`, 'Revenue']}/>
              <recharts_1.Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#f59e0b', strokeWidth: 0, r: 3 }}/>
            </recharts_1.AreaChart>
          </recharts_1.ResponsiveContainer>
        </div>

        {/* Pending Driver Approvals */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pending Approval</h2>
            <react_router_dom_1.Link to="/drivers?status=PENDING_APPROVAL" className="text-xs text-amber-600 hover:underline">View all</react_router_dom_1.Link>
          </div>
          {pendingDrivers?.length === 0 ? (<div className="text-center py-8 text-gray-400 text-sm">No pending approvals</div>) : (<div className="space-y-3">
              {(pendingDrivers ?? []).map((d) => (<react_router_dom_1.Link key={d.id} to={`/drivers/${d.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                    {d.user.firstName[0]}{d.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{d.user.firstName} {d.user.lastName}</div>
                    <div className="text-xs text-gray-400 truncate">{d.user.phone}</div>
                  </div>
                  <span className="badge badge-yellow">Pending</span>
                </react_router_dom_1.Link>))}
            </div>)}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
          <react_router_dom_1.Link to="/bookings" className="text-xs text-amber-600 hover:underline">View all</react_router_dom_1.Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['ID', 'Passenger', 'Driver', 'Route', 'Fare', 'Status', 'Time'].map(h => (<th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentBookings ?? []).map((b) => (<tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{b.passenger?.user?.firstName} {b.passenger?.user?.lastName}</td>
                  <td className="px-5 py-3.5 text-gray-600">{b.driver?.user?.firstName ?? <span className="text-gray-300">—</span>} {b.driver?.user?.lastName ?? ''}</td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[200px]">
                    <div className="truncate text-xs">{b.pickupAddress}</div>
                    <div className="truncate text-xs text-gray-400">→ {b.dropoffAddress}</div>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">£{(b.actualFare ?? b.estimatedFare).toFixed(2)}</td>
                  <td className="px-5 py-3.5"><BookingStatusBadge status={b.status}/></td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(b.createdAt).toLocaleTimeString()}</td>
                </tr>))}
            </tbody>
          </table>
          {!recentBookings?.length && (<div className="text-center py-12 text-gray-400 text-sm">No bookings yet</div>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=DashboardPage.js.map