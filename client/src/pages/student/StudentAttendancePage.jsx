import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

// Circumference for r=40 SVG ring: 2 * π * 40 ≈ 251.2
const CIRCUMFERENCE = 251.2

function strokeOffset(pct) {
  return CIRCUMFERENCE * (1 - pct / 100)
}

function ringColor(pct) {
  if (pct >= 90) return '#10b981'   // emerald
  if (pct >= 75) return '#10b981'   // green — on track
  return '#ef4444'                  // red — at risk
}

function statusBadge(course) {
  if (course.totalSessions === 0) return null
  if (course.percentage >= 90) return { label: 'Perfect', bg: 'bg-green-100', text: 'text-green-700' }
  if (!course.atRisk) return { label: 'On Track', bg: 'bg-green-100', text: 'text-green-700' }
  return { label: 'At Risk', bg: 'bg-error-container', text: 'text-on-error-container' }
}

export default function StudentAttendancePage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/attendance/my')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const courses = data?.courses || []
  const overallPct = data?.overallPercentage ?? 0
  const atRiskCourses = courses.filter((c) => c.atRisk)
  const totalAttended = courses.reduce((s, c) => s + c.attendedSessions, 0)
  const totalSessions = courses.reduce((s, c) => s + c.totalSessions, 0)

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-5 z-30 bg-slate-50/80 backdrop-blur-md">
          <div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-on-surface leading-tight font-headline">
              My Attendance
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Track your attendance across all enrolled courses
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center ring-2 ring-primary-fixed/40">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-10">
          {/* Hero summary card */}
          <section>
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-indigo-800 rounded-2xl p-10 text-on-primary flex justify-between items-center shadow-2xl shadow-indigo-200/50">
              <div className="relative z-10 flex flex-col">
                <span className="text-primary-fixed-dim font-label text-xs uppercase tracking-[0.2em] font-bold mb-2">
                  Overall Standing
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-headline font-extrabold tracking-tighter">
                    {isLoading ? '—' : `${overallPct}%`}
                  </span>
                  <span className="text-primary-fixed-dim font-medium">Cumulative</span>
                </div>
                <p className="mt-4 text-primary-fixed-dim/80 max-w-xs font-body leading-relaxed">
                  Currently enrolled in <span className="text-white font-bold">{data?.totalCourses ?? '—'}</span> active courses.
                  Minimum required for certification: <span className="text-white font-bold">75%</span>.
                </p>
              </div>

              {/* Glassmorphism stats block */}
              <div className="relative z-10 hidden md:flex items-center gap-6 bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
                <div className="flex flex-col text-center">
                  <span className="text-3xl font-bold">{totalAttended}</span>
                  <span className="text-[0.65rem] uppercase tracking-widest text-white/70">Attended</span>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="flex flex-col text-center">
                  <span className="text-3xl font-bold">{totalSessions}</span>
                  <span className="text-[0.65rem] uppercase tracking-widest text-white/70">Total Sessions</span>
                </div>
                {totalSessions > 0 && (
                  <div className={`ml-4 px-4 py-2 rounded-full font-bold text-xs uppercase flex items-center gap-2 ${overallPct >= 75 ? 'bg-white text-primary' : 'bg-error text-white'}`}>
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {overallPct >= 75 ? 'check_circle' : 'warning'}
                    </span>
                    {overallPct >= 75 ? 'On Track' : 'At Risk'}
                  </div>
                )}
              </div>

              {/* Background decorative blobs */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-20 top-0 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </section>

          {/* Course cards grid */}
          {isLoading ? (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface-container-lowest p-8 rounded-2xl animate-pulse h-44" />
              ))}
            </section>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">event_available</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Attendance Records Yet</h3>
              <p className="text-slate-500 text-sm">Enroll in courses to start tracking your attendance.</p>
            </div>
          ) : (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {courses.map((course) => (
                <CourseAttendanceCard key={course.courseId} course={course} />
              ))}
            </section>
          )}

          {/* At-risk warning banners */}
          {atRiskCourses.map((course) => (
            <div
              key={course.courseId}
              className="p-6 bg-error-container/50 rounded-2xl flex items-center gap-6 border border-error/10"
            >
              <div className="w-12 h-12 bg-error rounded-full flex items-center justify-center flex-shrink-0 text-white">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-headline font-bold text-on-error-container">
                  Below minimum attendance in "{course.courseName}"
                </h4>
                <p className="text-on-error-container/80 text-sm font-body">
                  Your current attendance of <strong>{course.percentage}%</strong> is below the required 75%.
                  Failing to improve this may lead to debarment from the final examination.
                </p>
              </div>
              <button className="ml-auto bg-error text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-error/90 transition-colors whitespace-nowrap flex-shrink-0">
                Contact Academic Advisor
              </button>
            </div>
          ))}

          {/* Monthly trends + absence summary */}
          {courses.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-4">Monthly Trends</h3>
                  <div className="flex items-end gap-3 h-32 mb-6">
                    <div className="w-full bg-primary/20 rounded-t-lg h-[70%]" />
                    <div className="w-full bg-primary/40 rounded-t-lg h-[85%]" />
                    <div className="w-full bg-primary/60 rounded-t-lg h-[92%]" />
                    <div className="w-full bg-primary rounded-t-lg" style={{ height: `${Math.min(overallPct, 100)}%` }} />
                    <div className="w-full bg-primary/30 rounded-t-lg h-[65%]" />
                  </div>
                </div>
                <div className="flex justify-between text-[0.65rem] uppercase font-bold tracking-widest text-on-surface-variant">
                  <span>January</span>
                  <span>February</span>
                  <span>March</span>
                  <span>April</span>
                  <span>May</span>
                </div>
              </div>

              <div className="bg-surface-container-highest rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-primary mb-4">history</span>
                <h3 className="font-bold text-lg mb-2">Absence Summary</h3>
                <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                  {atRiskCourses.length > 0
                    ? `${atRiskCourses.length} course${atRiskCourses.length > 1 ? 's are' : ' is'} below the 75% threshold.`
                    : 'All courses are above the minimum attendance threshold.'}
                </p>
                <div className="w-full h-1 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function CourseAttendanceCard({ course }) {
  const pct = course.percentage
  const offset = course.totalSessions === 0 ? CIRCUMFERENCE : strokeOffset(pct)
  const color = course.totalSessions === 0 ? '#d1d5db' : ringColor(pct)
  const badge = statusBadge(course)

  return (
    <div className="bg-surface-container-lowest p-8 rounded-2xl transition-all duration-300 hover:scale-[1.01] flex items-center gap-8">
      {/* SVG progress ring */}
      <div className="relative flex-shrink-0">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r="40"
            fill="transparent"
            stroke="#f3f4f5"
            strokeWidth="8"
          />
          <circle
            cx="48" cy="48" r="40"
            fill="transparent"
            stroke={color}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="8"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold font-headline ${course.atRisk ? 'text-error' : ''}`}>
            {course.totalSessions === 0 ? 'N/A' : `${pct}%`}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider">
            {course.courseCode}
          </span>
          {badge && (
            <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider`}>
              {badge.label}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-on-surface mb-1 leading-tight">{course.courseName}</h3>
        <p className="text-xs text-on-surface-variant font-medium mb-4 uppercase tracking-wide">
          {course.department?.name ? `Dept: ${course.department.name}` : course.courseType}
        </p>

        <div className="flex justify-between items-center text-sm">
          <span className="text-on-surface-variant">
            {course.attendedSessions} / {course.totalSessions} sessions
          </span>
          <span className={`font-semibold ${course.atRisk ? 'text-error' : 'text-primary'}`}>
            {course.atRisk ? 'Take Action' : 'View Details'}
          </span>
        </div>
      </div>
    </div>
  )
}
