"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PaymentsPage;
// src/pages/PaymentsPage.tsx
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const recharts_1 = require("recharts");
const api_1 = __importDefault(require("../lib/api"));
function PaymentsPage() {
    const [page, setPage] = (0, react_1.useState)(1);
    const { data: revenue } = (0, react_query_1.useQuery)({
        queryKey: ['revenue-30d'],
        queryFn: () => api_1.default.get('/reports/revenue?days=30').then(r => r.data.data),
    });
    const { data, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ['payments', page],
        queryFn: () => api_1.default.get(`/payments/history?page=${page}&limit=15`).then(r => r.data),
        keepPreviousData: true,
    });
    const payments = data?.data ?? [];
    const pagination = data?.pagination;
    const statusBadge = (s) => {
        const m = { PAID: 'badge-green', PENDING: 'badge-yellow', FAILED: 'badge-red', REFUNDED: 'badge-gray' };
        return <span className={`badge ${m[s] ?? 'badge-gray'}`}>{s}</span>;
    };
    return (<div className="space-y-5 max-w-7xl mx-auto">
      <div><h1 className="text-2xl font-bold text-gray-900">Payments</h1><p className="text-gray-500 text-sm mt-0.5">Revenue and transaction history</p></div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
            { label: 'Total Revenue (30d)', value: revenue ? `£${revenue.totalRevenue?.toFixed(2)}` : '—' },
            { label: 'Transactions', value: revenue?.totalTransactions ?? '—' },
            { label: 'Cash vs Card', value: revenue ? `${Math.round(((revenue.byMethod?.CASH ?? 0) / (revenue.totalRevenue || 1)) * 100)}% cash` : '—' },
        ].map(({ label, value }) => (<div key={label} className="card p-5">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>))}
      </div>

      {/* Chart */}
      {revenue?.byDay?.length > 0 && (<div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Daily Revenue — Last 30 Days</h2>
          <recharts_1.ResponsiveContainer width="100%" height={180}>
            <recharts_1.BarChart data={revenue.byDay}>
              <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <recharts_1.XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)}/>
              <recharts_1.YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`}/>
              <recharts_1.Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [`£${v.toFixed(2)}`, 'Revenue']}/>
              <recharts_1.Bar dataKey="revenue" fill="#f59e0b" radius={[3, 3, 0, 0]}/>
            </recharts_1.BarChart>
          </recharts_1.ResponsiveContainer>
        </div>)}

      {/* Transactions Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-50"><h2 className="font-semibold text-gray-900">Transactions</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50"><tr>
              {['ID', 'Passenger', 'Amount', 'Method', 'Status', 'Date'].map(h => (<th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3.5">{h}</th>))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20"/></td>)}</tr>)
            : payments.map((p) => (<tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">{p.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{p.booking?.passenger?.user?.firstName} {p.booking?.passenger?.user?.lastName}</td>
                    <td className="px-5 py-4 font-semibold text-gray-900">£{p.amount.toFixed(2)}</td>
                    <td className="px-5 py-4"><span className="badge badge-gray">{p.method}</span></td>
                    <td className="px-5 py-4">{statusBadge(p.status)}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>))}
            </tbody>
          </table>
          {!isLoading && payments.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No transactions yet</div>}
        </div>
        {pagination && pagination.totalPages > 1 && (<div className="flex justify-between items-center px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">Total: {pagination.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=PaymentsPage.js.map