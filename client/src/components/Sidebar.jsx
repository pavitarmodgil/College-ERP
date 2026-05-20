import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

const NAV_ICONS = {
  Dashboard: 'dashboard',
  Users: 'group',
  Courses: 'school',
  Departments: 'account_tree',
  Attendance: 'calendar_today',
  Grades: 'grade',
  'My Grades': 'grade',
  'My Attendance': 'event_available',
  Announcements: 'campaign',
  Timetable: 'calendar_month',
}

const NAV_LINKS = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/courses', label: 'Courses' },
    { to: '/admin/departments', label: 'Departments' },
    { to: '/admin/announcements', label: 'Announcements' },
    { to: '/admin/timetable', label: 'Timetable' },
  ],
  TEACHER: [
    { to: '/teacher', label: 'Dashboard' },
    { to: '/teacher/attendance', label: 'Attendance' },
    { to: '/teacher/grades', label: 'Grades' },
    { to: '/teacher/courses', label: 'Courses' },
    { to: '/teacher/announcements', label: 'Announcements' },
    { to: '/teacher/timetable', label: 'Timetable' },
  ],
  STUDENT: [
    { to: '/student', label: 'Dashboard' },
    { to: '/student/grades', label: 'My Grades' },
    { to: '/student/attendance', label: 'My Attendance' },
    { to: '/student/courses', label: 'Courses' },
    { to: '/student/announcements', label: 'Announcements' },
    { to: '/student/timetable', label: 'Timetable' },
  ],
}

const ROLE_LABELS = {
  ADMIN: 'Super Admin',
  TEACHER: 'Senior Professor',
  STUDENT: 'Student',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = NAV_LINKS[user?.role] || []
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email?.split('@')[0] || ''
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || ''

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col bg-slate-50 dark:bg-neutral-900 w-16 md:w-64 transition-all duration-300">
      {/* Logo */}
      <div className="px-4 py-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-white text-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            school
          </span>
        </div>
        <div className="hidden md:block overflow-hidden">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight font-headline whitespace-nowrap">
            Academic Curator
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            ERP Admin
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-2 space-y-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-white dark:bg-neutral-800 shadow-sm scale-95'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
              }`
            }
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">
              {NAV_ICONS[label] || 'circle'}
            </span>
            <span className="hidden md:inline text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-6 space-y-1 pt-4">
        {/* User profile card — desktop only */}
        <NavLink
          to={user?.role === 'ADMIN' ? '/admin/profile' : user?.role === 'TEACHER' ? '/teacher' : '/student'}
          className="block"
        >
          <div className="hidden md:flex items-center gap-3 px-4 py-4 mb-2 bg-surface-container-low dark:bg-neutral-800 rounded-xl hover:bg-surface-container-high dark:hover:bg-neutral-700 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-base">person</span>
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-on-surface dark:text-white">
                {displayName}
              </p>
              <p className="text-[10px] truncate text-on-surface-variant dark:text-neutral-400">
                {user?.email}
              </p>
              <span className="text-[10px] px-2 py-0.5 bg-primary-fixed text-on-primary-fixed-variant rounded-full">
                {roleLabel}
              </span>
            </div>
          </div>
        </NavLink>

        <ThemeToggle />

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-error dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors rounded-xl"
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0">logout</span>
          <span className="hidden md:inline text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
