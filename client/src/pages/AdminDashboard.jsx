import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import AnnouncementsWidget from '../components/AnnouncementsWidget'

export default function AdminDashboard() {
  const { user } = useAuth()
  const displayName = user?.email?.split('@')[0] || 'Admin'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [studentCount, setStudentCount] = useState(null)
  const [teacherCount, setTeacherCount] = useState(null)
  const [courseCount, setCourseCount] = useState(null)
  const [deptCount, setDeptCount] = useState(null)
  const [enrollmentCount, setEnrollmentCount] = useState(null)
  const [attendanceRate] = useState(82)

  useEffect(() => {
    api.get('/users', { params: { role: 'STUDENT', limit: 1 } })
      .then(({ data }) => { setStudentCount(data.total); setEnrollmentCount(data.total) })
      .catch(() => { setStudentCount('—'); setEnrollmentCount('—') })
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

          {/* Second Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

            {/* Total Enrollments */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                </div>
                <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">Live</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Total Enrolled</p>
              <h3 className="text-3xl font-bold font-headline">{enrollmentCount ?? '…'}</h3>
              <p className="text-xs text-slate-400 mt-1">students across all depts</p>
            </div>

            {/* Attendance Rate */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-primary">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                </div>
                <span className="text-primary text-xs font-bold bg-indigo-50 px-2 py-1 rounded-full">Avg</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Attendance Rate</p>
              <h3 className="text-3xl font-bold font-headline">{attendanceRate}%</h3>
              <p className="text-xs text-slate-400 mt-1">across all courses</p>
            </div>

            {/* Active Courses */}
            <div className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                </div>
                <span className="text-amber-700 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full">Semester</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Active Courses</p>
              <h3 className="text-3xl font-bold font-headline">{courseCount ?? '…'}</h3>
              <p className="text-xs text-slate-400 mt-1">across {deptCount ?? '…'} departments</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-primary-container rounded-xl p-6 text-on-primary transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-white/20 text-white">
                  <span className="material-symbols-outlined text-2xl">bolt</span>
                </div>
              </div>
              <p className="text-white/70 text-xs font-bold mb-1 uppercase tracking-wider">Quick Actions</p>
              <div className="space-y-2 mt-3">
                <a href="/admin/users" className="block text-sm font-semibold text-white hover:text-white/80 transition-colors">→ Manage Users</a>
                <a href="/admin/courses" className="block text-sm font-semibold text-white hover:text-white/80 transition-colors">→ Manage Courses</a>
                <a href="/admin/announcements" className="block text-sm font-semibold text-white hover:text-white/80 transition-colors">→ Post Announcement</a>
              </div>
            </div>
          </div>

          {/* Bottom: University at a Glance + Announcements */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-surface-container-low rounded-xl p-8">
              <h3 className="text-xl font-bold font-headline mb-6">University at a Glance</h3>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Students', value: studentCount, icon: 'person', color: 'text-primary bg-primary-fixed' },
                  { label: 'Teachers', value: teacherCount, icon: 'school', color: 'text-secondary bg-secondary-fixed' },
                  { label: 'Departments', value: deptCount, icon: 'account_tree', color: 'text-tertiary bg-tertiary-fixed' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="text-center">
                    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mx-auto mb-3`}>
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <p className="text-3xl font-bold font-headline">{value ?? '…'}</p>
                    <p className="text-sm text-slate-500 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>

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
