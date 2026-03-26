import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import AnnouncementsWidget from '../components/AnnouncementsWidget'

const courseCards = [
  {
    code: 'CS502',
    codeColor: 'bg-indigo-50 text-primary',
    title: 'Advanced Algorithms & Complexity',
    pct: 90,
    pctColor: '#3525cd',
    trackColor: '#e2dfff',
    ringOffset: 15,
    components: [
      { label: 'Internal', score: 28, max: 30, barW: '93%', barColor: 'bg-primary' },
      { label: 'Mid-Term', score: 18, max: 20, barW: '90%', barColor: 'bg-primary' },
      { label: 'Final', pending: true },
    ],
  },
  {
    code: 'CS504',
    codeColor: 'bg-amber-50 text-tertiary',
    title: 'Distributed Systems Architecture',
    pct: 78,
    pctColor: '#7e3000',
    trackColor: '#ffdbcc',
    ringOffset: 35,
    components: [
      { label: 'Internal', score: 22, max: 30, barW: '73%', barColor: 'bg-tertiary' },
      { label: 'Mid-Term', score: 17, max: 20, barW: '85%', barColor: 'bg-tertiary' },
      { label: 'Final', score: 39, max: 50, barW: '78%', barColor: 'bg-tertiary' },
    ],
  },
]

const upcomingExams = [
  { month: 'Oct', day: '24', title: 'Neural Networks & ML', time: '09:00 AM • Room 402' },
  { month: 'Oct', day: '27', title: 'Cybersecurity Principles', time: '02:30 PM • Main Hall' },
]

export default function StudentDashboard() {
  const { user } = useAuth()
  const displayName = user?.studentId || user?.email?.split('@')[0] || 'Student'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [availableCourses, setAvailableCourses] = useState([])
  const [enrolledCount, setEnrolledCount] = useState(null)
  const [enrollingId, setEnrollingId] = useState(null)
  const [enrollMessage, setEnrollMessage] = useState('')

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

  useEffect(() => {
    fetchAvailable()
    fetchEnrolledCount()
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
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-green-600">On Track</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Attendance %</p>
              <h3 className="text-3xl font-bold mt-1">—</h3>
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
              <h3 className="text-3xl font-bold mt-1">—</h3>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-tertiary-fixed text-tertiary rounded-xl">
                  <span className="material-symbols-outlined">event_note</span>
                </div>
                <span className="text-[10px] font-bold text-error bg-error-container px-2 py-1 rounded-full">3 Days Left</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Upcoming Exams</p>
              <h3 className="text-3xl font-bold mt-1">{upcomingExams.length.toString().padStart(2, '0')}</h3>
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
              {courseCards.map((c) => (
                <div key={c.code} className="bg-surface-container-lowest p-8 rounded-2xl space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`${c.codeColor} text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase`}>
                        {c.code}
                      </span>
                      <h4 className="text-xl font-bold mt-2 font-headline">{c.title}</h4>
                    </div>
                    {/* Progress ring */}
                    <div className="w-14 h-14 relative flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke={c.trackColor} strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="24"
                          fill="none" stroke={c.pctColor}
                          strokeDasharray="150"
                          strokeDashoffset={c.ringOffset}
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold">{c.pct}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {c.components.map((comp) => (
                      <div
                        key={comp.label}
                        className={`bg-surface-container-low p-4 rounded-xl ${comp.pending ? 'border border-dashed border-slate-200' : ''}`}
                      >
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{comp.label}</p>
                        {comp.pending ? (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        ) : (
                          <div className="flex items-end gap-1">
                            <span className="text-lg font-bold">{comp.score}</span>
                            <span className="text-[10px] text-slate-400 pb-1">/{comp.max}</span>
                          </div>
                        )}
                        <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                          {!comp.pending && <div className={`${comp.barColor} h-full`} style={{ width: comp.barW }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                <h4 className="font-bold font-headline">Upcoming Exams</h4>
                <span className="material-symbols-outlined text-slate-400">more_horiz</span>
              </div>
              <div className="space-y-6">
                {upcomingExams.map((exam) => (
                  <div key={exam.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-14 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{exam.month}</span>
                      <span className="text-xl font-bold text-primary">{exam.day}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{exam.title}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {exam.time}
                      </p>
                    </div>
                  </div>
                ))}
                <button className="w-full py-4 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 font-bold text-xs hover:bg-slate-50 transition-colors uppercase tracking-widest">
                  Full Schedule
                </button>
              </div>
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
