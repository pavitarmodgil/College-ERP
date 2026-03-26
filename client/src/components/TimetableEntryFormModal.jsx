import { useState, useEffect } from 'react'
import api from '../lib/api'

const DAYS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
]

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00',
]

export default function TimetableEntryFormModal({ entry, onClose, onSubmit }) {
  const isEdit = Boolean(entry)
  const [form, setForm] = useState({
    courseId: entry?.courseId || '',
    teacherId: entry?.teacherId || '',
    dayOfWeek: entry?.dayOfWeek || 'MON',
    startTime: entry?.startTime || '09:00',
    endTime: entry?.endTime || '10:00',
    room: entry?.room || '',
    semester: entry?.semester || '',
  })
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/courses', { params: { limit: 100 } }),
      api.get('/users', { params: { role: 'TEACHER', limit: 100 } }),
    ]).then(([coursesRes, teachersRes]) => {
      setCourses(coursesRes.data.courses || [])
      setTeachers(teachersRes.data.data || [])
    })
  }, [])

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-lg bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold font-label">
              {isEdit ? 'Edit Entry' : 'New Entry'}
            </p>
            <h2 className="text-xl font-bold font-headline mt-0.5">
              {isEdit ? 'Update timetable slot' : 'Add a timetable slot'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high dark:hover:bg-neutral-800 rounded-xl transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {/* Course */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Course
            </label>
            <select
              name="courseId"
              value={form.courseId}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none appearance-none"
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Teacher
            </label>
            <select
              name="teacherId"
              value={form.teacherId}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none appearance-none"
            >
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherId} — {t.email}
                </option>
              ))}
            </select>
          </div>

          {/* Day + Room row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
                Day
              </label>
              <select
                name="dayOfWeek"
                value={form.dayOfWeek}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none appearance-none"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
                Room
              </label>
              <input
                name="room"
                value={form.room}
                onChange={handleChange}
                required
                placeholder="e.g. Room 401"
                className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
              />
            </div>
          </div>

          {/* Start + End time row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
                Start Time
              </label>
              <select
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none appearance-none font-mono"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
                End Time
              </label>
              <select
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none appearance-none font-mono"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Semester */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Semester
            </label>
            <input
              name="semester"
              value={form.semester}
              onChange={handleChange}
              required
              placeholder="e.g. 2024-ODD or 2024-EVEN"
              className="w-full px-4 py-3 bg-surface-container-high dark:bg-neutral-800 border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error bg-error-container/30 px-4 py-3 rounded-xl text-sm">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high dark:bg-neutral-800 text-on-surface font-bold rounded-full hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-primary-container text-on-primary font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? 'Saving…' : isEdit ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
