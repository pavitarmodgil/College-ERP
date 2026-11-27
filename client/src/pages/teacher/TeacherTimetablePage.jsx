import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import CalendarView from '../../components/CalendarView'
import api from '../../lib/api'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' }

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

// Map JS day index (0=Sun) to our day keys
const JS_DAY_TO_KEY = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' }

export default function TeacherTimetablePage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [grouped, setGrouped] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('week')

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()] || null

  useEffect(() => {
    api.get('/timetable')
      .then((res) => {
        setEntries(res.data.entries)
        setGrouped(res.data.grouped)
      })
      .catch(() => setError('Failed to load timetable'))
      .finally(() => setIsLoading(false))
  }, [])

  // Stat: earliest start time
  const earliest = entries.length
    ? entries.reduce((min, e) => (e.startTime < min ? e.startTime : min), entries[0].startTime)
    : null

  // Unique courses this week
  const uniqueCourses = new Set(entries.map((e) => e.courseId)).size

  // Find entries at a given time slot for a given day
  function getSlotEntries(day, slotTime) {
    return (grouped[day] || []).filter(
      (e) => e.startTime <= slotTime && e.endTime > slotTime
    )
  }

  return (
    <div className="flex min-h-screen bg-background dark:bg-neutral-950">
      <Sidebar />
      <main className="ml-16 md:ml-64 flex-1 p-6 md:p-10">
        {/* Page Header */}
        <header className="mb-10">
          <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-1">
            My Schedule
          </h2>
          <p className="text-on-surface-variant font-medium">
            Your assigned teaching slots this semester
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-secondary-fixed p-7 rounded-xl flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
            <div>
              <p className="text-on-secondary-fixed-variant font-bold text-xs uppercase tracking-wider mb-1">
                Total Classes
              </p>
              <p className="text-4xl font-headline font-extrabold text-on-secondary-fixed">
                {entries.length.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="bg-white/30 p-4 rounded-full">
              <span className="material-symbols-outlined text-on-secondary-fixed text-3xl">school</span>
            </div>
          </div>

          <div className="bg-primary-fixed p-7 rounded-xl flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
            <div>
              <p className="text-on-primary-fixed-variant font-bold text-xs uppercase tracking-wider mb-1">
                Courses Teaching
              </p>
              <p className="text-4xl font-headline font-extrabold text-on-primary-fixed">
                {uniqueCourses.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="bg-white/30 p-4 rounded-full">
              <span className="material-symbols-outlined text-on-primary-fixed text-3xl">menu_book</span>
            </div>
          </div>

          <div className="bg-tertiary-fixed p-7 rounded-xl flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
            <div>
              <p className="text-on-tertiary-fixed-variant font-bold text-xs uppercase tracking-wider mb-1">
                Earliest Class
              </p>
              <p className="text-4xl font-headline font-extrabold text-on-tertiary-fixed">
                {earliest || '—'}
              </p>
            </div>
            <div className="bg-white/30 p-4 rounded-full">
              <span className="material-symbols-outlined text-on-tertiary-fixed text-3xl">schedule</span>
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-surface-container-low dark:bg-neutral-800 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'week'
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">view_week</span>
            Week View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-neutral-700 shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            Calendar View
          </button>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <CalendarView entries={entries} />
        )}

        {/* Weekly Grid */}
        {viewMode === 'week' && isLoading ? (
          <div className="flex items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Loading schedule…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-error gap-2">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        ) : (
          <div className="bg-surface-container-low dark:bg-neutral-900 rounded-xl p-6 overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Grid Header */}
              <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-3 mb-4">
                <div />
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className={`text-center p-3 rounded-xl ${
                      day === todayKey
                        ? 'bg-primary shadow-lg shadow-primary/20'
                        : 'bg-surface-container-lowest dark:bg-neutral-800'
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase ${day === todayKey ? 'text-white/70' : 'text-on-surface-variant'}`}>
                      {day}
                    </p>
                    <p className={`text-sm font-headline font-bold ${day === todayKey ? 'text-white' : 'text-on-surface'}`}>
                      {DAY_LABELS[day].slice(0, 3)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Lunch row + time slots */}
              <div className="space-y-3">
                {TIME_SLOTS.map((slot) => {
                  const isLunch = slot === '12:00'
                  return (
                    <div key={slot}>
                      {isLunch && (
                        <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-3 min-h-[48px] opacity-40 mb-3">
                          <div className="flex items-center justify-end pr-3 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                            Lunch
                          </div>
                          <div className="col-span-6 bg-slate-200/50 dark:bg-neutral-700/30 rounded-xl" />
                        </div>
                      )}
                      <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-3 min-h-[90px]">
                        <div className="flex items-center justify-end pr-3 text-xs font-bold text-on-surface-variant">
                          {slot}
                        </div>
                        {DAYS.map((day) => {
                          const slotEntries = getSlotEntries(day, slot)
                          if (slotEntries.length === 0) {
                            return (
                              <div
                                key={day}
                                className="border-2 border-dashed border-slate-200 dark:border-neutral-700 rounded-xl bg-slate-50/50 dark:bg-neutral-800/30"
                              />
                            )
                          }
                          return (
                            <div key={day} className="flex flex-col gap-1">
                              {slotEntries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="group flex-1 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col justify-between"
                                >
                                  <div>
                                    <p className="text-primary font-bold text-sm leading-tight">{entry.course.code}</p>
                                    <p className="text-on-surface-variant text-xs font-medium mt-0.5">
                                      {entry.room} • {entry.startTime}–{entry.endTime}
                                    </p>
                                  </div>
                                  {/* Quick actions — act straight from the timetable */}
                                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => navigate(`/teacher/attendance/${entry.courseId}`)}
                                      title="Mark Attendance"
                                      className="p-1 rounded-md bg-white/70 dark:bg-neutral-800 text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px] leading-none">how_to_reg</span>
                                    </button>
                                    <button
                                      onClick={() => navigate(`/teacher/grades/${entry.courseId}`)}
                                      title="Enter Grades"
                                      className="p-1 rounded-md bg-white/70 dark:bg-neutral-800 text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px] leading-none">grade</span>
                                    </button>
                                    <button
                                      onClick={() => navigate(`/teacher/grades/${entry.courseId}`)}
                                      title="View Students"
                                      className="p-1 rounded-md bg-white/70 dark:bg-neutral-800 text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px] leading-none">group</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty state — week view only */}
        {viewMode === 'week' && !isLoading && !error && entries.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <span className="material-symbols-outlined text-5xl opacity-30">calendar_month</span>
            <p className="font-medium">No timetable entries assigned to you yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
