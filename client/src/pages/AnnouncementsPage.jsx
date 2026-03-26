import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'

const ROLE_BADGE = {
  ALL:     { label: 'Everyone',      cls: 'bg-primary-fixed text-primary' },
  STUDENT: { label: 'Students',      cls: 'bg-tertiary-fixed text-tertiary' },
  TEACHER: { label: 'Teachers',      cls: 'bg-secondary-fixed text-secondary' },
  ADMIN:   { label: 'Admins',        cls: 'bg-error-container text-error' },
}

const PAGE_SIZE = 10

export default function AnnouncementsPage() {
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/announcements', { params: { limit: PAGE_SIZE, page } })
      .then(({ data }) => {
        setItems(data.announcements)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        <div className="px-10 py-10 max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-extrabold mb-1">
              University Feed
            </p>
            <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">
              Announcements
            </h1>
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-6 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl p-8 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 block">campaign</span>
              <p className="text-lg font-medium">No announcements for you yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((a) => {
                const badge = ROLE_BADGE[a.targetRole] || ROLE_BADGE.ALL
                const date  = new Date(a.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })
                return (
                  <article key={a.id} className="bg-surface-container-lowest rounded-2xl p-8 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-xl font-bold font-headline text-on-surface leading-snug">
                        {a.title}
                      </h2>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-3 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                      {a.body}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-outline pt-2">
                      <span className="material-symbols-outlined text-sm">person</span>
                      <span>{a.author?.email}</span>
                      <span className="mx-1">·</span>
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{date}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2.5 bg-surface-container-low rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-5 py-2.5 bg-surface-container-low rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
