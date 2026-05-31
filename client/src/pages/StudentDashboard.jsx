import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import AnnouncementsWidget from '../components/AnnouncementsWidget'
import AcademicCommandCenter from '../components/AcademicCommandCenter'
import UpcomingAssessmentsWidget from '../components/UpcomingAssessmentsWidget'

// Circumference of the r=24 progress ring (2·π·24 ≈ 150)
const RING_C = 150

export default function StudentDashboard() {
  const { user } = useAuth()
  const displayName = user?.studentId || user?.email?.split('@')[0] || 'Student'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [availableCourses, setAvailableCourses] = useState([])
  const [enrolledCount, setEnrolledCount] = useState(null)
  const [enrollingId, setEnrollingId] = useState(null)
  const [enrollMessage, setEnrollMessage] = useState('')

  // Real academic metrics
  const [attendancePct, setAttendancePct] = useState(null)
  const [gpa, setGpa] = useState(null)
  const [perfCourses, setPerfCourses] = useState([])
  const [upcomingCount, setUpcomingCount] = useState(null)

  async function fetchAvailable() {
    try {
      const { data } = await api.get('/courses/available')
      setAvailableCourses(data.courses)
    } catch {
      // non-fatal
    }
  }

  async function fetchEnrolledCount() {
    try {
      const { data } = await api.get('/courses', { params: { limit: 1 } })
      setEnrolledCount(data.total)
    } catch {
      // non-fatal
    }
  }

  async function fetchAcademics() {
    try {
      const [att, grd, asmt] = await Promise.all([
        api.get('/attendance/my'),
        api.get('/grades/my'),
        api.get('/assessments', { params: { upcoming: 1 } }),
      ])
      setAttendancePct(att.data.overallPercentage ?? null)
      setGpa(grd.data.gpa ?? null)

      // Merge attendance % into grade courses for the performance breakdown
      const attByCourse = {}
      ;(att.data.courses || []).forEach((c) => { attByCourse[c.courseId] = c.percentage })
      setPerfCourses(
        (grd.data.courses || []).map((c) => ({ ...c, attendancePct: attByCourse[c.courseId] ?? null }))
      )
      setUpcomingCount((asmt.data.assessments || []).length)
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    fetchAvailable()
    fetchEnrolledCount()
    fetchAcademics()
  }, [])

  async function handleEnroll(courseId) {
    setEnrollingId(courseId)
    setEnrollMessage('')
    try {
      await api.post(`/courses/${courseId}/enroll`)
      setEnrollMessage('Enrolled successfully!')
      fetchAvailable()
      fetchEnrolledCount()
    } catch (err) {
      setEnrollMessage(err.response?.data?.error || 'Enrollment failed')
    } finally {
      setEnrollingId(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 min-h-screen relative">
        {/* Top Nav Bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-5 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Search academic records..."
                type="text"
              />
            </div>
            <nav className="hidden md:flex gap-6">
              <a className="text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 pb-1 font-medium text-sm" href="#">Overview</a>
              <a className="text-slate-500 hover:text-indigo-500 transition-all text-sm font-medium" href="#">Reports</a>
              <a className="text-slate-500 hover:text-indigo-500 transition-all text-sm font-medium" href="#">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-on-surface capitalize">{displayName}</p>
                <p className="text-[10px] text-slate-500">{today}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center ring-2 ring-primary-fixed">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <section className="p-8 max-w-7xl mx-auto space-y-12">
          {/* Page Header */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-extrabold font-label">
              Academic Overview
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">
              Student Performance
            </h2>
          </div>

          {/* Academic Command Center */}
          <AcademicCommandCenter />

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary-fixed text-primary rounded-xl">
                  <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Enrolled</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Enrolled Courses</p>
              <h3 className="text-3xl font-bold mt-1">{enrolledCount ?? '—'}</h3>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary-fixed text-secondary rounded-xl">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className={`w-1.5 h-1.5 rounded-full ${attendancePct == null || attendancePct >= 75 ? 'bg-green-500' : 'bg-error'}`} />
                  <span className={`text-[10px] font-bold ${attendancePct == null || attendancePct >= 75 ? 'text-green-600' : 'text-error'}`}>
                    {attendancePct == null || attendancePct >= 75 ? 'On Track' : 'At Risk'}
                  </span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Attendance %</p>
              <h3 className="text-3xl font-bold mt-1">{attendancePct != null ? `${attendancePct}%` : '—'}</h3>
            </div>

            {/* Featured GPA card */}
            <div className="bg-primary-container p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300 text-on-primary shadow-xl shadow-indigo-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <span className="material-symbols-outlined text-white">grade</span>
                </div>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded-full">Top 5%</span>
              </div>
              <p className="text-on-primary-container text-sm font-medium">Cumulative GPA</p>
              <h3 className="text-3xl font-bold mt-1">{gpa != null ? gpa.toFixed(2) : '—'}</h3>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-tertiary-fixed text-tertiary rounded-xl">
                  <span className="material-symbols-outlined">event_note</span>
                </div>
                <span className="text-[10px] font-bold text-error bg-error-container px-2 py-1 rounded-full">Deadlines</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Upcoming Assessments</p>
              <h3 className="text-3xl font-bold mt-1">{upcomingCount != null ? upcomingCount.toString().padStart(2, '0') : '—'}</h3>
            </div>
          </div>

          {/* Course Performance Breakdown */}
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold text-on-surface font-headline">Course Performance Breakdown</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Current Academic Semester</p>
              </div>
              <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                View Detailed Transcript
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {perfCourses.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No course performance data yet.</p>
              ) : perfCourses.map((c) => {
                const pct = c.averagePercentage ?? 0
                const comps = [
                  { label: 'Internal', g: c.grades?.INTERNAL },
                  { label: 'Mid-Term', g: c.grades?.MID_TERM },
                  { label: 'Final', g: c.grades?.FINAL },
                ]
                return (
                <div key={c.courseId} className="bg-surface-container-lowest p-8 rounded-2xl space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase">
                        {c.courseCode}
                      </span>
                      <h4 className="text-xl font-bold mt-2 font-headline">{c.courseName}</h4>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Attendance {c.attendancePct != null ? `${c.attendancePct}%` : '—'}
                        {' · '}
                        {c.overallGrade ? `Grade ${c.overallGrade}` : 'In progress'}
                      </p>
                    </div>
                    {/* Progress ring — average marks */}
                    <div className="w-14 h-14 relative flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="#e2dfff" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="24"
                          fill="none" stroke="#3525cd"
                          strokeDasharray={RING_C}
                          strokeDashoffset={RING_C * (1 - pct / 100)}
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold">{pct}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {comps.map((comp) => (
                      <div
                        key={comp.label}
                        className={`bg-surface-container-low p-4 rounded-xl ${!comp.g ? 'border border-dashed border-slate-200 dark:border-neutral-700' : ''}`}
                      >
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{comp.label}</p>
                        {!comp.g ? (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        ) : (
                          <div className="flex items-end gap-1">
                            <span className="text-lg font-bold">{comp.g.marks}</span>
                            <span className="text-[10px] text-slate-400 pb-1">/100</span>
                          </div>
                        )}
                        <div className="w-full bg-slate-200 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
                          {comp.g && <div className="bg-primary h-full" style={{ width: `${comp.g.marks}%` }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Dean's List + Upcoming Exams */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-surface-container-low rounded-2xl p-8 overflow-hidden relative">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <h4 className="text-2xl font-bold mb-2 font-headline">Dean's List Achievement</h4>
                  <p className="text-slate-600 max-w-md">
                    Your exceptional performance this semester places you in the top tier of the College
                    of Engineering. Keep up the momentum!
                  </p>
                </div>
                <div className="flex gap-4 mt-8">
                  <button className="px-6 py-3 bg-primary text-white font-bold rounded-full text-sm">
                    Download Certificate
                  </button>
                  <button className="px-6 py-3 bg-white text-primary font-bold rounded-full text-sm border border-primary/10">
                    Share on LinkedIn
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold font-headline">Upcoming Assessments</h4>
                <a href="/student/timetable" className="material-symbols-outlined text-slate-400 hover:text-primary">more_horiz</a>
              </div>
              <UpcomingAssessmentsWidget limit={5} />
            </div>
          </div>

          {/* Announcements Widget */}
          <div className="bg-surface-container-lowest rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold font-headline">Announcements</h3>
              <a href="/student/announcements" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                View All
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
            <AnnouncementsWidget limit={3} />
          </div>

          {/* Available Courses — self-enroll */}
          {availableCourses.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-on-surface font-headline">Available Courses</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Enroll in courses that interest you</p>
                </div>
                {enrollMessage && (
                  <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                    enrollMessage.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-error-container/30 text-error'
                  }`}>
                    {enrollMessage}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCourses.map((c) => (
                  <div key={c.id} className="bg-surface-container-lowest p-6 rounded-2xl space-y-4 hover:scale-[1.01] transition-transform">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase ${
                          c.type === 'MANDATORY' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
                        }`}>
                          {c.code}
                        </span>
                        <h4 className="text-base font-bold mt-2 font-headline leading-tight">{c.name}</h4>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span>{c.department?.name || '—'}</span>
                      <span className="font-semibold">{c.credits} credits</span>
                    </div>
                    <button
                      onClick={() => handleEnroll(c.id)}
                      disabled={enrollingId === c.id}
                      className="w-full py-2.5 bg-primary-container text-on-primary font-bold rounded-full text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {enrollingId === c.id ? 'Enrolling…' : 'Enroll'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* FAB */}
        <button className="fixed bottom-10 right-10 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group">
          <span className="material-symbols-outlined">add</span>
          <span className="absolute right-full mr-4 bg-on-surface text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            New Request
          </span>
        </button>
      </main>
    </div>
  )
}
