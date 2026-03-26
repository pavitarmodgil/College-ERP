import { useState, useEffect } from 'react'
import api from '../lib/api'

const TARGET_OPTIONS = [
  { value: 'ALL',     label: 'Everyone' },
  { value: 'STUDENT', label: 'Students Only' },
  { value: 'TEACHER', label: 'Teachers Only' },
  { value: 'ADMIN',   label: 'Admins Only' },
]

export default function AnnouncementFormModal({ announcement, onClose, onSaved }) {
  const isEdit = Boolean(announcement)

  const [title,      setTitle]      = useState(announcement?.title      ?? '')
  const [body,       setBody]       = useState(announcement?.body       ?? '')
  const [targetRole, setTargetRole] = useState(announcement?.targetRole ?? 'ALL')
  const [error,      setError]      = useState('')
  const [saving,     setSaving]     = useState(false)

  // re-populate when editing a different announcement
  useEffect(() => {
    setTitle(announcement?.title ?? '')
    setBody(announcement?.body ?? '')
    setTargetRole(announcement?.targetRole ?? 'ALL')
    setError('')
  }, [announcement])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/announcements/${announcement.id}`, { title, body, targetRole })
      } else {
        await api.post('/announcements', { title, body, targetRole })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-outline-variant/15">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-extrabold mb-1">
                Broadcast
              </p>
              <h2 className="text-2xl font-bold font-headline text-on-surface">
                {isEdit ? 'Edit Announcement' : 'Broadcast to your university'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {error && (
            <div className="bg-error-container/30 text-error text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Faculty Convocation Next Friday"
              className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              placeholder="Write your announcement here..."
              className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all"
            >
              {TARGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high text-on-surface-variant font-bold rounded-xl hover:bg-surface-container transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-primary-container text-on-primary font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 text-sm"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
