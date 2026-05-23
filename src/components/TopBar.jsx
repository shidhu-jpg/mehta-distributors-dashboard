import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  overview:  'Overview',
  orders:    'Orders',
  inventory: 'Inventory',
  payments:  'Payments',
};

export default function TopBar({ onMenuToggle, onLogout }) {
  const { pathname } = useLocation();
  const segment = pathname.split('/').filter(Boolean).pop() || 'overview';
  const title   = PAGE_TITLES[segment] || 'Dashboard';

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="font-heading font-bold text-gray-900 text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:block">Welcome, Admin</span>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
