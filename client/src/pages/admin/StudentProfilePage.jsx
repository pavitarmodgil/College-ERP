import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

function getInitials(email) {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(({ data }) => setStudent(data))
      .catch(() => setError('Student not found.'))
      .finally(() => setIsLoading(false))
  }, [id])

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="ml-16 md:ml-64 flex-1">
        {/* Header */}
        <header className="sticky top-0 w-full flex items-center gap-4 px-8 py-6 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold font-label">Student Profile</p>
            <h2 className="text-4xl font-extrabold font-headline tracking-tight">
              {student ? (student.email.split('@')[0].replace(/[._-]/g, ' ')) : 'Loading…'}
            </h2>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {isLoading ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 animate-pulse h-48" />
          ) : error ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">person_off</span>
              <p className="text-on-surface-variant">{error}</p>
            </div>
          ) : (
            <>
              {/* Profile card */}
              <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center gap-8">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  {getInitials(student.email)}
                </div>
                {/* Info */}
                <div className="flex-1">
                  <p className="text-2xl font-bold font-headline capitalize">
                    {student.email.split('@')[0].replace(/[._-]/g, ' ')}
                  </p>
                  <p className="text-on-surface-variant text-sm mt-1">{student.email}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <span className="px-3 py-1 bg-tertiary/10 text-tertiary text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Student
                    </span>
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      student.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {student.mustResetPassword && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Password reset required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface-container-lowest rounded-2xl p-6">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Student ID</p>
                  <p className="font-mono text-xl font-bold text-on-surface">{student.studentId || '—'}</p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Department</p>
                  <p className="text-xl font-bold text-on-surface">{student.department?.name || '—'}</p>
                  {student.department && (
                    <p className="text-xs text-on-surface-variant mt-1 font-mono">{student.department.code}</p>
                  )}
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Member Since</p>
                  <p className="text-xl font-bold text-on-surface">
                    {new Date(student.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Back link */}
              <div>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Users
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
