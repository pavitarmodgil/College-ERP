import { useState, useEffect } from 'react'
import api from '../lib/api'

const TYPE_ICON = {
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  EXAM: 'school',
  PROJECT: 'folder_special',
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// Days from today to a due date, normalized to midnight so "today" is 0.
function dueStatus(dueDate) {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due - today) / 86400000)

  if (diffDays < 0) return { label: 'Overdue', cls: 'bg-error-container/40 text-error' }
  if (diffDays === 0) return { label: 'Due Today', cls: 'bg-error-container/40 text-error' }
  if (diffDays === 1) return { label: 'Due Tomorrow', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
  return { label: `${diffDays} days`, cls: 'bg-primary/10 text-primary' }
}

export default function UpcomingAssessmentsWidget({ limit = 5 }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/assessments')
      .then((res) => {
        const all = res.data.assessments || []
        // Keep recent overdue (last 7 days) + everything upcoming, soonest first
        const cutoff = new Date()
        cutoff.setHours(0, 0, 0, 0)
        cutoff.setDate(cutoff.getDate() - 7)
        const relevant = all
          .filter((a) => new Date(a.dueDate) >= cutoff)
          .sort((x, y) => new Date(x.dueDate) - new Date(y.dueDate))
        setItems(relevant.slice(0, limit))
      })
      .catch(() => setError('Could not load assessments'))
      .finally(() => setIsLoading(false))
  }, [limit])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading…
      </div>
    )
  }

  if (error) {
    return <div className="text-error text-sm py-4">{error}</div>
  }

  if (items.length === 0) {
    return <div className="text-on-surface-variant text-sm py-4">No upcoming assessments. You're all caught up! 🎉</div>
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const status = dueStatus(a.dueDate)
        const d = new Date(a.dueDate)
        return (
          <div
            key={a.id}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low dark:hover:bg-neutral-800/50 transition-colors"
          >
            <div className="flex-shrink-0 w-12 h-14 bg-surface-container-low dark:bg-neutral-800 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">{MONTHS[d.getMonth()]}</span>
              <span className="text-xl font-bold text-primary">{d.getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-on-surface-variant">{TYPE_ICON[a.type] || 'event_note'}</span>
                {a.title}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                {a.course?.code} · {a.course?.name}
              </p>
            </div>
            <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold ${status.cls}`}>
              {status.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
