import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const API_URL      = import.meta.env.VITE_API_URL        || 'http://localhost:5000';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL   || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const STATUSES   = ['New', 'Processing', 'Dispatched'];
const STATUS_BADGE = {
  New:         'bg-blue-100 text-blue-700',
  Processing:  'bg-orange-100 text-orange-700',
  Dispatched:  'bg-green-100 text-green-700',
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const EMPTY_ORDER = { retailer_name: '', phone: '', product: '', quantity: '', note: '' };

export default function Orders({ addToast }) {
  const [orders,      setOrders]      = useState([]);
  const [inventory,   setInventory]   = useState([]);
  const [filter,      setFilter]      = useState('All');
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalForm,   setModalForm]   = useState(EMPTY_ORDER);
  const [modalErrors, setModalErrors] = useState({});
  const [saving,      setSaving]      = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    fetch(`${API_URL}/api/inventory`).then((r) => r.json()).then(setInventory).catch(() => {});
  }, [loadOrders]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new;
        setOrders((prev) => [newOrder, ...prev]);
        // Bubble toast to App — Orders page re-renders before App's addToast propagates,
        // so we emit a custom event for App.jsx to catch
        window.dispatchEvent(new CustomEvent('new-order', { detail: newOrder }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id, status) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    try {
      await fetch(`${API_URL}/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      loadOrders();
    }
  };

  const validateModal = () => {
    const e = {};
    if (!modalForm.retailer_name.trim()) e.retailer_name = 'Required';
    if (!modalForm.phone.trim()) e.phone = 'Required';
    if (!modalForm.product) e.product = 'Required';
    if (!modalForm.quantity || Number(modalForm.quantity) < 1) e.quantity = 'Must be ≥ 1';
    return e;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const errs = validateModal();
    if (Object.keys(errs).length) { setModalErrors(errs); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailer_name: modalForm.retailer_name.trim(),
          phone: modalForm.phone.trim(),
          product: modalForm.product,
          quantity: Number(modalForm.quantity),
          note: modalForm.note.trim() || null,
        }),
      });
      const created = await res.json();
      setOrders((prev) => [created, ...prev]);
      setModalOpen(false);
      setModalForm(EMPTY_ORDER);
    } catch {
      alert('Failed to create order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === 'All' ? orders : orders.filter((o) => o.status === filter);
  const countOf   = (s) => orders.filter((o) => o.status === s).length;

  const inputCls = (f) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      modalErrors[f] ? 'border-red-400' : 'border-gray-200'
    }`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['All', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === s ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              {s}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === s ? 'bg-white/20' : 'bg-gray-100'}`}>
                {s === 'All' ? orders.length : countOf(s)}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setModalOpen(true); setModalForm(EMPTY_ORDER); setModalErrors({}); }}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-900 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Retailer', 'Phone', 'Product', 'Qty', 'Note', 'Date', 'Status', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : filtered.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{o.retailer_name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.phone}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-32">
                        <span className="block truncate" title={o.product}>{o.product}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{o.quantity}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-32">
                        {o.note ? (
                          <span className="block truncate cursor-help" title={o.note}>{o.note}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-semibold text-gray-900">New Order</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Retailer Name *</label>
                <input className={inputCls('retailer_name')} value={modalForm.retailer_name}
                  onChange={(e) => setModalForm((f) => ({ ...f, retailer_name: e.target.value }))} />
                {modalErrors.retailer_name && <p className="text-red-500 text-xs mt-0.5">{modalErrors.retailer_name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                <input className={inputCls('phone')} value={modalForm.phone}
                  onChange={(e) => setModalForm((f) => ({ ...f, phone: e.target.value }))} />
                {modalErrors.phone && <p className="text-red-500 text-xs mt-0.5">{modalErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product *</label>
                <select className={inputCls('product')} value={modalForm.product}
                  onChange={(e) => setModalForm((f) => ({ ...f, product: e.target.value }))}>
                  <option value="">Select product</option>
                  {inventory.map((p) => (
                    <option key={p.id} value={p.product_name}>{p.product_name}</option>
                  ))}
                </select>
                {modalErrors.product && <p className="text-red-500 text-xs mt-0.5">{modalErrors.product}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
                <input type="number" min="1" className={inputCls('quantity')} value={modalForm.quantity}
                  onChange={(e) => setModalForm((f) => ({ ...f, quantity: e.target.value }))} />
                {modalErrors.quantity && <p className="text-red-500 text-xs mt-0.5">{modalErrors.quantity}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optional)</label>
                <textarea rows={2} className={`${inputCls('note')} resize-none`} value={modalForm.note}
                  onChange={(e) => setModalForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
