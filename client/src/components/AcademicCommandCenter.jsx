import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import UpcomingAssessmentsWidget from './UpcomingAssessmentsWidget'

const JS_DAY_TO_KEY = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' }
const GPA_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, P: 4, F: 0 }

// One-stop daily briefing: today's classes, risk alerts, deadlines, predicted GPA.
export default function AcademicCommandCenter() {
  const navigate = useNavigate()
  const [todayClasses, setTodayClasses] = useState([])
  const [alerts, setAlerts] = useState([])
  const [predictedGPA, setPredictedGPA] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()] || null

  useEffect(() => {
    async function load() {
      try {
        const [ttRes, insRes] = await Promise.all([
          api.get('/timetable'),
          api.get('/timetable/insights'),
        ])
        const grouped = ttRes.data.grouped || {}
        setTodayClasses(todayKey ? grouped[todayKey] || [] : [])

        const courses = insRes.data.courses || []
        setAlerts(courses.filter((c) => c.attendance.riskLevel !== 'SAFE' || c.grade.gradeRisk))

        const projected = courses.map((c) => c.grade.projectedGrade).filter(Boolean)
        if (projected.length > 0) {
          const avg = projected.reduce((s, g) => s + (GPA_POINTS[g] ?? 0), 0) / projected.length
          setPredictedGPA(Math.round(avg * 100) / 100)
        }
      } catch {
        // non-fatal — the widget degrades gracefully
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <section className="bg-surface-container-lowest dark:bg-neutral-900 rounded-2xl p-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              insights
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-headline leading-tight">Academic Command Center</h3>
            <p className="text-sm text-on-surface-variant">Your daily academic briefing</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary-container text-on-primary">
          <span className="material-symbols-outlined">trending_up</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Predicted GPA</p>
            <p className="text-2xl font-extrabold leading-none">
              {predictedGPA !== null ? predictedGPA.toFixed(2) : '—'}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Loading your briefing…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Classes */}
          <div className="bg-surface-container-low dark:bg-neutral-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">today</span>
              <h4 className="font-bold font-headline">Today's Classes</h4>
            </div>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No classes scheduled today. 🎉</p>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary w-12 flex-shrink-0">{e.startTime}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{e.course.code} · {e.course.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{e.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance & Grade Alerts */}
          <div className="bg-surface-container-low dark:bg-neutral-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-error">notification_important</span>
              <h4 className="font-bold font-headline">Alerts</h4>
            </div>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <span className="material-symbols-outlined text-base">check_circle</span>
                All clear — no risks detected.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((c) => (
                  <div key={c.courseId} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-error text-base mt-0.5">warning</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{c.courseCode}</p>
                      <p className="text-xs text-on-surface-variant">
                        {c.attendance.riskLevel !== 'SAFE' &&
                          `Attendance ${c.attendance.currentAttendance}% — attend ${c.attendance.classesNeeded} more`}
                        {c.attendance.riskLevel !== 'SAFE' && c.grade.gradeRisk && ' · '}
                        {c.grade.gradeRisk && `Grade at risk (${c.grade.projectedGrade})`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Assessments */}
          <div className="bg-surface-container-low dark:bg-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">event_upcoming</span>
                <h4 className="font-bold font-headline">Deadlines</h4>
              </div>
              <button
                onClick={() => navigate('/student/timetable')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Timetable
              </button>
            </div>
            <UpcomingAssessmentsWidget limit={4} />
          </div>
        </div>
      )}
    </section>
  )
}
