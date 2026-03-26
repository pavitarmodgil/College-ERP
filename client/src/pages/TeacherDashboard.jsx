import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import AnnouncementsWidget from '../components/AnnouncementsWidget'

const attendanceRows = [
  { name: 'Alexander Wright', email: 'alex.wright@university.edu', id: '#UG-2023-9481', gpa: '3.92', gpaColor: 'bg-primary-fixed text-primary', status: 'On Track', statusColor: 'text-emerald-600', statusDot: 'bg-emerald-500', present: true },
  { name: 'Maya Thompson', email: 'maya.t@university.edu', id: '#UG-2023-8821', gpa: '3.85', gpaColor: 'bg-primary-fixed text-primary', status: 'On Track', statusColor: 'text-emerald-600', statusDot: 'bg-emerald-500', present: true },
  { name: 'Julian Chen', email: 'j.chen@university.edu', id: '#UG-2023-1044', gpa: '2.41', gpaColor: 'bg-error-container text-error', status: 'At Risk', statusColor: 'text-error', statusDot: 'bg-error', present: false },
  { name: 'Elena Rodriguez', email: 'e.rod@university.edu', id: '#UG-2023-1190', gpa: '3.98', gpaColor: 'bg-primary-fixed text-primary', status: 'On Track', statusColor: 'text-emerald-600', statusDot: 'bg-emerald-500', present: true },
]

const schedule = [
  { time: '09:00', title: 'CS-302: Advanced Data Structures', sub: 'Hall 4-B • 45 Students Enrolled', active: true },
  { time: '11:30', title: 'CS-101: Intro to Algorithms', sub: 'Virtual Room 12 • 120 Students Enrolled', active: false },
]

export default function TeacherDashboard() {
  const { user } = useAuth()
  const displayName = user?.teacherId || user?.email?.split('@')[0] || 'Teacher'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 min-h-screen">
        {/* Top Nav Bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-5 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/20 w-64 text-sm outline-none"
                placeholder="Search students, grades..."
                type="text"
              />
            </div>
            <nav className="flex gap-6">
              <a className="text-indigo-600 border-b-2 border-indigo-600 font-medium pb-1 text-sm" href="#">Overview</a>
              <a className="text-slate-500 hover:text-indigo-500 transition-all font-medium text-sm" href="#">Reports</a>
              <a className="text-slate-500 hover:text-indigo-500 transition-all font-medium text-sm" href="#">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-on-surface capitalize">{displayName}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Professor</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center ring-2 ring-primary-fixed">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-on-surface leading-tight tracking-tight font-headline">
              Academic Dashboard
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Welcome back. You have{' '}
              <span className="text-primary font-bold">3 pending attendance reports</span>{' '}
              to complete today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-fixed flex items-center justify-center rounded-2xl">
                  <span className="material-symbols-outlined text-primary">book</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">—</p>
              <p className="text-sm font-medium text-slate-500">My Courses</p>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-on-primary-container flex items-center justify-center rounded-2xl">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                </div>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Today</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">{schedule.length.toString().padStart(2, '0')}</p>
              <p className="text-sm font-medium text-slate-500">Today's Classes</p>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-error-container flex items-center justify-center rounded-2xl">
                  <span className="material-symbols-outlined text-error">assignment_late</span>
                </div>
                <span className="text-xs font-bold text-error uppercase tracking-widest">Urgent</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">03</p>
              <p className="text-sm font-medium text-slate-500">Pending Attendance</p>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-secondary-fixed flex items-center justify-center rounded-2xl">
                  <span className="material-symbols-outlined text-secondary">grade</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">92%</p>
              <p className="text-sm font-medium text-slate-500">Grades Entered</p>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm mb-8">
            <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface font-headline">Student Attendance</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  CS-302: Advanced Data Structures • Section B
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm transition-transform hover:scale-105">
                  Submit Attendance
                </button>
                <button className="bg-surface-container-lowest text-on-surface-variant p-2.5 rounded-full shadow-sm hover:bg-white transition-all">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
              </div>
            </div>

            <div className="px-8 pb-8 overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-slate-400 text-[11px] uppercase tracking-[0.15em] font-bold">
                    <th className="px-6 pb-2">Student Name</th>
                    <th className="px-6 pb-2 text-center">Student ID</th>
                    <th className="px-6 pb-2 text-center">Current GPA</th>
                    <th className="px-6 pb-2 text-center">Status</th>
                    <th className="px-6 pb-2 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.map((row) => (
                    <tr
                      key={row.name}
                      className="bg-surface-container-lowest group transition-all hover:bg-on-primary-container/20"
                    >
                      <td className="px-6 py-5 rounded-l-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-base">person</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{row.name}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-mono text-slate-500">{row.id}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 ${row.gpaColor} font-bold text-xs rounded-full`}>{row.gpa}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={`flex items-center justify-center gap-1.5 text-xs font-bold ${row.statusColor}`}>
                          <span className={`w-1.5 h-1.5 ${row.statusDot} rounded-full`} />
                          {row.status}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right rounded-r-2xl">
                        {/* Toggle switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            defaultChecked={row.present}
                            className="sr-only peer"
                            type="checkbox"
                            readOnly
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Grid: Schedule + Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today's Schedule */}
            <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-on-surface mb-6 font-headline">Today's Schedule</h3>
              <div className="space-y-6">
                {schedule.map((cls) => (
                  <div key={cls.time} className="flex gap-6 items-start">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${cls.active ? 'text-primary' : 'text-slate-400'}`}>
                        {cls.time}
                      </span>
                      <div className="w-px h-12 bg-outline-variant opacity-20 my-2" />
                    </div>
                    <div className={`flex-1 p-4 rounded-xl ${cls.active ? 'bg-surface-container border-l-4 border-primary' : 'bg-surface-container-low'}`}>
                      <p className={`text-sm font-bold ${cls.active ? '' : 'text-slate-600'}`}>{cls.title}</p>
                      <p className={`text-xs mt-1 ${cls.active ? 'text-slate-500' : 'text-slate-400'}`}>{cls.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements Widget */}
            <div className="bg-surface-container-lowest rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-headline">Announcements</h3>
                <a href="/teacher/announcements" className="text-xs font-bold text-primary hover:underline">
                  View All
                </a>
              </div>
              <AnnouncementsWidget limit={3} />
            </div>
          </div>
        </div>
      </main>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 bg-primary text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group">
        <span className="material-symbols-outlined transition-all group-hover:rotate-90">add</span>
        <span className="absolute right-16 bg-on-surface text-white text-xs py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          New Announcement
        </span>
      </button>
    </div>
  )
}
