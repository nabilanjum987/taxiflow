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
// src/App.tsx — Dispatcher Panel (complete single-file app)
const react_1 = __importStar(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const socket_io_client_1 = require("socket.io-client");
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = __importStar(require("react-hot-toast"));
const lucide_react_1 = require("lucide-react");
const shared_constants_1 = require("@taxiflow/shared-constants");
require("./index.css");
// ─── CONFIG ───────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
// ─── API CLIENT ───────────────────────────────────────────
function getApi() {
    const token = localStorage.getItem('accessToken') ?? '';
    const tenantId = localStorage.getItem('tenantId') ?? '';
    return axios_1.default.create({
        baseURL: API,
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
    });
}
// ─── STATUS BADGE ─────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        COMPLETED: 'bg-emerald-50 text-emerald-700',
        CANCELLED: 'bg-red-50 text-red-700',
        IN_PROGRESS: 'bg-blue-50 text-blue-700',
        ACCEPTED: 'bg-blue-50 text-blue-700',
        SEARCHING: 'bg-amber-50 text-amber-700',
        PENDING: 'bg-amber-50 text-amber-700',
        DRIVER_ARRIVED: 'bg-violet-50 text-violet-700',
        NO_DRIVER_FOUND: 'bg-red-50 text-red-600',
    };
    return (<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>);
}
// ─── LOGIN ────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
    const [tenantId, setTenantId] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            localStorage.setItem('tenantId', tenantId);
            const res = await axios_1.default.post(`${API}/auth/login`, { email, password }, { headers: { 'x-tenant-id': tenantId } });
            localStorage.setItem('accessToken', res.data.data.accessToken);
            react_hot_toast_1.default.success('Logged in');
            onLogin();
        }
        catch {
            react_hot_toast_1.default.error('Invalid credentials');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-slate-800 border border-white/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center"><lucide_react_1.Car size={20} className="text-white"/></div>
          <div><div className="text-white font-bold">TaxiFlow</div><div className="text-slate-400 text-xs">Dispatcher</div></div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Tenant ID</label>
            <input value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="UUID" required className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-amber-500/50 font-mono"/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-amber-500/50"/>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-amber-500/50"/>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-all disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>);
}
// ─── MAIN DISPATCHER APP ──────────────────────────────────
function DispatcherApp() {
    const [bookings, setBookings] = (0, react_1.useState)([]);
    const [onlineDrivers, setOnlineDrivers] = (0, react_1.useState)([]);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [activeBooking, setActiveBooking] = (0, react_1.useState)(null);
    const [connected, setConnected] = (0, react_1.useState)(false);
    const [tab, setTab] = (0, react_1.useState)('active');
    const socketRef = (0, react_1.useRef)(null);
    const fetchData = async () => {
        try {
            const api = getApi();
            const [bRes, dRes, sRes] = await Promise.all([
                api.get('/bookings?limit=50'),
                api.get('/drivers/online'),
                api.get('/reports/dashboard'),
            ]);
            setBookings(bRes.data.data);
            setOnlineDrivers(dRes.data.data);
            setStats(sRes.data.data);
        }
        catch {
            react_hot_toast_1.default.error('Failed to fetch data');
        }
    };
    (0, react_1.useEffect)(() => {
        void fetchData();
        // Connect socket
        const socket = (0, socket_io_client_1.io)(SOCKET_URL, {
            auth: { token: localStorage.getItem('accessToken') },
            extraHeaders: { 'x-tenant-id': localStorage.getItem('tenantId') ?? '' },
        });
        socket.on('connect', () => { setConnected(true); react_hot_toast_1.default.success('Live connection established', { icon: '🟢' }); });
        socket.on('disconnect', () => { setConnected(false); react_hot_toast_1.default.error('Connection lost — reconnecting...'); });
        socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_NEW, (data) => {
            setBookings(prev => [data.booking, ...prev]);
            (0, react_hot_toast_1.default)('🚖 New booking!', { duration: 5000 });
        });
        socket.on(shared_constants_1.SOCKET_EVENTS.BOOKING_UPDATED, (data) => {
            setBookings(prev => prev.map(b => b.id === data.booking.id ? data.booking : b));
            if (activeBooking?.id === data.booking.id)
                setActiveBooking(data.booking);
        });
        socket.on(shared_constants_1.SOCKET_EVENTS.DRIVER_STATUS_CHANGED, () => { void getApi().get('/drivers/online').then(r => setOnlineDrivers(r.data.data)); });
        socket.on(shared_constants_1.SOCKET_EVENTS.DRIVER_LOCATION, (data) => {
            setOnlineDrivers(prev => prev.map(d => d.userId === data.driverId
                ? { ...d, currentLatitude: data.latitude, currentLongitude: data.longitude }
                : d));
        });
        socketRef.current = socket;
        // Refresh every 30s
        const interval = setInterval(() => { void fetchData(); }, 30_000);
        return () => { socket.disconnect(); clearInterval(interval); };
    }, []);
    const assignDriver = async (bookingId, driverId) => {
        try {
            await getApi().patch(`/bookings/${bookingId}/assign-driver`, { driverId });
            react_hot_toast_1.default.success('Driver assigned');
            void fetchData();
        }
        catch {
            react_hot_toast_1.default.error('Failed to assign driver');
        }
    };
    const cancelBooking = async (bookingId) => {
        if (!confirm('Cancel this booking?'))
            return;
        try {
            await getApi().patch(`/bookings/${bookingId}/cancel`, { reason: 'Dispatcher cancelled' });
            react_hot_toast_1.default.success('Booking cancelled');
            void fetchData();
        }
        catch {
            react_hot_toast_1.default.error('Failed to cancel');
        }
    };
    const activeBookings = bookings.filter(b => ['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(b.status));
    const displayBookings = tab === 'active' ? activeBookings : bookings;
    const logout = () => { localStorage.clear(); window.location.reload(); };
    return (<div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><lucide_react_1.Car size={15} className="text-white"/></div>
          <span className="font-bold text-sm">TaxiFlow Dispatcher</span>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {connected ? <lucide_react_1.Wifi size={10}/> : <lucide_react_1.WifiOff size={10}/>}
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {stats && (<div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
              <span>📦 {stats.today?.bookings ?? 0} today</span>
              <span>🚗 {stats.drivers?.online ?? 0} online</span>
              <span>⭐ {stats.averageRating ?? 0}</span>
            </div>)}
          <button onClick={() => { void fetchData(); }} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"><lucide_react_1.RefreshCw size={15}/></button>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">Logout</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Bookings */}
        <div className="w-96 flex-shrink-0 flex flex-col border-r border-white/5">
          {/* Tabs */}
          <div className="flex border-b border-white/5 flex-shrink-0">
            {[{ id: 'active', label: `Active (${activeBookings.length})` }, { id: 'all', label: `All (${bookings.length})` }].map(({ id, label }) => (<button key={id} onClick={() => setTab(id)} className={`flex-1 py-3 text-xs font-medium transition-colors ${tab === id ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
                {label}
              </button>))}
          </div>

          {/* Booking list */}
          <div className="flex-1 overflow-y-auto">
            {displayBookings.length === 0 ? (<div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm">
                <lucide_react_1.Car size={24} className="mb-2 opacity-30"/>
                {tab === 'active' ? 'No active bookings' : 'No bookings'}
              </div>) : (displayBookings.map(b => (<div key={b.id} onClick={() => setActiveBooking(b)} className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${activeBooking?.id === b.id ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : 'hover:bg-white/3'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-mono text-xs text-slate-500">#{b.id.slice(0, 8).toUpperCase()}</div>
                    <StatusBadge status={b.status}/>
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{b.passenger?.user?.firstName} {b.passenger?.user?.lastName}</div>
                  <div className="text-xs text-slate-400 mb-1.5 truncate">📍 {b.pickupAddress}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">{b.vehicleType} · £{(b.actualFare ?? b.estimatedFare).toFixed(2)}</div>
                    <div className="text-xs text-slate-600">{new Date(b.createdAt).toLocaleTimeString()}</div>
                  </div>
                  {b.driver && (<div className="mt-2 text-xs text-emerald-400">🚗 {b.driver.user.firstName} {b.driver.user.lastName}</div>)}
                </div>)))}
          </div>
        </div>

        {/* Center — Booking Detail + Driver Assignment */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeBooking ? (<div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Booking #{activeBooking.id.slice(0, 8).toUpperCase()}</h2>
                <div className="flex gap-2">
                  {['PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(activeBooking.status) && (<button onClick={() => cancelBooking(activeBooking.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors">
                      <lucide_react_1.XCircle size={13}/> Cancel
                    </button>)}
                  <StatusBadge status={activeBooking.status}/>
                </div>
              </div>

              {/* Route */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"/>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Pickup</div>
                    <div className="text-sm text-white">{activeBooking.pickupAddress}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 flex-shrink-0"/>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Dropoff</div>
                    <div className="text-sm text-white">{activeBooking.dropoffAddress}</div>
                  </div>
                </div>
              </div>

              {/* Passenger + Fare */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs text-slate-500 mb-2">Passenger</div>
                  <div className="text-sm font-medium text-white">{activeBooking.passenger?.user?.firstName} {activeBooking.passenger?.user?.lastName}</div>
                  <a href={`tel:${activeBooking.passenger?.user?.phone}`} className="flex items-center gap-1 text-xs text-amber-400 mt-1 hover:underline">
                    <lucide_react_1.Phone size={11}/> {activeBooking.passenger?.user?.phone}
                  </a>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs text-slate-500 mb-2">Fare</div>
                  <div className="text-xl font-bold text-white">£{(activeBooking.actualFare ?? activeBooking.estimatedFare).toFixed(2)}</div>
                  <div className="text-xs text-slate-500">{activeBooking.paymentMethod} · {activeBooking.vehicleType}</div>
                </div>
              </div>

              {/* Assigned Driver */}
              {activeBooking.driver && (<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 mb-2 flex items-center gap-1"><lucide_react_1.CheckCircle size={12}/> Assigned Driver</div>
                  <div className="text-sm font-medium text-white">{activeBooking.driver.user.firstName} {activeBooking.driver.user.lastName}</div>
                  <a href={`tel:${activeBooking.driver.user.phone}`} className="flex items-center gap-1 text-xs text-amber-400 mt-1">
                    <lucide_react_1.Phone size={11}/> {activeBooking.driver.user.phone}
                  </a>
                </div>)}

              {/* Manual Driver Assignment */}
              {['SEARCHING', 'PENDING'].includes(activeBooking.status) && onlineDrivers.length > 0 && (<div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5"><lucide_react_1.Navigation size={12}/> Assign Driver Manually</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {onlineDrivers.filter(d => d.onlineStatus === 'ONLINE').map(d => (<div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div>
                          <div className="text-sm text-white font-medium">{d.user.firstName} {d.user.lastName}</div>
                          <div className="text-xs text-slate-500">⭐ {d.rating?.toFixed(1)} · {d.vehicles?.[0]?.licensePlate ?? '—'}</div>
                        </div>
                        <button onClick={() => assignDriver(activeBooking.id, d.id)} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium transition-colors">
                          Assign
                        </button>
                      </div>))}
                  </div>
                </div>)}
            </div>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <lucide_react_1.Car size={40} className="mb-3 opacity-20"/>
              <p className="text-sm">Select a booking to view details</p>
            </div>)}
        </div>

        {/* Right — Online Drivers */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-white/5">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Online Drivers</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{onlineDrivers.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {onlineDrivers.length === 0 ? (<div className="flex flex-col items-center justify-center h-40 text-slate-600 text-xs">
                <lucide_react_1.WifiOff size={20} className="mb-2 opacity-30"/>
                No drivers online
              </div>) : (onlineDrivers.map(d => (<div key={d.id} className="p-4 border-b border-white/5 hover:bg-white/3 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${d.onlineStatus === 'ON_TRIP' ? 'bg-blue-400' : 'bg-emerald-400'}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{d.user.firstName} {d.user.lastName}</div>
                      <div className="text-xs text-slate-500">{d.vehicles?.[0]?.licensePlate ?? '—'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${d.onlineStatus === 'ON_TRIP' ? 'text-blue-400' : 'text-emerald-400'}`}>{d.onlineStatus.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-600">⭐ {d.rating?.toFixed(1)}</span>
                      </div>
                      {d.currentLatitude && (<div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                          <lucide_react_1.MapPin size={9}/> {d.currentLatitude.toFixed(4)}, {d.currentLongitude?.toFixed(4)}
                        </div>)}
                    </div>
                  </div>
                </div>)))}
          </div>

          {/* Stats Footer */}
          {stats && (<div className="p-4 border-t border-white/5 space-y-2 flex-shrink-0">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Today's Bookings</span>
                <span className="text-white font-medium">{stats.today?.bookings ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Today's Revenue</span>
                <span className="text-white font-medium">£{stats.today?.revenue?.toFixed(2) ?? '0.00'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Active Drivers</span>
                <span className="text-white font-medium">{stats.drivers?.active ?? 0}</span>
              </div>
            </div>)}
        </div>
      </div>
    </div>);
}
// ─── ROOT ─────────────────────────────────────────────────
function Root() {
    const [loggedIn, setLoggedIn] = (0, react_1.useState)(!!localStorage.getItem('accessToken'));
    return (<>
      <react_hot_toast_1.Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', fontSize: '13px' } }}/>
      {loggedIn ? <DispatcherApp /> : <LoginScreen onLogin={() => setLoggedIn(true)}/>}
    </>);
}
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode><Root /></react_1.default.StrictMode>);
//# sourceMappingURL=App.js.map