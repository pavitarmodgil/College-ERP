import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { BookOpen, BarChart3, GraduationCap, CalendarDays } from 'lucide-react'

const stats = [
  { label: 'Enrolled Courses', value: '0', icon: BookOpen, bg: 'bg-indigo-100 dark:bg-indigo-900/40', color: 'text-indigo-600 dark:text-indigo-400' },
  { label: 'Attendance %', value: '\u2014', icon: BarChart3, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Overall GPA', value: '\u2014', icon: GraduationCap, bg: 'bg-purple-100 dark:bg-purple-900/40', color: 'text-purple-600 dark:text-purple-400' },
]

export default function StudentDashboard() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const displayName = user?.studentId || user?.email?.split('@')[0] || ''
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Empty state */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-12">
          <div className="flex flex-col items-center text-center">
            <GraduationCap size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              You are not enrolled in any courses yet.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
