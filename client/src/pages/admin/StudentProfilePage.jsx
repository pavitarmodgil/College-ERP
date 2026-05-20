import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

function getInitials(email, firstName, lastName) {
  if (firstName) {
    return (firstName[0] + (lastName?.[0] || '')).toUpperCase()
  }
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getDisplayName(student) {
  if (student.firstName) {
    return `${student.firstName}${student.lastName ? ' ' + student.lastName : ''}`
  }
  return student.email.split('@')[0].replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(({ data }) => setStudent(data))
      .catch(() => setError('Student not found.'))
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleDeactivate() {
    if (!window.confirm(`Deactivate ${getDisplayName(student)}? They will lose all access immediately.`)) return
    setDeactivating(true)
    try {
      await api.patch(`/users/${id}/deactivate`)
      navigate('/admin/users')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate user')
      setDeactivating(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="ml-16 md:ml-64 flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 w-full z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold font-label leading-none">
                Student Profile View
              </p>
              <h2 className="text-xl font-extrabold font-headline tracking-tight text-on-surface">
                {isLoading ? 'Loading…' : error ? 'Not Found' : getDisplayName(student)}
              </h2>
            </div>
          </div>
          {student && !error && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/admin/users`)}
                className="px-5 py-2 rounded-full border border-outline-variant text-on-surface font-bold text-sm hover:bg-surface-container-high transition-all"
              >
                Edit Student
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivating || !student.isActive}
                className="px-5 py-2 rounded-full bg-error text-on-error font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deactivating ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          )}
        </header>

        <div className="p-8 space-y-6">
          {isLoading ? (
            <>
              <div className="animate-pulse bg-surface-container-high rounded-xl h-36" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-surface-container-high rounded-xl h-24" />
                ))}
              </div>
              <div className="animate-pulse bg-surface-container-high rounded-xl h-12" />
            </>
          ) : error ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">person_off</span>
              <p className="text-on-surface-variant font-medium">Student not found</p>
              <button
                onClick={() => navigate('/admin/users')}
                className="mt-4 text-primary font-bold text-sm hover:underline"
              >
                Back to Users
              </button>
            </div>
          ) : (
            <>
              {/* Profile Header Card */}
              <section className="bg-surface-container-lowest rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-8">
                {/* Avatar with status badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xl">
                    {getInitials(student.email, student.firstName, student.lastName)}
                  </div>
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full border-2 border-surface-container-lowest whitespace-nowrap ${
                    student.isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-400 text-white'
                  }`}>
                    {student.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Info grid */}
                <div className="flex flex-wrap gap-x-10 gap-y-4 flex-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Student ID</p>
                    <p className="font-mono text-xl font-bold text-primary">{student.studentId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email Address</p>
                    <p className="text-sm font-medium text-on-surface">{student.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Department</p>
                    <p className="text-sm font-medium text-on-surface">{student.department?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Enrolled Since</p>
                    <p className="text-sm font-medium text-on-surface">
                      {new Date(student.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Current Semester</p>
                    <p className="text-sm font-medium text-on-surface-variant">—</p>
                  </div>
                </div>
              </section>

              {/* Stats Row */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Enrolled Courses', icon: 'auto_stories', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
                  { label: 'Courses Passed',   icon: 'task_alt',     iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
                  { label: 'Total Credits',    icon: 'stars',        iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'   },
                  { label: 'Avg Attendance',   icon: 'event_available', iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
                ].map(({ label, icon, iconBg, iconColor }) => (
                  <div key={label} className="bg-surface-container-lowest rounded-xl p-6 flex items-center gap-4">
                    <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{label}</p>
                      <p className="text-2xl font-extrabold text-on-surface">—</p>
                    </div>
                  </div>
                ))}
              </section>

              {/* Academic Record */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Academic Record</p>
                    <h3 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight">Current Performance</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container-high px-5 py-2.5 rounded-full font-bold text-sm text-on-surface">
                    <span className="material-symbols-outlined text-base">filter_list</span>
                    All Semesters
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">menu_book</span>
                  <p className="font-medium">Academic records will appear here</p>
                  <p className="text-sm mt-1 opacity-60">Full grade and attendance data coming in Phase 6</p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
