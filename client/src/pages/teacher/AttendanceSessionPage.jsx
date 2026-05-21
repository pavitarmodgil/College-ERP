import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
]

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function AttendanceSessionPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const dateParam = searchParams.get('date') || todayStr()
  const isToday = dateParam === todayStr()

  const [session, setSession] = useState(null)
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const displayDate = new Date(dateParam + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  useEffect(() => {
    setIsLoading(true)
    setError('')
    setSuccess('')
    const url = isToday
      ? `/attendance/${courseId}/session`
      : `/attendance/${courseId}/session?date=${dateParam}`
    api.get(url)
      .then(({ data }) => {
        setSession(data)
        setStudents(data.students)
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load session'))
      .finally(() => setIsLoading(false))
  }, [courseId, dateParam])

  function handleToggle(enrollmentId) {
    setStudents((prev) =>
      prev.map((s) => s.enrollmentId === enrollmentId ? { ...s, present: !s.present } : s)
    )
  }

  function handleMarkAll(present) {
    setStudents((prev) => prev.map((s) => ({ ...s, present })))
  }

  function handleDateChange(newDate) {
    setSearchParams(newDate === todayStr() ? {} : { date: newDate })
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      const body = {
        students: students.map(({ enrollmentId, present }) => ({ enrollmentId, present })),
      }
      if (!isToday) body.date = dateParam
      await api.post(`/attendance/${courseId}/session`, body)
      if (isToday) {
        navigate('/teacher/attendance')
      } else {
        setSuccess('Attendance saved successfully')
        setStudents((prev) => prev.map((s) => ({ ...s, alreadySaved: true })))
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save attendance')
    } finally {
      setIsSaving(false)
    }
  }

  const presentCount = students.filter((s) => s.present).length
  const absentCount = students.length - presentCount

  const filtered = students.filter((s) =>
    !search || s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase())
  )

  function initials(email) {
    if (!email) return '?'
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
          <p className="text-slate-500 font-medium">Loading session…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/95 backdrop-blur-md flex justify-between items-center px-6 md:px-10 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teacher/attendance')}
            className="p-2 hover:bg-indigo-50 rounded-full transition-all text-on-surface-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight text-indigo-600 leading-none">
              {session?.courseId ? `Course #${session.courseId}` : 'Attendance Session'}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5 uppercase tracking-wider">
              {isToday ? 'Today' : 'Past Session'} — {displayDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl">
            <span className="material-symbols-outlined text-slate-400 text-base">calendar_today</span>
            <input
              type="date"
              value={dateParam}
              max={todayStr()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => navigate(`/teacher/attendance/${courseId}/history`)}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-surface-container-low rounded-xl text-sm font-semibold text-slate-600 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-base">history</span>
            History
          </button>
          <div className="hidden md:flex bg-surface-container-low px-4 py-2 rounded-xl items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-sm w-44 font-medium outline-none"
              placeholder="Search student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
          </div>
        </div>
      </header>

      <main className="pt-24 pb-36 px-6 md:px-10 max-w-5xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-error-container/50 rounded-2xl text-on-error-container text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-2xl text-green-700 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {success}
          </div>
        )}

        {!isToday && (
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl text-amber-700 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">edit_calendar</span>
            Editing past session — {displayDate}. Changes will be saved via upsert.
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center justify-between border-l-4 border-green-500 shadow-[0_20px_40px_rgba(70,69,85,0.06)]">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Present</p>
              <h3 className="text-3xl font-headline font-extrabold text-on-surface">{presentCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center justify-between border-l-4 border-error shadow-[0_20px_40px_rgba(70,69,85,0.06)]">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Absent</p>
              <h3 className="text-3xl font-headline font-extrabold text-on-surface">{absentCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl flex items-center justify-between border-l-4 border-slate-300 shadow-[0_20px_40px_rgba(70,69,85,0.06)]">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Students</p>
              <h3 className="text-3xl font-headline font-extrabold text-on-surface">{students.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-400">groups</span>
            </div>
          </div>
        </section>

        {/* Roll header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="font-headline text-xl font-bold text-on-surface">Class Roll</h2>
          <div className="flex gap-2">
            <button className="text-xs font-bold text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors uppercase tracking-tight">
              Sort by ID
            </button>
            <button className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors uppercase tracking-tight">
              Sort by Name
            </button>
          </div>
        </div>

        {/* Student list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">person_off</span>
            {search ? 'No students match your search.' : 'No students enrolled in this course.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((student, idx) => {
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length]
              const label = student.studentId || initials(student.email)
              const abbrev = label.length > 3 ? label.slice(0, 2).toUpperCase() : label.toUpperCase()

              return (
                <div
                  key={student.enrollmentId}
                  className="group bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-6 transition-all hover:scale-[1.01] hover:shadow-lg"
                >
                  <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center font-headline font-bold shrink-0 text-sm`}>
                    {abbrev}
                  </div>

                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-on-surface group-hover:text-indigo-600 transition-colors truncate">
                      {student.email}
                    </h4>
                    {student.studentId && (
                      <p className="text-xs font-medium text-slate-400 tracking-wide">
                        ID: {student.studentId}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-xs font-bold uppercase tracking-tighter ${student.present ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {student.present ? 'Present' : 'Absent'}
                    </span>
                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggle(student.enrollmentId)}
                      className={`w-14 h-8 rounded-full p-1 flex items-center transition-colors ${student.present ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}
                    >
                      <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-5 z-50 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="flex gap-2">
          <button
            onClick={() => handleMarkAll(true)}
            className="px-6 py-3 rounded-full text-indigo-600 font-bold hover:bg-indigo-50 transition-all text-sm uppercase tracking-tight"
          >
            Mark All Present
          </button>
          <button
            onClick={() => handleMarkAll(false)}
            className="px-6 py-3 rounded-full text-slate-500 font-bold hover:bg-slate-50 transition-all text-sm uppercase tracking-tight"
          >
            Mark All Absent
          </button>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Session Stats</p>
            <p className="text-sm font-semibold text-on-surface">
              {presentCount}/{students.length} Complete
              {students.length > 0 && ` (${Math.round((presentCount / students.length) * 100)}%)`}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || students.length === 0}
            className="flex-grow md:flex-none bg-primary text-on-primary px-10 py-4 rounded-full font-bold shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:scale-100"
          >
            <span className="material-symbols-outlined text-xl">save</span>
            {isSaving ? 'Saving…' : isToday ? 'Save Attendance' : 'Update Attendance'}
          </button>
        </div>
      </footer>

      {/* Subtle brand decoration */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none -mr-24 hidden xl:block">
        <h1 className="text-[12rem] font-headline font-black rotate-90 text-primary">CURATOR</h1>
      </div>
    </div>
  )
}
