import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const recentActivity = [
  { initials: 'JH', color: 'bg-indigo-100 text-indigo-600', name: 'Julianne Hayes', dept: 'Computer Science', course: 'CS102-Intro', status: 'Completed', statusColor: 'text-emerald-600', dot: 'bg-emerald-500', date: 'Oct 24, 2023' },
  { initials: 'MR', color: 'bg-amber-100 text-amber-700', name: 'Marcus Reed', dept: 'Visual Arts', course: 'ART-404-Des', status: 'Pending', statusColor: 'text-amber-600', dot: 'bg-amber-500', date: 'Oct 23, 2023' },
  { initials: 'SK', color: 'bg-blue-100 text-blue-600', name: 'Sarah Kim', dept: 'Economics', course: 'ECO-201-Macro', status: 'Processing', statusColor: 'text-indigo-600', dot: 'bg-indigo-500', date: 'Oct 23, 2023' },
  { initials: 'BT', color: 'bg-rose-100 text-rose-600', name: 'Bradley Thompson', dept: 'Physical Therapy', course: 'PHY-300-Kin', status: 'Completed', statusColor: 'text-emerald-600', dot: 'bg-emerald-500', date: 'Oct 22, 2023' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const displayName = user?.email?.split('@')[0] || 'Admin'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [studentCount, setStudentCount] = useState(null)
  const [teacherCount, setTeacherCount] = useState(null)
  const [courseCount, setCourseCount] = useState(null)
  const [deptCount, setDeptCount] = useState(null)

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

          {/* Bottom Grid: Table + Side Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Enrollment Activity Table */}
            <div className="xl:col-span-2 bg-surface-container-low rounded-xl p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold font-headline">Recent Enrollment Activity</h3>
                <button className="text-sm font-semibold text-primary hover:underline">
                  View All Records
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    <tr>
                      <th className="px-6 pb-2">Student</th>
                      <th className="px-6 pb-2">Department</th>
                      <th className="px-6 pb-2">Course</th>
                      <th className="px-6 pb-2">Status</th>
                      <th className="px-6 pb-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((row) => (
                      <tr
                        key={row.name}
                        className="bg-surface-container-lowest rounded-xl transition-all hover:scale-[1.01] hover:shadow-sm"
                      >
                        <td className="px-6 py-4 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${row.color} rounded-full flex items-center justify-center font-bold text-xs`}>
                              {row.initials}
                            </div>
                            <span className="font-semibold text-sm">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{row.dept}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-3 py-1 bg-slate-100 rounded-full font-medium">{row.course}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-xs ${row.statusColor} font-bold uppercase`}>
                            <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400 font-medium rounded-r-xl">
                          {row.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-8">
              {/* Annual Goal Progress Ring */}
              <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-6 font-headline">Annual Goal Status</h3>
                <div className="flex items-center justify-center mb-6 relative">
                  <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f3f4f5" strokeWidth="12" />
                    <circle
                      cx="80" cy="80" r="70"
                      fill="transparent"
                      stroke="#3525cd"
                      strokeWidth="12"
                      strokeDasharray="440"
                      strokeDashoffset="88"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold font-headline">82%</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target</span>
                  </div>
                </div>
                <p className="text-center text-sm text-on-surface-variant px-4">
                  You are ahead of schedule for student graduation certifications this semester.
                </p>
              </div>

              {/* Announcement Card */}
              <div className="bg-primary-container rounded-xl overflow-hidden relative">
                <div className="relative p-6 text-on-primary">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest mb-4 inline-block">
                    News
                  </span>
                  <h4 className="text-xl font-bold font-headline mb-2 leading-tight">
                    Faculty Convocation Next Friday
                  </h4>
                  <p className="text-sm opacity-80 mb-6">
                    Attendance is mandatory for all department heads. RSVP in the portal settings.
                  </p>
                  <button className="w-full py-3 bg-white text-primary font-bold rounded-xl transition-transform hover:scale-105">
                    View Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
