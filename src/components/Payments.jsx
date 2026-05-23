import { useEffect, useState } from 'react';
import LedgerModal from './LedgerModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

const STATUS_BADGE = {
  Paid:    'bg-green-100 text-green-700',
  Partial: 'bg-orange-100 text-orange-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function Payments() {
  const [payments,         setPayments]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [editing,          setEditing]          = useState({}); // id → amount string
  const [saving,           setSaving]           = useState(null);
  const [selectedPayment,  setSelectedPayment]  = useState(null);

  const loadPayments = () => {
    setLoading(true);
    fetch(`${API_URL}/api/payments`)
      .then((r) => r.json())
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPayments(); }, []);

  const handleSave = async (id) => {
    const p      = payments.find((x) => x.id === id);
    const amount = Number(editing[id]);
    if (isNaN(amount) || amount < 0) return;
    setSaving(id);
    try {
      const res = await fetch(`${API_URL}/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: amount }),
      });
      const updated = await res.json();
      setPayments((prev) => prev.map((x) => x.id === id ? updated : x));
      setEditing((e) => { const next = { ...e }; delete next[id]; return next; });
    } catch {
      alert('Failed to update payment.');
    } finally {
      setSaving(null);
    }
  };

  const handleMarkPaid = async (id) => {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    setSaving(id);
    try {
      const res = await fetch(`${API_URL}/api/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: Number(p.total_order_value) }),
      });
      const updated = await res.json();
      setPayments((prev) => prev.map((x) => x.id === id ? updated : x));
    } catch {
      alert('Failed to mark as paid.');
    } finally {
      setSaving(null);
    }
  };

  const handlePaymentUpdated = (updated) => {
    setPayments((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setSelectedPayment(updated);
  };

  const totalOutstanding = payments.reduce((s, p) => s + Number(p.outstanding_due || 0), 0);
  const totalCollected   = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Outstanding</p>
          {loading
            ? <div className="skeleton h-8 w-32" />
            : <p className="font-heading font-bold text-2xl text-red-600">{formatINR(totalOutstanding)}</p>
          }
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Collected</p>
          {loading
            ? <div className="skeleton h-8 w-32" />
            : <p className="font-heading font-bold text-2xl text-green-600">{formatINR(totalCollected)}</p>
          }
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Retailer', 'Total Value', 'Amt Paid', 'Outstanding', 'Due Date', 'Status', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : payments.map((p) => {
                    const curVal = editing[p.id] ?? String(p.amount_paid);
                    const isDirty = editing[p.id] !== undefined && editing[p.id] !== String(p.amount_paid);
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="font-medium text-primary hover:underline text-left"
                          >
                            {p.retailer_name}
                          </button>
                          {(p.updated_at || p.created_at) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {p.updated_at ? 'Paid on' : 'Added on'} {formatDateTime(p.updated_at || p.created_at)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatINR(p.total_order_value)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatINR(p.amount_paid)}</td>
                        <td className="px-4 py-3 font-medium text-red-600">{formatINR(p.outstanding_due)}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(p.due_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Editable amount */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={curVal}
                                onChange={(e) => setEditing((ev) => ({ ...ev, [p.id]: e.target.value }))}
                                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                              {isDirty && (
                                <button onClick={() => handleSave(p.id)} disabled={saving === p.id}
                                  className="px-2 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-blue-900 disabled:opacity-50">
                                  {saving === p.id ? '...' : 'Save'}
                                </button>
                              )}
                            </div>
                            {/* Mark Paid */}
                            {p.status !== 'Paid' && (
                              <button onClick={() => handleMarkPaid(p.id)} disabled={saving === p.id}
                                className="px-2 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50 whitespace-nowrap">
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {selectedPayment && (
      <LedgerModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onPaymentUpdated={handlePaymentUpdated}
      />
    )}
  );
}
