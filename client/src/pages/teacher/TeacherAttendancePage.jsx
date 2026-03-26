import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

export default function TeacherAttendancePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  useEffect(() => {
    api.get('/attendance/courses')
      .then(({ data }) => setCourses(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-5 z-30 bg-slate-50/80 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-indigo-600 font-headline">Attendance</h1>
            <p className="text-on-surface-variant text-sm font-medium">Mark and track student attendance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
              <input
                className="pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-56 outline-none"
                placeholder="Search courses..."
                type="text"
              />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8 py-8 max-w-7xl mx-auto space-y-10">
          {/* Masthead */}
          <div className="flex justify-between items-end border-b border-outline-variant/15 pb-8">
            <div>
              <span className="text-xs font-bold tracking-[0.15em] uppercase text-indigo-600/70 block mb-2">
                Faculty Portal • Today
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">
                {today}
              </h2>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-surface-container-lowest text-on-surface font-semibold rounded-xl hover:bg-surface-container-high transition-all flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Filter
              </button>
              <button className="px-5 py-2.5 bg-surface-container-lowest text-on-surface font-semibold rounded-xl hover:bg-surface-container-high transition-all flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                Export Reports
              </button>
            </div>
          </div>

          {/* Course grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl p-8 animate-pulse h-64" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">calendar_today</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Courses Assigned</h3>
              <p className="text-slate-500 text-sm">You haven't been assigned to any courses yet.</p>
            </div>
          ) : (
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onMark={() => navigate(`/teacher/attendance/${course.id}`)}
                />
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function CourseCard({ course, onMark }) {
  const submitted = course.todaySubmitted

  return (
    <div className={`group bg-surface-container-lowest rounded-2xl p-8 hover:shadow-[0_20px_40px_rgba(70,69,85,0.06)] transition-all duration-300 border border-transparent ${submitted ? 'hover:border-green-100' : 'hover:border-indigo-100'} flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-6">
          <span className="bg-primary-container text-on-primary text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
            {course.code}
          </span>
          {submitted ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-lg">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-xs font-bold uppercase tracking-wider">Submitted</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">pending</span>
              <span className="text-xs font-bold uppercase tracking-wider">Not Marked</span>
            </div>
          )}
        </div>

        <h3 className="text-2xl font-bold font-headline mb-1 text-on-surface">{course.name}</h3>
        <p className="text-on-surface-variant font-medium mb-6">
          {course.department?.name ? `Department of ${course.department.name}` : '—'}
        </p>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-400 text-base">groups</span>
          </div>
          <span className="text-sm font-semibold text-slate-500">
            {course.enrollmentCount} student{course.enrollmentCount !== 1 ? 's' : ''} enrolled
          </span>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-outline-variant/10">
        <div className="flex justify-between items-center text-sm">
          <span className="text-on-surface-variant">Course type: {course.type}</span>
        </div>
        {submitted ? (
          <button
            onClick={onMark}
            className="w-full bg-surface-container text-on-surface py-4 rounded-xl font-bold tracking-wide hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">edit_note</span>
            View / Edit
          </button>
        ) : (
          <button
            onClick={onMark}
            className="w-full bg-primary-container text-on-primary py-4 rounded-xl font-bold tracking-wide hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">fact_check</span>
            Mark Attendance
          </button>
        )}
      </div>
    </div>
  )
}
