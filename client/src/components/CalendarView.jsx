// CalendarView — shared monthly calendar for student & teacher timetable pages.
// Timetable entries are WEEKLY-recurring (dayOfWeek field), so every Monday of
// the month shows the same classes. Assessments appear on their specific date.

import { useState } from 'react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// JS getDay() → our DayOfWeek key (0=Sun mapped last)
const JS_TO_DOW = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT', 0: 'SUN' }

const TYPE_ICON = { QUIZ: 'quiz', ASSIGNMENT: 'assignment', EXAM: 'school', PROJECT: 'folder_special' }

const ACCENT = [
  'bg-primary/80', 'bg-secondary/80', 'bg-tertiary/80',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500',
]

// Due-date urgency badge
function urgencyClass(dueDate) {
  const diff = Math.round((new Date(dueDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
  if (diff < 0)  return 'bg-error-container/40 text-error'
  if (diff === 0) return 'bg-error-container/40 text-error'
  if (diff === 1) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-primary/10 text-primary'
}

function urgencyLabel(dueDate) {
  const diff = Math.round((new Date(dueDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
  if (diff < 0)  return 'Overdue'
  if (diff === 0) return 'Due Today'
  if (diff === 1) return 'Tomorrow'
  return null
}

// Build the week rows for a given month
function buildCalendarWeeks(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Start grid from the Monday on or before the 1st
  let cursor = new Date(firstDay)
  const dow = cursor.getDay() // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1 // days to go back to reach Monday
  cursor.setDate(cursor.getDate() - offset)

  const weeks = []
  while (cursor <= lastDay || weeks.length === 0 || cursor.getDay() !== 1) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor > lastDay && cursor.getDay() === 1) break
  }
  return weeks
}

export default function CalendarView({ entries = [], assessments = [], insightsByCourse = {} }) {
  const today = new Date()
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected]   = useState(null) // { date, entries, assessments }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelected(null)
  }

  // Course → accent colour (stable per courseId)
  const courseIds = [...new Set(entries.map(e => e.courseId))]
  const colorMap = Object.fromEntries(courseIds.map((id, i) => [id, ACCENT[i % ACCENT.length]]))

  // Assessment by date key
  const asmtByDate = {}
  for (const a of assessments) {
    const d = new Date(a.dueDate)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    ;(asmtByDate[key] = asmtByDate[key] || []).push(a)
  }

  function getEntriesForDay(date) {
    const dowKey = JS_TO_DOW[date.getDay()]
    return entries.filter(e => e.dayOfWeek === dowKey)
  }
  function getAsmtsForDay(date) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    return asmtByDate[key] || []
  }

  const weeks = buildCalendarWeeks(viewYear, viewMonth)

  function handleDayClick(date) {
    const dayEntries = getEntriesForDay(date)
    const dayAsmts   = getAsmtsForDay(date)
    setSelected({ date, entries: dayEntries, assessments: dayAsmts })
  }

  const isToday = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate()

  const isCurrentMonth = (date) => date.getMonth() === viewMonth

  const isSelected = (date) =>
    selected &&
    selected.date.getFullYear() === date.getFullYear() &&
    selected.date.getMonth()    === date.getMonth()    &&
    selected.date.getDate()     === date.getDate()

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl bg-surface-container-low dark:bg-neutral-800 hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h3 className="text-xl font-bold font-headline">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl bg-surface-container-low dark:bg-neutral-800 hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface-container-low dark:bg-neutral-900 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-outline-variant/10 dark:border-neutral-800">
          {DAY_HEADERS.map(d => (
            <div key={d} className="py-3 text-center text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-outline-variant/10 dark:border-neutral-800 last:border-0">
            {week.map((date, di) => {
              const dayEntries  = getEntriesForDay(date)
              const dayAsmts    = getAsmtsForDay(date)
              const inMonth     = isCurrentMonth(date)
              const todayFlag   = isToday(date)
              const selFlag     = isSelected(date)
              const hasContent  = dayEntries.length > 0 || dayAsmts.length > 0

              return (
                <button
                  key={di}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-[80px] p-2 text-left transition-colors border-r border-outline-variant/10 dark:border-neutral-800 last:border-0 ${
                    !inMonth ? 'opacity-30' : ''
                  } ${
                    selFlag ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-surface-container-high/60 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  {/* Day number */}
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mb-1 ${
                    todayFlag
                      ? 'bg-primary text-white'
                      : selFlag
                        ? 'bg-primary/20 text-primary'
                        : 'text-on-surface'
                  }`}>
                    {date.getDate()}
                  </span>

                  {/* Class dots */}
                  {dayEntries.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-1">
                      {dayEntries.slice(0, 3).map(e => (
                        <span
                          key={e.id}
                          className={`block w-1.5 h-1.5 rounded-full ${colorMap[e.courseId] || 'bg-primary'}`}
                          title={e.course?.name}
                        />
                      ))}
                      {dayEntries.length > 3 && (
                        <span className="text-[9px] text-on-surface-variant font-bold">+{dayEntries.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Assessment badges */}
                  {dayAsmts.slice(0, 2).map(a => (
                    <div
                      key={a.id}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-error-container/30 text-error truncate mb-0.5"
                    >
                      {a.title.split('—')[0].trim()}
                    </div>
                  ))}
                  {dayAsmts.length > 2 && (
                    <div className="text-[9px] text-on-surface-variant">+{dayAsmts.length - 2} more</div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selected && (
        <div className="bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-bold font-headline text-lg">
              {selected.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>
            <button
              onClick={() => setSelected(null)}
              className="p-1.5 rounded-lg hover:bg-surface-container-high dark:hover:bg-neutral-800 transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {selected.entries.length === 0 && selected.assessments.length === 0 && (
            <p className="text-sm text-on-surface-variant">No classes or deadlines on this day.</p>
          )}

          {/* Classes for this day */}
          {selected.entries.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-3">
                Classes
              </p>
              <div className="space-y-3">
                {selected.entries.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(e => {
                  const ins = insightsByCourse[e.courseId]
                  const atRisk = ins && ins.attendance.riskLevel !== 'SAFE'
                  return (
                    <div key={e.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low dark:bg-neutral-800">
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${colorMap[e.courseId] || 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{e.course?.name}</p>
                        <p className="text-xs text-on-surface-variant">{e.startTime} – {e.endTime} · {e.room}</p>
                        <p className="text-xs text-on-surface-variant truncate">{e.teacher?.email || e.teacher?.firstName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {ins && ins.attendance.total > 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            atRisk ? 'bg-error-container/40 text-error' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {ins.attendance.currentAttendance}%
                          </span>
                        )}
                        {ins?.grade?.currentLetter && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {ins.grade.currentLetter}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Assessments due on this day */}
          {selected.assessments.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-3">
                Deadlines
              </p>
              <div className="space-y-3">
                {selected.assessments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-error-container/20">
                    <span className="material-symbols-outlined text-error text-base">{TYPE_ICON[a.type] || 'event_note'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{a.title}</p>
                      <p className="text-xs text-on-surface-variant">{a.course?.code} · {a.type}</p>
                    </div>
                    {urgencyLabel(a.dueDate) && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyClass(a.dueDate)}`}>
                        {urgencyLabel(a.dueDate)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
