import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import TimetableEntryFormModal from '../../components/TimetableEntryFormModal'
import api from '../../lib/api'

const DAY_COLORS = {
  MON: 'bg-primary/10 text-primary',
  TUE: 'bg-secondary/10 text-secondary',
  WED: 'bg-tertiary/10 text-tertiary',
  THU: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FRI: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SAT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export default function AdminTimetablePage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [semesters, setSemesters] = useState([])
  const [activeSemester, setActiveSemester] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  // Load semesters on mount, then load entries for the latest one
  useEffect(() => {
    api.get('/timetable/semesters')
      .then((res) => {
        const list = res.data
        setSemesters(list)
        // Default to the most recent semester
        if (list.length > 0) setActiveSemester(list[0])
      })
      .catch(() => {
        // No entries yet — still show the empty table
        setIsLoading(false)
      })
  }, [])

  const loadEntries = useCallback(() => {
    setIsLoading(true)
    setError('')
    const params = activeSemester ? { semester: activeSemester } : {}
    api.get('/timetable', { params })
      .then((res) => setEntries(res.data.entries))
      .catch(() => setError('Failed to load timetable'))
      .finally(() => setIsLoading(false))
  }, [activeSemester])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  async function handleCreate(formData) {
    await api.post('/timetable', formData)
    setShowModal(false)
    // Refresh semesters in case a new one was added
    const semRes = await api.get('/timetable/semesters')
    setSemesters(semRes.data)
    if (!activeSemester && semRes.data.length > 0) {
      setActiveSemester(semRes.data[0])
    } else {
      loadEntries()
    }
  }

  async function handleEdit(formData) {
    await api.patch(`/timetable/${editingEntry.id}`, formData)
    setEditingEntry(null)
    setShowModal(false)
    loadEntries()
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this timetable entry?')) return
    await api.delete(`/timetable/${id}`)
    loadEntries()
  }

  function openCreate() {
    setEditingEntry(null)
    setShowModal(true)
  }

  function openEdit(entry) {
    setEditingEntry(entry)
    setShowModal(true)
  }

  // Unique course count
  const uniqueCourses = new Set(entries.map((e) => e.courseId)).size

  return (
    <div className="flex min-h-screen bg-background dark:bg-neutral-950">
      <Sidebar />
      <main className="ml-16 md:ml-64 flex-1 p-6 md:p-10">
        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
              Management Console
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight font-headline">Timetable</h1>
            <p className="text-on-surface-variant font-medium">
              {entries.length} scheduled {entries.length === 1 ? 'entry' : 'entries'}
              {activeSemester ? ` for ${activeSemester}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Semester selector */}
            {semesters.length > 0 && (
              <div className="bg-surface-container-lowest dark:bg-neutral-900 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-sm">
                <span className="text-xs font-bold text-on-surface-variant">SEMESTER</span>
                <select
                  value={activeSemester}
                  onChange={(e) => setActiveSemester(e.target.value)}
                  className="bg-transparent border-0 font-bold text-primary text-sm outline-none"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/timetable/generator')}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-surface-container-low dark:bg-neutral-800 font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                Auto Generator
              </button>
              <button
                onClick={openCreate}
                className="bg-primary-container text-white px-6 py-3 rounded-full flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span className="font-bold text-sm">Add Entry</span>
              </button>
            </div>
          </div>
        </section>

        {/* Table Card */}
        <section className="bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm mb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Loading timetable…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-error gap-2">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
              <span className="material-symbols-outlined text-5xl opacity-30">calendar_today</span>
              <p className="font-medium">No timetable entries yet.</p>
              <button
                onClick={openCreate}
                className="mt-2 px-6 py-2.5 bg-primary text-white rounded-full font-bold text-sm hover:scale-105 transition-transform"
              >
                Add First Entry
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low dark:bg-neutral-800">
                  <th className="px-8 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider">Day</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider">Course</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider">Start</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider">End</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider">Room</th>
                  <th className="px-6 py-5 text-[11px] font-extrabold text-outline uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container dark:divide-neutral-800">
                {entries.map((entry) => (
                  <tr key={entry.id} className="group hover:bg-surface-container-low/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${DAY_COLORS[entry.dayOfWeek]}`}>
                        {entry.dayOfWeek}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-primary">{entry.course.code}</span>
                        <span className="text-sm font-medium text-on-surface">{entry.course.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-on-surface-variant font-bold">
                          {entry.teacher.teacherId || '—'}
                        </span>
                        <span className="text-sm text-on-surface-variant">{entry.teacher.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-mono text-sm font-semibold">{entry.startTime}</td>
                    <td className="px-6 py-5 font-mono text-sm font-semibold">{entry.endTime}</td>
                    <td className="px-6 py-5 text-on-surface-variant font-medium text-sm">{entry.room}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-2 text-on-surface-variant hover:text-primary bg-surface-container dark:bg-neutral-800 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-on-surface-variant hover:text-error bg-surface-container dark:bg-neutral-800 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Bento Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest dark:bg-neutral-900 p-8 rounded-2xl flex flex-col justify-between h-44 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
              </div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Global Stat</span>
            </div>
            <div>
              <h3 className="text-4xl font-extrabold font-headline">{entries.length}</h3>
              <p className="text-on-surface-variant text-sm font-medium">Total Scheduled Entries</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest dark:bg-neutral-900 p-8 rounded-2xl flex flex-col justify-between h-44 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">school</span>
              </div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Courses</span>
            </div>
            <div>
              <h3 className="text-4xl font-extrabold font-headline">{uniqueCourses}</h3>
              <p className="text-on-surface-variant text-sm font-medium">Courses Scheduled This Term</p>
            </div>
          </div>

          <div className="bg-primary-container p-8 rounded-2xl flex flex-col justify-center items-center text-center h-44 shadow-lg shadow-primary/20">
            <p className="text-on-primary-container text-sm font-bold mb-4">Need to modify the schedule?</p>
            <button
              onClick={openCreate}
              className="bg-white text-primary px-8 py-3 rounded-full font-bold text-sm hover:scale-[1.05] transition-transform active:scale-95 shadow-md"
            >
              Add Entry
            </button>
          </div>
        </section>
      </main>

      {showModal && (
        <TimetableEntryFormModal
          entry={editingEntry}
          onClose={() => { setShowModal(false); setEditingEntry(null) }}
          onSubmit={editingEntry ? handleEdit : handleCreate}
        />
      )}
    </div>
  )
}
