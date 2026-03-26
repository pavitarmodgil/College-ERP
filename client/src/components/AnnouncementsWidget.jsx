import { useState, useEffect } from 'react'
import api from '../lib/api'
import AnnouncementDetailModal from './AnnouncementDetailModal'

const ROLE_BADGE = {
  ALL:     { label: 'Everyone',      cls: 'bg-primary-fixed text-primary' },
  STUDENT: { label: 'Students',      cls: 'bg-tertiary-fixed text-tertiary' },
  TEACHER: { label: 'Teachers',      cls: 'bg-secondary-fixed text-secondary' },
  ADMIN:   { label: 'Admins',        cls: 'bg-error-container text-error' },
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-surface-container-low rounded-xl p-4 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-3/4" />
          <div className="h-2 bg-slate-100 rounded w-full" />
          <div className="h-2 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default function AnnouncementsWidget({ limit = 3 }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/announcements', { params: { limit } })
      .then(({ data }) => setItems(data.announcements))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [limit])

  if (loading) return <Skeleton />

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl mb-2 block">campaign</span>
        <p className="text-sm">No announcements yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((a) => {
          const badge = ROLE_BADGE[a.targetRole] || ROLE_BADGE.ALL
          const date  = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              className="bg-surface-container-low rounded-xl p-4 space-y-2 hover:bg-surface-container transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-on-surface leading-snug line-clamp-2">{a.title}</p>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant line-clamp-2">{a.body}</p>
              <p className="text-[10px] text-outline font-medium">{date}</p>
            </div>
          )
        })}
      </div>

      {selected && (
        <AnnouncementDetailModal announcement={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
