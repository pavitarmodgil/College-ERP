const ROLE_BADGE = {
  ALL:     { label: 'Everyone', cls: 'bg-primary-fixed text-primary' },
  STUDENT: { label: 'Students', cls: 'bg-tertiary-fixed text-tertiary' },
  TEACHER: { label: 'Teachers', cls: 'bg-secondary-fixed text-secondary' },
  ADMIN:   { label: 'Admins',   cls: 'bg-error-container text-error' },
}

export default function AnnouncementDetailModal({ announcement: a, onClose }) {
  if (!a) return null
  const badge = ROLE_BADGE[a.targetRole] || ROLE_BADGE.ALL
  const date  = new Date(a.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-4 gap-4">
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full mb-3 ${badge.cls}`}>
              {badge.label}
            </span>
            <h2 className="text-xl font-bold font-headline text-on-surface leading-snug">
              {a.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-8 pb-4">
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {a.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-outline-variant/10 flex items-center gap-3 text-xs text-outline">
          <span className="material-symbols-outlined text-sm">person</span>
          <span>{a.author?.email}</span>
          <span className="mx-1">·</span>
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  )
}
