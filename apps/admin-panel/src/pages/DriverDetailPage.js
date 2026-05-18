"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DriverDetailPage;
// src/pages/DriverDetailPage.tsx
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const lucide_react_1 = require("lucide-react");
const recharts_1 = require("recharts");
const api_1 = __importDefault(require("../lib/api"));
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
function DriverDetailPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const qc = (0, react_query_1.useQueryClient)();
    const { data: driver, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['driver', id],
        queryFn: () => api_1.default.get(`/drivers/${id}`).then(r => r.data.data),
    });
    const { data: earnings } = (0, react_query_1.useQuery)({
        queryKey: ['driver-earnings', id],
        queryFn: () => api_1.default.get(`/drivers/${id}/earnings?days=14`).then(r => r.data.data),
        enabled: !!driver,
    });
    const approveMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.default.post(`/drivers/${id}/approve`),
        onSuccess: () => { react_hot_toast_1.default.success('Driver approved!'); void qc.invalidateQueries({ queryKey: ['driver', id] }); },
    });
    const suspendMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.default.post(`/drivers/${id}/suspend`, { reason: 'Admin action' }),
        onSuccess: () => { react_hot_toast_1.default.success('Driver suspended'); void qc.invalidateQueries({ queryKey: ['driver', id] }); },
    });
    if (isLoading)
        return <div className="max-w-4xl mx-auto"><div className="skeleton h-64 w-full rounded-2xl"/></div>;
    if (!driver)
        return <div className="text-center py-20 text-gray-400">Driver not found</div>;
    const d = driver;
    return (<div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><lucide_react_1.ArrowLeft size={18}/></button>
        <h1 className="text-xl font-bold text-gray-900">Driver Profile</h1>
        <div className="flex-1"/>
        {d.status === 'PENDING_APPROVAL' && (<>
            <button onClick={() => approveMutation.mutate()} className="btn-primary flex items-center gap-1.5">
              <lucide_react_1.CheckCircle size={15}/> Approve
            </button>
            <button onClick={() => react_hot_toast_1.default.error('Use reject button below')} className="btn-danger flex items-center gap-1.5">
              <lucide_react_1.XCircle size={15}/> Reject
            </button>
          </>)}
        {d.status === 'APPROVED' && (<button onClick={() => { if (confirm('Suspend this driver?'))
            suspendMutation.mutate(); }} className="btn-danger flex items-center gap-1.5">
            <lucide_react_1.AlertTriangle size={15}/> Suspend
          </button>)}
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
              <lucide_react_1.Star size={14} className="text-amber-400 fill-amber-400"/>
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
        ].map(({ l, v }) => (<div key={l} className="flex justify-between">
                <span className="text-gray-400">{l}</span>
                <span className="font-medium text-gray-800 text-right max-w-[150px] truncate">{v}</span>
              </div>))}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {/* Earnings Chart */}
          {earnings && (<div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Earnings — Last 14 Days</h3>
              <div className="flex gap-6 mb-4">
                <div><div className="text-xl font-bold text-gray-900">£{earnings.totalEarnings?.toFixed(2)}</div><div className="text-xs text-gray-400">Period Total</div></div>
                <div><div className="text-xl font-bold text-gray-900">{earnings.totalTrips}</div><div className="text-xs text-gray-400">Trips</div></div>
              </div>
              <recharts_1.ResponsiveContainer width="100%" height={140}>
                <recharts_1.BarChart data={earnings.breakdown ?? []}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <recharts_1.XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)}/>
                  <recharts_1.YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`}/>
                  <recharts_1.Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [`£${v.toFixed(2)}`, 'Earnings']}/>
                  <recharts_1.Bar dataKey="earnings" fill="#f59e0b" radius={[4, 4, 0, 0]}/>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>
            </div>)}

          {/* Vehicles */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Vehicles</h3>
            {d.vehicles?.length === 0 ? (<div className="text-sm text-gray-400">No vehicles registered</div>) : (<div className="space-y-3">
                {d.vehicles?.map((v) => (<div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">{v.make} {v.model} ({v.year})</div>
                      <div className="text-xs text-gray-500">{v.color} · {v.vehicleType} · <span className="font-mono">{v.licensePlate}</span></div>
                    </div>
                    <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>{v.isActive ? 'Active' : 'Inactive'}</span>
                  </div>))}
              </div>)}
          </div>

          {/* Documents */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Documents</h3>
            {d.documents?.length === 0 ? (<div className="text-sm text-gray-400">No documents uploaded</div>) : (<div className="space-y-2">
                {d.documents?.map((doc) => (<div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
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
                  </div>))}
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=DriverDetailPage.js.map