import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

const PASS_COLORS = {
  PASS: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  FAIL: 'bg-red-50 text-red-700 border-red-100',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
}

const COMPONENT_LABELS = { INTERNAL: 'Internal', MID_TERM: 'Mid-Term', FINAL: 'Final' }

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/users/${id}/profile`)
      .then(({ data }) => setProfile(data))
      .catch(() => setError('Failed to load student profile'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="flex-1 ml-16 md:ml-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="flex-1 ml-16 md:ml-64 flex items-center justify-center text-error">
          {error || 'Student not found'}
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />
      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">

        {/* Top Header */}
        <header className="flex items-center gap-4 px-10 py-6 sticky top-0 bg-surface/80 backdrop-blur-md z-30 border-b border-outline-variant/10">
          <button
            onClick={() => navigate('/admin/users')}
            className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
              Student Profile
            </p>
            <h1 className="text-2xl font-bold font-headline tracking-tight">
              {profile.displayName}
            </h1>
          </div>
        </header>

        <div className="px-10 py-8 space-y-8">

          {/* Hero identity card */}
          <section className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-primary font-headline">
                {profile.firstName
                  ? profile.firstName[0].toUpperCase()
                  : profile.email[0].toUpperCase()
                }
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-3xl font-extrabold font-headline tracking-tight">
                  {profile.displayName}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  profile.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-error-container text-on-error-container'
                }`}>
                  {profile.isActive ? 'Active' : 'Suspended'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {[
                  { icon: 'badge', label: 'Student ID', value: profile.studentId || '—' },
                  { icon: 'email', label: 'Email', value: profile.email },
                  { icon: 'account_tree', label: 'Department', value: profile.department?.name || '—' },
                  { icon: 'calendar_today', label: 'Enrolled Since', value: new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-surface-container-low rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">{icon}</span>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
                    </div>
                    <p className="font-bold text-sm text-on-surface truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats row */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Enrolled Courses', value: profile.stats.totalCourses, icon: 'auto_stories', color: 'bg-primary-fixed text-primary' },
              { label: 'Courses Passed', value: profile.stats.passedCourses, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Total Credits', value: profile.stats.totalCredits, icon: 'grade', color: 'bg-secondary-fixed text-secondary' },
              {
                label: 'Avg Attendance',
                value: `${profile.stats.overallAttendance}%`,
                icon: 'event_available',
                color: profile.stats.overallAttendance >= 75
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-error-container text-on-error-container',
              },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-surface-container-lowest rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <p className="text-3xl font-bold font-headline">{value}</p>
                <p className="text-sm text-on-surface-variant font-medium mt-1">{label}</p>
              </div>
            ))}
          </section>

          {/* Course breakdown */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline">Academic Record</h2>
            {profile.courses.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-2xl">
                <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">menu_book</span>
                <p>Not enrolled in any courses yet.</p>
              </div>
            ) : (
              profile.courses.map((course) => (
                <div key={course.courseId} className="bg-surface-container-lowest rounded-2xl p-8">
                  {/* Course header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {course.courseCode}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold font-headline">{course.courseName}</h3>
                        <p className="text-sm text-on-surface-variant">{course.department?.name} • {course.credits} credits</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${PASS_COLORS[course.passStatus]}`}>
                      {course.passStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Grades */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Grades</p>
                      <div className="grid grid-cols-3 gap-3">
                        {['INTERNAL', 'MID_TERM', 'FINAL'].map((comp) => {
                          const g = course.grades[comp]
                          return (
                            <div
                              key={comp}
                              className={`rounded-xl p-4 ${
                                g
                                  ? 'bg-surface-container-low'
                                  : 'bg-surface-container-low/50 border border-dashed border-outline-variant/30'
                              }`}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                                {COMPONENT_LABELS[comp]}
                              </p>
                              {g ? (
                                <>
                                  <p className="text-2xl font-bold text-on-surface">{g.marks}</p>
                                  <p className="text-xs font-bold text-primary">{g.letterGrade}</p>
                                </>
                              ) : (
                                <p className="text-sm text-on-surface-variant italic">Pending</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Attendance */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Attendance</p>
                      <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-6">
                        {/* Ring */}
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f5" strokeWidth="6" />
                            <circle
                              cx="32" cy="32" r="26"
                              fill="none"
                              stroke={course.attendance.percentage >= 75 ? '#10b981' : '#ef4444'}
                              strokeDasharray="163.4"
                              strokeDashoffset={163.4 * (1 - course.attendance.percentage / 100)}
                              strokeLinecap="round"
                              strokeWidth="6"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold">{course.attendance.percentage}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {course.attendance.attendedSessions}{' '}
                            <span className="text-sm font-normal text-on-surface-variant">
                              / {course.attendance.totalSessions}
                            </span>
                          </p>
                          <p className="text-xs text-on-surface-variant">sessions attended</p>
                          {course.attendance.percentage < 75 && course.attendance.totalSessions > 0 && (
                            <p className="text-xs text-error font-bold mt-1">⚠ Below 75% threshold</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
