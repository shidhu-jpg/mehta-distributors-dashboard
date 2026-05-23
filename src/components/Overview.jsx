import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_BADGE = {
  New:         'bg-blue-100 text-blue-700',
  Processing:  'bg-orange-100 text-orange-700',
  Dispatched:  'bg-green-100 text-green-700',
};

function StatCard({ title, value, icon, colorCls, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorCls}`}>
          {icon}
        </div>
      </div>
      {loading
        ? <div className="skeleton h-8 w-24" />
        : <p className="font-heading font-bold text-2xl text-gray-900">{value}</p>
      }
    </div>
  );
}

export default function Overview() {
  const [orders,    setOrders]    = useState([]);
  const [inventory, setInventory] = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/orders`).then((r) => r.json()),
      fetch(`${API_URL}/api/inventory`).then((r) => r.json()),
      fetch(`${API_URL}/api/payments`).then((r) => r.json()),
    ])
      .then(([o, i, p]) => { setOrders(o); setInventory(i); setPayments(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const ordersToday  = orders.filter((o) => new Date(o.created_at).toDateString() === today).length;
  const lowStockCount = inventory.filter((i) => i.stock_quantity < 20).length;
  const totalOutstanding = payments.reduce((sum, p) => sum + Number(p.outstanding_due || 0), 0);
  const totalRetailers = new Set(payments.map((p) => p.retailer_name)).size;
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders Today"
          value={ordersToday}
          loading={loading}
          colorCls="bg-blue-100"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockCount}
          loading={loading}
          colorCls="bg-orange-100"
          icon={
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          title="Total Outstanding"
          value={loading ? '' : formatINR(totalOutstanding)}
          loading={loading}
          colorCls="bg-red-100"
          icon={
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Retailers"
          value={totalRetailers}
          loading={loading}
          colorCls="bg-green-100"
          icon={
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/orders" className="text-sm text-blue-600 hover:underline">
            View All Orders →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Retailer', 'Product', 'Qty', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-6 py-3"><div className="skeleton h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{o.retailer_name}</td>
                      <td className="px-6 py-3 text-gray-600">{o.product}</td>
                      <td className="px-6 py-3 text-gray-600">{o.quantity}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
