import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import AnnouncementsWidget from '../components/AnnouncementsWidget'

const STATUS_STYLES = {
  Completed:  { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  Processing: { dot: 'bg-indigo-500',  text: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  Pending:    { dot: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50'   },
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email?.split('@')[0] || 'Admin'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [studentCount, setStudentCount] = useState(null)
  const [teacherCount, setTeacherCount] = useState(null)
  const [courseCount, setCourseCount] = useState(null)
  const [deptCount, setDeptCount] = useState(null)
  const [activity, setActivity] = useState(null)  // null = loading

  useEffect(() => {
    api.get('/users', { params: { role: 'STUDENT', limit: 1 } })
      .then(({ data }) => setStudentCount(data.total))
      .catch(() => setStudentCount('—'))
    api.get('/users', { params: { role: 'TEACHER', limit: 1 } })
      .then(({ data }) => setTeacherCount(data.total))
      .catch(() => setTeacherCount('—'))
    api.get('/courses', { params: { limit: 1 } })
      .then(({ data }) => setCourseCount(data.total))
      .catch(() => setCourseCount('—'))
    api.get('/users/departments')
      .then(({ data }) => setDeptCount(data.length))
      .catch(() => setDeptCount('—'))
    api.get('/users/recent-activity')
      .then(({ data }) => setActivity(data))
      .catch(() => setActivity([]))
  }, [])

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        {/* Top Nav Bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-5 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-sm text-on-surface placeholder:text-outline outline-none"
                placeholder="Search for students, grades, or faculty..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 ml-8">
            <div className="hidden lg:flex items-center gap-8 mr-4">
              <a className="text-indigo-600 font-semibold border-b-2 border-indigo-600 px-1 py-1 text-sm" href="#">Overview</a>
              <a className="text-slate-500 hover:text-indigo-500 transition-all text-sm" href="#">Reports</a>
              <a className="text-slate-500 hover:text-indigo-500 transition-all text-sm" href="#">Settings</a>
            </div>
            <button className="relative p-2 text-slate-500 hover:text-indigo-600 transition-all">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-surface" />
            </button>
            <button className="p-2 text-slate-500 hover:text-indigo-600 transition-all">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="px-10 py-8 max-w-[1600px] mx-auto">
          {/* Greeting */}
          <section className="mb-10">
            <h2 className="text-4xl font-extrabold text-on-surface font-headline tracking-tight mb-2 capitalize">
              Welcome Back, {displayName}
            </h2>
            <p className="text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 text-base">calendar_today</span>
              {today} • University of Excellence Portal
            </p>
          </section>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Total Students */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-primary-fixed text-primary">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Total Students</p>
              <h3 className="text-3xl font-bold font-headline">{studentCount ?? '…'}</h3>
            </div>

            {/* Total Teachers */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-secondary-fixed text-secondary">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                </div>
                <span className="text-slate-400 text-xs font-bold bg-slate-50 px-2 py-1 rounded-full">Steady</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Total Teachers</p>
              <h3 className="text-3xl font-bold font-headline">{teacherCount ?? '…'}</h3>
            </div>

            {/* Active Courses */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-tertiary-fixed text-tertiary">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                </div>
                <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full">Active</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Active Courses</p>
              <h3 className="text-3xl font-bold font-headline">{courseCount ?? '…'}</h3>
            </div>

            {/* Departments */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-outline-variant text-on-surface-variant">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
                </div>
                <span className="text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-1 rounded-full">Global</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Departments</p>
              <h3 className="text-3xl font-bold font-headline">{deptCount ?? '…'}</h3>
            </div>
          </div>

          {/* Bottom: Recent Enrollment Activity + Announcements */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Recent Enrollment Activity */}
            <div className="xl:col-span-2 bg-surface-container-low rounded-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight">
                    Recent Enrollment Activity
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium mt-1">
                    Real-time update of student registrations
                  </p>
                </div>
                <a href="/admin/users" className="text-primary font-bold text-sm hover:underline">
                  View All Records
                </a>
              </div>

              {/* Column headers */}
              <div className="flex items-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <div className="flex-1">Student</div>
                <div className="w-32 hidden sm:block">Department</div>
                <div className="w-28">Course</div>
                <div className="w-28">Status</div>
                <div className="w-20 text-right">Date</div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {activity === null ? (
                  // Loading skeletons
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-surface-container-high rounded-xl h-14" />
                  ))
                ) : activity.length === 0 ? (
                  <p className="text-center text-on-surface-variant py-10 text-sm">No recent activity yet</p>
                ) : (
                  activity.map((row, i) => {
                    const style = STATUS_STYLES[row.status] || STATUS_STYLES.Pending
                    return (
                      <div
                        key={i}
                        className="flex items-center px-4 py-4 bg-surface-container-lowest rounded-xl transition-all hover:scale-[1.01] hover:shadow-sm"
                      >
                        {/* Student */}
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {row.initials}
                          </div>
                          <span className="text-sm font-bold text-on-surface truncate">{row.name}</span>
                        </div>
                        {/* Department */}
                        <div className="w-32 text-xs font-medium text-slate-500 hidden sm:block truncate">{row.dept}</div>
                        {/* Course chip */}
                        <div className="w-28">
                          <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold rounded-full">
                            {row.course}
                          </span>
                        </div>
                        {/* Status */}
                        <div className="w-28 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                          <span className={`text-[10px] font-black uppercase ${style.text}`}>{row.status}</span>
                        </div>
                        {/* Date */}
                        <div className="w-20 text-right text-xs font-medium text-slate-400">{row.date}</div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Latest Announcements */}
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-headline text-lg">Latest Announcements</h3>
                <a href="/admin/announcements" className="text-xs font-bold text-primary hover:underline">Manage →</a>
              </div>
              <AnnouncementsWidget limit={3} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
