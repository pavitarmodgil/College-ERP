import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function AttendanceHistoryPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/attendance/${courseId}/history`)
      .then(({ data }) => setHistory(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load history'))
      .finally(() => setIsLoading(false))
  }, [courseId])

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  function toDateParam(dateStr) {
    const d = new Date(dateStr)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/95 backdrop-blur-md flex justify-between items-center px-6 md:px-10 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/teacher/attendance/${courseId}`)}
            className="p-2 hover:bg-indigo-50 rounded-full transition-all text-on-surface-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight text-indigo-600 leading-none">
              Attendance History
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5 uppercase tracking-wider">
              Course #{courseId} — All past sessions
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/teacher/attendance/${courseId}`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary rounded-xl font-semibold text-sm hover:scale-[1.02] transition-transform"
        >
          <span className="material-symbols-outlined text-base">today</span>
          Today's Session
        </button>
      </header>

      <main className="pt-24 pb-12 px-6 md:px-10 max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-error-container/50 rounded-2xl text-on-error-container text-sm font-medium">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 animate-pulse h-20" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">event_busy</span>
            <h3 className="text-xl font-bold text-on-surface mb-2">No Past Sessions</h3>
            <p className="text-slate-500 text-sm mb-6">No attendance has been recorded for this course yet.</p>
            <button
              onClick={() => navigate(`/teacher/attendance/${courseId}`)}
              className="px-6 py-3 bg-primary-container text-on-primary rounded-xl font-bold text-sm"
            >
              Mark Today's Attendance
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 mb-4">
              <h2 className="font-headline text-lg font-bold text-on-surface">
                {history.length} Session{history.length !== 1 ? 's' : ''} Recorded
              </h2>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Click to edit
              </span>
            </div>

            {history.map((session) => {
              const dateKey = toDateParam(session.date)
              return (
                <button
                  key={dateKey}
                  onClick={() => navigate(`/teacher/attendance/${courseId}?date=${dateKey}`)}
                  className="w-full bg-surface-container-lowest p-5 rounded-2xl flex items-center gap-5 transition-all hover:scale-[1.01] hover:shadow-lg group text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-400 uppercase leading-none">
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xl font-extrabold text-indigo-600 leading-none mt-0.5">
                      {new Date(session.date).getUTCDate()}
                    </span>
                  </div>

                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-on-surface group-hover:text-indigo-600 transition-colors">
                      {formatDate(session.date)}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {session.totalStudents} student{session.totalStudents !== 1 ? 's' : ''} recorded
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-green-600">{session.presentCount} P</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-semibold text-red-500">{session.absentCount} A</span>
                      </div>
                      <div className="w-32 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${session.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      session.percentage >= 75
                        ? 'bg-green-50 text-green-600'
                        : session.percentage >= 50
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-600'
                    }`}>
                      {session.percentage}%
                    </div>

                    <span className="material-symbols-outlined text-slate-300 group-hover:text-indigo-400 transition-colors">
                      chevron_right
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
