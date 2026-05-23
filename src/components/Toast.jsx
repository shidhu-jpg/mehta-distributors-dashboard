export default function Toast({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter bg-green-600 text-white px-5 py-4 rounded-xl shadow-xl flex items-start gap-3 min-w-72 max-w-sm pointer-events-auto"
        >
          <span className="text-xl flex-shrink-0">🛎️</span>
          <p className="text-sm font-medium flex-1">{t.msg}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-green-200 hover:text-white flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
