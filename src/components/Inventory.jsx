import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const UNITS   = ['boxes', 'units', 'cartons'];

function stockStatus(qty) {
  if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700',    rowCls: 'bg-red-50/60' };
  if (qty < 20)  return { label: 'Low Stock',    cls: 'bg-orange-100 text-orange-700', rowCls: 'bg-orange-50/60' };
  return              { label: 'In Stock',     cls: 'bg-green-100 text-green-700',  rowCls: '' };
}

const EMPTY_PRODUCT = { product_name: '', category: '', stock_quantity: '', unit: 'boxes' };

export default function Inventory() {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState({}); // id → qty string
  const [saving,      setSaving]      = useState(null);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalForm,   setModalForm]   = useState(EMPTY_PRODUCT);
  const [modalErrors, setModalErrors] = useState({});
  const [modalSaving, setModalSaving] = useState(false);

  const loadProducts = () => {
    setLoading(true);
    fetch(`${API_URL}/api/inventory`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const handleQtyChange = (id, val) => {
    setEditing((e) => ({ ...e, [id]: val }));
  };

  const handleSave = async (id) => {
    const qty = Number(editing[id]);
    if (isNaN(qty) || qty < 0) return;
    setSaving(id);
    try {
      const res = await fetch(`${API_URL}/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: qty }),
      });
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => p.id === id ? updated : p));
      setEditing((e) => { const next = { ...e }; delete next[id]; return next; });
    } catch {
      alert('Failed to update. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const adjustQty = (id, current, delta) => {
    const newVal = Math.max(0, (Number(editing[id] ?? current)) + delta);
    setEditing((e) => ({ ...e, [id]: String(newVal) }));
  };

  const validateModal = () => {
    const e = {};
    if (!modalForm.product_name.trim()) e.product_name = 'Required';
    if (!modalForm.category.trim()) e.category = 'Required';
    if (modalForm.stock_quantity === '' || Number(modalForm.stock_quantity) < 0) e.stock_quantity = 'Must be ≥ 0';
    if (!modalForm.unit) e.unit = 'Required';
    return e;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const errs = validateModal();
    if (Object.keys(errs).length) { setModalErrors(errs); return; }
    setModalSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: modalForm.product_name.trim(),
          category: modalForm.category.trim(),
          stock_quantity: Number(modalForm.stock_quantity),
          unit: modalForm.unit,
        }),
      });
      const created = await res.json();
      setProducts((prev) => [...prev, created].sort((a, b) => a.product_name.localeCompare(b.product_name)));
      setModalOpen(false);
      setModalForm(EMPTY_PRODUCT);
    } catch {
      alert('Failed to add product. Please try again.');
    } finally {
      setModalSaving(false);
    }
  };

  const inStock    = products.filter((p) => p.stock_quantity >= 20).length;
  const lowStock   = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity < 20).length;
  const outOfStock = products.filter((p) => p.stock_quantity === 0).length;

  const inputCls = (f) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      modalErrors[f] ? 'border-red-400' : 'border-gray-200'
    }`;

  return (
    <div className="space-y-5">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: products.length, cls: 'text-gray-900' },
          { label: 'In Stock',       value: inStock,        cls: 'text-green-600' },
          { label: 'Low Stock',      value: lowStock,       cls: 'text-orange-600' },
          { label: 'Out of Stock',   value: outOfStock,     cls: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`font-heading font-bold text-2xl ${s.cls}`}>
              {loading ? <span className="skeleton h-7 w-12 block" /> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-end">
        <button
          onClick={() => { setModalOpen(true); setModalForm(EMPTY_PRODUCT); setModalErrors({}); }}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-900 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Product Name', 'Category', 'Stock Qty', 'Unit', 'Status', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : products.map((p) => {
                    const s      = stockStatus(p.stock_quantity);
                    const curVal = editing[p.id] ?? String(p.stock_quantity);
                    const isDirty = editing[p.id] !== undefined && editing[p.id] !== String(p.stock_quantity);
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 transition-colors ${s.rowCls}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.product_name}</td>
                        <td className="px-4 py-3 text-gray-600">{p.category}</td>
                        <td className="px-4 py-3 text-gray-600">{p.stock_quantity}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{p.unit}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => adjustQty(p.id, p.stock_quantity, -1)}
                              className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-lg font-bold">
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={curVal}
                              onChange={(e) => handleQtyChange(p.id, e.target.value)}
                              className="w-16 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button onClick={() => adjustQty(p.id, p.stock_quantity, 1)}
                              className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-lg font-bold">
                              +
                            </button>
                            {isDirty && (
                              <button onClick={() => handleSave(p.id)} disabled={saving === p.id}
                                className="ml-1 w-7 h-7 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:opacity-50">
                                {saving === p.id
                                  ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                }
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

      {/* Add Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading font-semibold text-gray-900">Add Product</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleModalSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name *</label>
                <input className={inputCls('product_name')} value={modalForm.product_name}
                  onChange={(e) => setModalForm((f) => ({ ...f, product_name: e.target.value }))} />
                {modalErrors.product_name && <p className="text-red-500 text-xs mt-0.5">{modalErrors.product_name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                <input className={inputCls('category')} value={modalForm.category}
                  onChange={(e) => setModalForm((f) => ({ ...f, category: e.target.value }))} />
                {modalErrors.category && <p className="text-red-500 text-xs mt-0.5">{modalErrors.category}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Stock Quantity *</label>
                <input type="number" min="0" className={inputCls('stock_quantity')} value={modalForm.stock_quantity}
                  onChange={(e) => setModalForm((f) => ({ ...f, stock_quantity: e.target.value }))} />
                {modalErrors.stock_quantity && <p className="text-red-500 text-xs mt-0.5">{modalErrors.stock_quantity}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Unit *</label>
                <select className={inputCls('unit')} value={modalForm.unit}
                  onChange={(e) => setModalForm((f) => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={modalSaving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-60">
                  {modalSaving ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
