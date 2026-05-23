import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login    from './components/Login.jsx';
import Sidebar  from './components/Sidebar.jsx';
import TopBar   from './components/TopBar.jsx';
import Overview   from './components/Overview.jsx';
import Orders     from './components/Orders.jsx';
import Inventory  from './components/Inventory.jsx';
import Payments   from './components/Payments.jsx';
import Toast      from './components/Toast.jsx';

function DashboardLayout({ onLogout, toasts, removeToast }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuToggle={() => setSidebarOpen(true)} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="overview"   element={<Overview />} />
            <Route path="orders"     element={<Orders />} />
            <Route path="inventory"  element={<Inventory />} />
            <Route path="payments"   element={<Payments />} />
            <Route path="*"          element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mdAdmin'))?.loggedIn === true; }
    catch { return false; }
  });
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const addToast = (msg) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => removeToast(id), 5000);
  };

  // Listen for real-time new-order events emitted by Orders.jsx
  useEffect(() => {
    const handler = (e) => {
      const order = e.detail;
      addToast(`New order from ${order.retailer_name}!`);
    };
    window.addEventListener('new-order', handler);
    return () => window.removeEventListener('new-order', handler);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('mdAdmin', JSON.stringify({ loggedIn: true, username: 'admin' }));
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('mdAdmin');
    setLoggedIn(false);
  };

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route
          path="/*"
          element={
            <DashboardLayout
              onLogout={handleLogout}
              toasts={toasts}
              removeToast={removeToast}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
