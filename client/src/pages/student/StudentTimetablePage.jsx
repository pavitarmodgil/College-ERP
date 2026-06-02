import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import CalendarView from '../../components/CalendarView'
import api from '../../lib/api'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_LABELS = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' }
const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00']

// Cycle through distinct border colors for visual variety
const ACCENT_COLORS = [
  'bg-primary',
  'bg-indigo-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-violet-400',
]

// Map JS day index to our keys (0 = Sun, no match)
const JS_DAY_TO_KEY = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' }

// Compact academic-risk badges shared by grid + overview cards
function AttendanceRiskBadge({ attendance }) {
  if (!attendance || attendance.riskLevel === 'SAFE') return null
  const critical = attendance.riskLevel === 'CRITICAL'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        critical
          ? 'bg-error-container/40 text-error'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      }`}
    >
      <span className="material-symbols-outlined text-[12px] leading-none">warning</span>
      Attendance Risk
      {attendance.classesNeeded > 0 && ` · need ${attendance.classesNeeded}`}
    </span>
  )
}

function GradeRiskBadge({ grade }) {
  if (!grade || !grade.gradeRisk) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/40 text-error">
      <span className="material-symbols-outlined text-[12px] leading-none">trending_down</span>
      Grade Risk
    </span>
  )
}

function formatDueDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function StudentTimetablePage() {
  const [entries, setEntries] = useState([])
  const [grouped, setGrouped] = useState({})
  const [insightsByCourse, setInsightsByCourse] = useState({})
  const [assessments, setAssessments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState('week') // 'week' | 'calendar'

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()] || null

  useEffect(() => {
    api.get('/timetable')
      .then((res) => {
        setEntries(res.data.entries)
        setGrouped(res.data.grouped)
        // Default filter to Today if we have classes today
        if (todayKey && res.data.grouped[todayKey]?.length > 0) {
          setActiveFilter(todayKey)
        }
      })
      .catch(() => setError('Failed to load timetable'))
      .finally(() => setIsLoading(false))

    // Academic intelligence — non-fatal if it fails
    api.get('/timetable/insights')
      .then((res) => {
        const map = {}
        for (const c of res.data.courses) map[c.courseId] = c
        setInsightsByCourse(map)
      })
      .catch(() => {})

    // Assessments for the calendar markers
    api.get('/assessments')
      .then((res) => setAssessments(res.data.assessments || []))
      .catch(() => {})
  }, [])

  const uniqueCourses = new Set(entries.map((e) => e.courseId)).size

  // Course color mapping — assign a color per unique courseId
  const courseColorMap = {}
  let colorIdx = 0
  entries.forEach((e) => {
    if (!courseColorMap[e.courseId]) {
      courseColorMap[e.courseId] = ACCENT_COLORS[colorIdx % ACCENT_COLORS.length]
      colorIdx++
    }
  })

  // Which days to display based on filter
  const visibleDays = activeFilter === 'ALL' ? DAYS : [activeFilter]

  function getSlotEntries(day, slotTime) {
    return (grouped[day] || []).filter(
      (e) => e.startTime <= slotTime && e.endTime > slotTime
    )
  }

  return (
    <div className="flex min-h-screen bg-background dark:bg-neutral-950">
      <Sidebar />
      <main className="ml-16 md:ml-64 flex-1 p-6 md:p-10">
        {/* Hero Banner */}
        <section className="relative mb-8 p-10 md:p-12 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-indigo-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight mb-1">
              My Timetable
            </h2>
            <p className="text-white/80 font-medium">
              Your class schedule and academic roadmap
            </p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-xl flex gap-8 items-center">
            <div className="text-center">
              <p className="text-3xl font-extrabold font-headline">{entries.length}</p>
              <p className="text-xs uppercase tracking-widest font-bold opacity-70">classes this week</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-extrabold font-headline">{uniqueCourses.toString().padStart(2, '0')}</p>
              <p className="text-xs uppercase tracking-widest font-bold opacity-70">subjects</p>
            </div>
          </div>
          {/* Decorative blurs */}
          <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-indigo-500/20 blur-[80px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-5%] w-56 h-56 bg-indigo-400/10 blur-[60px] rounded-full" />
        </section>

        {/* View toggle */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low dark:bg-neutral-800 p-1 rounded-xl">
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
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <CalendarView
            entries={entries}
            assessments={assessments}
            insightsByCourse={insightsByCourse}
          />
        )}

        {/* Week View — filter pills + grid + subject overview */}
        {viewMode === 'week' && (<>
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 ${
              activeFilter === 'ALL'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            All Week
          </button>
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setActiveFilter(day)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                activeFilter === day
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {day}
              {day === todayKey && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
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
            <span className="material-symbols-outlined text-5xl opacity-30">calendar_month</span>
            <p className="font-medium">No classes scheduled for your enrolled courses yet.</p>
          </div>
        ) : (
          <div className="bg-surface-container-low dark:bg-neutral-900 rounded-2xl p-1 overflow-hidden overflow-x-auto">
            <div className={`grid min-w-[600px]`} style={{ gridTemplateColumns: `80px repeat(${visibleDays.length}, 1fr)` }}>
              {/* Header row */}
              <div className="py-4 px-4 text-center text-xs font-bold text-outline uppercase tracking-widest">
                Time
              </div>
              {visibleDays.map((day) => (
                <div
                  key={day}
                  className={`py-4 px-4 text-center text-xs font-bold uppercase tracking-widest ${
                    day === todayKey
                      ? 'text-primary bg-primary/5 border-b border-white'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {DAY_LABELS[day]}
                </div>
              ))}

              {/* Body */}
              <div className={`col-span-${visibleDays.length + 1} contents`}>
                {TIME_SLOTS.map((slot) => (
                  <div key={slot} className="contents">
                    {/* Time marker */}
                    <div className="h-32 flex items-start justify-center pt-4 text-xs font-medium text-outline bg-surface-container-low dark:bg-neutral-900">
                      {slot}
                    </div>
                    {/* Day columns */}
                    {visibleDays.map((day) => {
                      const slotEntries = getSlotEntries(day, slot)
                      const isToday = day === todayKey
                      return (
                        <div
                          key={day}
                          className={`h-32 p-2 ${isToday ? 'bg-primary/5' : 'bg-surface dark:bg-neutral-950'}`}
                        >
                          {slotEntries.length === 0 ? null : slotEntries.map((entry) => {
                            const ins = insightsByCourse[entry.courseId]
                            const atRisk = ins && ins.attendance.riskLevel !== 'SAFE'
                            return (
                            <div
                              key={entry.id}
                              className="h-full w-full bg-white dark:bg-neutral-800 rounded-xl p-3 shadow-sm border border-outline-variant/20 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                            >
                              <div className={`absolute top-0 left-0 w-1 h-full ${(atRisk || ins?.grade?.gradeRisk) ? 'bg-error' : (courseColorMap[entry.courseId] || 'bg-primary')}`} />
                              <p className="font-bold text-sm truncate leading-tight group-hover:text-primary transition-colors">
                                {entry.course.name}
                              </p>
                              <p className="text-xs text-on-surface-variant mt-1 truncate">{entry.teacher.email}</p>
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-700 text-[10px] font-bold text-slate-600 dark:text-neutral-300 uppercase">
                                  {entry.room}
                                </span>
                                {ins && ins.attendance.total > 0 && (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    atRisk
                                      ? 'bg-error-container/40 text-error'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  }`}>
                                    {ins.attendance.currentAttendance}%
                                  </span>
                                )}
                                {ins?.grade?.currentLetter && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                                    {ins.grade.currentLetter}
                                  </span>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subject Overview */}
        {!isLoading && !error && entries.length > 0 && (
          <section className="mt-12">
            <h3 className="text-2xl font-extrabold font-headline mb-6">Subject Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from(new Map(entries.map((e) => [e.courseId, e])).values()).map((entry) => {
                const ins = insightsByCourse[entry.courseId]
                return (
                <div
                  key={entry.courseId}
                  className="bg-surface-container-lowest dark:bg-neutral-900 p-6 rounded-2xl shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-primary`}>
                      <span className="material-symbols-outlined">menu_book</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-lg leading-tight">{entry.course.name}</p>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {entry.course.code} • {entry.course.department?.name || ''}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1 truncate">{entry.teacher.email}</p>
                    </div>
                  </div>

                  {ins && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant font-medium">Attendance</span>
                        <span className={`font-bold ${
                          ins.attendance.total === 0
                            ? 'text-on-surface-variant'
                            : ins.attendance.riskLevel === 'SAFE' ? 'text-emerald-600' : 'text-error'
                        }`}>
                          {ins.attendance.total > 0 ? `${ins.attendance.currentAttendance}%` : 'No data'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant font-medium">
                          {ins.grade.hasFinal ? 'Grade' : 'Projected Grade'}
                        </span>
                        <span className="font-bold">
                          {ins.grade.currentLetter || ins.grade.projectedGrade || '—'}
                          {!ins.grade.hasFinal && ins.grade.projectedGrade && (
                            <span className="text-[10px] font-medium text-on-surface-variant ml-1">proj.</span>
                          )}
                        </span>
                      </div>
                      {ins.nextAssessment && (
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-on-surface-variant font-medium flex-shrink-0">Next</span>
                          <span className="font-medium text-xs text-right truncate">
                            {ins.nextAssessment.title} · {formatDueDate(ins.nextAssessment.dueDate)}
                          </span>
                        </div>
                      )}
                      {(ins.attendance.riskLevel !== 'SAFE' || ins.grade.gradeRisk) && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <AttendanceRiskBadge attendance={ins.attendance} />
                          <GradeRiskBadge grade={ins.grade} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </section>
        )}
        </>)}
      </main>
    </div>
  )
}
