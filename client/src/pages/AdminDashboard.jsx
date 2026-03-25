import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { Users, GraduationCap, BookOpen, Building2, CalendarDays } from 'lucide-react'

const stats = [
  { label: 'Total Students', value: '0', icon: Users, bg: 'bg-indigo-100 dark:bg-indigo-900/40', color: 'text-indigo-600 dark:text-indigo-400' },
  { label: 'Total Teachers', value: '0', icon: GraduationCap, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Active Courses', value: '0', icon: BookOpen, bg: 'bg-purple-100 dark:bg-purple-900/40', color: 'text-purple-600 dark:text-purple-400' },
  { label: 'Departments', value: '0', icon: Building2, bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const displayName = user?.email?.split('@')[0] || ''
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
            {greeting}, <span className="capitalize">{displayName}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <CalendarDays size={14} className="text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map(({ label, value, icon: Icon, bg, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 transition-transform hover:scale-[1.02] duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} mb-4`}>
                <Icon size={22} className={color} />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {['Add User', 'Add Course', 'Add Department'].map((action) => (
              <button
                key={action}
                onClick={() => alert('Coming in Phase 4')}
                className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
