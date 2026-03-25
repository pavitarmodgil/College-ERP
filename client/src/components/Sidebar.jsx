import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import {
  LayoutDashboard, Users, BookOpen,
  ClipboardList, BarChart2, LogOut, GraduationCap
} from 'lucide-react'

const NAV_LINKS = {
  ADMIN: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
  ],
  TEACHER: [
    { to: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/teacher/attendance', icon: ClipboardList, label: 'Attendance' },
    { to: '/teacher/grades', icon: BarChart2, label: 'Grades' },
  ],
  STUDENT: [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/grades', icon: BarChart2, label: 'My Grades' },
    { to: '/student/attendance', icon: ClipboardList, label: 'My Attendance' },
  ],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = NAV_LINKS[user?.role] || []
  const displayName = user?.email?.split('@')[0] || ''

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="w-64 h-screen flex flex-col bg-slate-50 dark:bg-neutral-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <GraduationCap size={16} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">College ERP</span>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate capitalize">
          {displayName}
        </p>
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium">
          {user?.role}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/30 dark:to-neutral-900 text-indigo-700 dark:text-indigo-300 font-medium border-l-2 border-indigo-500 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: theme + logout */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
