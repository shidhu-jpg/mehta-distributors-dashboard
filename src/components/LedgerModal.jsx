import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
  Paid:    'bg-green-100 text-green-700',
  Partial: 'bg-orange-100 text-orange-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function LedgerModal({ payment, onClose, onPaymentUpdated }) {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [amount,       setAmount]       = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!payment) return;
    setLoading(true);
    fetch(`${API_URL}/api/payments/${payment.id}/transactions`)
      .then((r) => r.json())
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [payment?.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/payments/${payment.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, notes: notes.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add payment'); return; }
      setTransactions((prev) => [data.transaction, ...prev]);
      onPaymentUpdated(data.payment);
      setAmount('');
      setNotes('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  const outstanding = Number(payment.outstanding_due || 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-heading font-semibold text-gray-900 text-lg leading-tight">{payment.retailer_name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[payment.status] || 'bg-gray-100 text-gray-600'}`}>
                {payment.status}
              </span>
              {payment.due_date && (
                <span className="text-xs text-gray-400">Due {formatDate(payment.due_date)}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Credit summary */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/40">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Total Credit</p>
            <p className="font-semibold text-gray-900 text-sm">{formatINR(payment.total_order_value)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Collected</p>
            <p className="font-semibold text-green-600 text-sm">{formatINR(payment.amount_paid)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Outstanding</p>
            <p className={`font-semibold text-sm ${outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {formatINR(outstanding)}
            </p>
          </div>
        </div>

        {/* Add payment form */}
        <form onSubmit={handleAdd} className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Record New Payment</p>
          <div className="flex gap-2">
            <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden flex-shrink-0 focus-within:ring-2 focus-within:ring-primary/40">
              <span className="pl-3 text-gray-400 text-sm select-none">₹</span>
              <input
                type="number"
                min="1"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-28 py-2 pr-3 text-sm focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Note — e.g. May instalment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              {saving ? '...' : '+ Add'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
        </form>

        {/* Transaction history */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment History</p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">No payments recorded yet</p>
              <p className="text-gray-300 text-xs mt-1">Use the form above to record the first payment</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-400">{formatDateTime(t.created_at)}</p>
                    {t.notes && <p className="text-sm text-gray-700 mt-0.5">{t.notes}</p>}
                  </div>
                  <p className="font-semibold text-green-600">{formatINR(t.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
