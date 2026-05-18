"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BookingsPage;
// src/pages/BookingsPage.tsx
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../lib/api"));
const STATUSES = ['', 'PENDING', 'SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'];
const statusClass = {
    COMPLETED: 'badge-green', CANCELLED: 'badge-red', IN_PROGRESS: 'badge-blue',
    ACCEPTED: 'badge-blue', SEARCHING: 'badge-yellow', PENDING: 'badge-yellow',
    DRIVER_ARRIVED: 'badge-blue', NO_DRIVER_FOUND: 'badge-red',
};
function BookingsPage() {
    const [page, setPage] = (0, react_1.useState)(1);
    const [status, setStatus] = (0, react_1.useState)('');
    const [search, setSearch] = (0, react_1.useState)('');
    const { data, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['bookings', page, status],
        queryFn: () => api_1.default.get(`/bookings?page=${page}&limit=15${status ? `&status=${status}` : ''}`).then(r => r.data),
        keepPreviousData: true,
    });
    const bookings = data?.data ?? [];
    const pagination = data?.pagination;
    return (<div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">All ride bookings across your fleet</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <lucide_react_1.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by passenger, driver..." className="input pl-9 py-2 text-sm"/>
        </div>
        <div className="flex items-center gap-2">
          <lucide_react_1.Filter size={15} className="text-gray-400"/>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input py-2 text-sm w-auto pr-8">
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                {['Booking ID', 'Passenger', 'Driver', 'Pickup', 'Fare', 'Payment', 'Status', 'Date', ''].map(h => (<th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3.5">{h}</th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (<tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (<td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20"/></td>))}
                  </tr>))
            : bookings.map((b) => (<tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">{b.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {b.passenger?.user?.firstName} {b.passenger?.user?.lastName}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {b.driver ? `${b.driver.user.firstName} ${b.driver.user.lastName}` : <span className="text-gray-300">Unassigned</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-500 max-w-[180px]">
                      <div className="truncate text-xs">{b.pickupAddress}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">£{(b.actualFare ?? b.estimatedFare).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className="badge badge-gray">{b.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${statusClass[b.status] ?? 'badge-gray'}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <react_router_dom_1.Link to={`/bookings/${b.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors inline-flex">
                        <lucide_react_1.Eye size={15}/>
                      </react_router_dom_1.Link>
                    </td>
                  </tr>))}
            </tbody>
          </table>
          {!isLoading && bookings.length === 0 && (<div className="text-center py-16 text-gray-400 text-sm">No bookings found</div>)}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (<div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600">
                <lucide_react_1.ChevronLeft size={16}/>
              </button>
              <span className="text-sm text-gray-600 px-2">Page {page} of {pagination.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600">
                <lucide_react_1.ChevronRight size={16}/>
              </button>
            </div>
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=BookingsPage.js.map