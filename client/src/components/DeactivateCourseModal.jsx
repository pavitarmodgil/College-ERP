export default function DeactivateCourseModal({ course, loading, error, onClose, onConfirm }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden">
        {/* Warning header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="w-14 h-14 bg-error-container rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-error text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              block
            </span>
          </div>
          <h2 className="text-xl font-bold font-headline mb-2">Deactivate Course?</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            You are about to deactivate{' '}
            <span className="font-bold text-on-surface">{course?.name}</span>
            {' '}(<span className="font-mono text-xs">{course?.code}</span>).
            Students will no longer see it as available.
          </p>
        </div>

        {/* Blocked banner */}
        {error && (
          <div className="mx-8 mb-4 flex items-start gap-3 bg-error-container/30 border border-error/20 px-4 py-3 rounded-xl">
            <span className="material-symbols-outlined text-error text-base mt-0.5 flex-shrink-0">warning</span>
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          {!error && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-error text-on-error font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60"
            >
              {loading ? 'Deactivating…' : 'Deactivate'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
