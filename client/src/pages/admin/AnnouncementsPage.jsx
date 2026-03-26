import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import AnnouncementFormModal from '../../components/AnnouncementFormModal'
import AnnouncementDetailModal from '../../components/AnnouncementDetailModal'
import api from '../../lib/api'

const FILTERS = [
  { key: 'ALL_FILTER', label: 'All' },
  { key: 'ALL',     label: 'Everyone' },
  { key: 'STUDENT', label: 'Students' },
  { key: 'TEACHER', label: 'Teachers' },
  { key: 'ADMIN',   label: 'Admins' },
]

const ROLE_BADGE = {
  ALL:     { label: 'Everyone', cls: 'bg-primary-fixed text-primary' },
  STUDENT: { label: 'Students', cls: 'bg-tertiary-fixed text-tertiary' },
  TEACHER: { label: 'Teachers', cls: 'bg-secondary-fixed text-secondary' },
  ADMIN:   { label: 'Admins',   cls: 'bg-error-container text-error' },
}

const PAGE_SIZE = 15

export default function AdminAnnouncementsPage() {
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [filter,  setFilter]  = useState('ALL_FILTER')
  const [loading, setLoading] = useState(true)
  const [modal,    setModal]    = useState(null) // null | 'create' | announcement object
  const [viewing,  setViewing]  = useState(null)

  const fetchAnnouncements = useCallback(() => {
    setLoading(true)
    // admin sees all announcements regardless of targetRole — use a large limit and filter client-side for now,
    // or we fetch all and filter. We pass limit=100 to get plenty then filter.
    api.get('/announcements', { params: { limit: 100, page: 1 } })
      .then(({ data }) => {
        let all = data.announcements
        if (filter !== 'ALL_FILTER') all = all.filter((a) => a.targetRole === filter)
        setTotal(all.length)
        const start = (page - 1) * PAGE_SIZE
        setItems(all.slice(start, start + PAGE_SIZE))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, page])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  function handleSaved() {
    setModal(null)
    setPage(1)
    fetchAnnouncements()
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return
    try {
      await api.delete(`/announcements/${id}`)
      fetchAnnouncements()
    } catch {
      alert('Failed to delete announcement')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        <div className="px-10 py-10 max-w-6xl mx-auto space-y-8">

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-extrabold mb-1">
                Communication
              </p>
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">
                Announcements
              </h1>
              <p className="text-on-surface-variant mt-2 text-sm">{total} total announcement{total !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setModal('create')}
              className="flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Publish Announcement
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1) }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  filter === f.key
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-surface-container-lowest rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4 block">campaign</span>
                <p className="text-lg font-medium">No announcements found</p>
                <button
                  onClick={() => setModal('create')}
                  className="mt-4 text-primary font-bold text-sm hover:underline"
                >
                  Publish the first one
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2 p-4">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      <th className="px-6 pb-2">Title</th>
                      <th className="px-6 pb-2">Audience</th>
                      <th className="px-6 pb-2">Author</th>
                      <th className="px-6 pb-2">Date</th>
                      <th className="px-6 pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => {
                      const badge = ROLE_BADGE[a.targetRole] || ROLE_BADGE.ALL
                      const date  = new Date(a.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })
                      return (
                        <tr key={a.id} className="bg-surface-container-lowest group hover:scale-[1.005] transition-transform">
                          <td className="px-6 py-4 rounded-l-xl">
                            <p className="text-sm font-bold text-on-surface line-clamp-1 max-w-xs">{a.title}</p>
                            <p className="text-xs text-on-surface-variant line-clamp-1 max-w-xs mt-0.5">{a.body}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">{a.author?.email}</td>
                          <td className="px-6 py-4 text-sm text-outline">{date}</td>
                          <td className="px-6 py-4 text-right rounded-r-xl">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewing(a) }}
                                className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded-lg transition-colors"
                                title="View"
                              >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setModal(a) }}
                                className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-colors"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                                className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2.5 bg-surface-container-low rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-5 py-2.5 bg-surface-container-low rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Info Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-2">
              <div className="p-3 bg-primary-fixed text-primary rounded-xl w-fit">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <h3 className="font-bold font-headline">Broadcast Reach</h3>
              <p className="text-sm text-on-surface-variant">Announcements targeting "Everyone" reach all students, teachers, and admins.</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-2">
              <div className="p-3 bg-secondary-fixed text-secondary rounded-xl w-fit">
                <span className="material-symbols-outlined">target</span>
              </div>
              <h3 className="font-bold font-headline">Audience Targeting</h3>
              <p className="text-sm text-on-surface-variant">Segment your messages to Students, Teachers, or Admins for focused communication.</p>
            </div>
            <div
              onClick={() => setModal('create')}
              className="bg-primary-container text-on-primary rounded-2xl p-6 space-y-2 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="p-3 bg-white/20 rounded-xl w-fit">
                <span className="material-symbols-outlined">add_circle</span>
              </div>
              <h3 className="font-bold font-headline">Publish Now</h3>
              <p className="text-sm opacity-80">Click to create a new announcement and broadcast it to your university.</p>
            </div>
          </div>
        </div>
      </main>

      {modal && (
        <AnnouncementFormModal
          announcement={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {viewing && (
        <AnnouncementDetailModal announcement={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
