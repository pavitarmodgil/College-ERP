export default function DeactivateConfirmModal({ user, onClose, onConfirm, loading }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-[0_20px_40px_rgba(70,69,85,0.12)] border border-outline-variant/10 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center">
          {/* Warning icon */}
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
            <span
              className="material-symbols-outlined text-amber-500 text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-on-surface tracking-tight mb-3 font-headline">
            Deactivate User
          </h3>
          <p className="text-on-surface-variant leading-relaxed text-sm px-2">
            This will prevent{' '}
            <span className="font-bold text-on-surface">{user?.email}</span>{' '}
            from logging in. Their academic records will be preserved in the archive.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low p-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 order-2 sm:order-1 py-3 px-6 rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 order-1 sm:order-2 py-3 px-6 rounded-full text-sm font-bold bg-[#dc2626] text-white shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}
