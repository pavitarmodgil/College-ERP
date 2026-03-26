import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

export default function TeacherGradesPage() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/grades/courses')
      .then(({ data }) => setCourses(data))
      .catch(() => setCourses([]))
      .finally(() => setIsLoading(false))
  }, [])

  function handleEnterGrades(courseId) {
    navigate(`/teacher/grades/${courseId}`)
  }

  const totalGraded = courses.reduce((sum, c) => sum + c.gradingProgress.fullyGraded, 0)
  const totalStudents = courses.reduce((sum, c) => sum + c.gradingProgress.total, 0)
  const overallPct = totalStudents > 0 ? Math.round((totalGraded / totalStudents) * 100) : 0

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center px-10 py-8 mb-2">
          <div>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-1 font-headline">
              Grades
            </h1>
            <p className="text-on-surface-variant font-medium text-sm">
              Enter and manage student grades for the current semester
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                className="bg-surface-container-high border-0 rounded-xl pl-10 pr-4 py-2.5 w-56 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm outline-none"
                placeholder="Search courses..."
                type="text"
              />
            </div>
          </div>
        </header>

        <div className="px-10 pb-12 space-y-8">
          {/* Course Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl p-8 animate-pulse">
                  <div className="h-4 bg-surface-container-high rounded w-24 mb-4" />
                  <div className="h-7 bg-surface-container-high rounded w-3/4 mb-2" />
                  <div className="h-4 bg-surface-container-high rounded w-1/2 mb-8" />
                  <div className="h-2 bg-surface-container-high rounded-full mb-8" />
                  <div className="h-9 bg-surface-container-high rounded-full w-32" />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-24 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">grade</span>
              <p className="font-medium">No courses assigned to you yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnterGrades={() => handleEnterGrades(course.id)}
                />
              ))}
            </div>
          )}

          {/* Bottom Insights */}
          {!isLoading && courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
              {/* Semester Progress */}
              <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-8 flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <h4 className="text-xl font-bold text-on-surface mb-2 font-headline">
                    Overall Semester Progress
                  </h4>
                  <p className="text-on-surface-variant text-sm mb-6 max-w-md">
                    You have completed {overallPct}% of all grading responsibilities across {courses.length} course{courses.length !== 1 ? 's' : ''}.
                  </p>
                  <div className="flex gap-4">
                    <div className="text-center bg-surface-container-lowest px-4 py-3 rounded-xl min-w-[100px]">
                      <span className="block text-2xl font-black text-indigo-600">{totalGraded}</span>
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">Graded</span>
                    </div>
                    <div className="text-center bg-surface-container-lowest px-4 py-3 rounded-xl min-w-[100px]">
                      <span className="block text-2xl font-black text-slate-400">{totalStudents - totalGraded}</span>
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">Pending</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-10 top-0 h-full flex items-center opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-[200px]">analytics</span>
                </div>
              </div>

              {/* Deadline Card */}
              <div className="bg-primary-container rounded-2xl p-8 text-on-primary flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined mb-4 block">calendar_today</span>
                  <h4 className="text-lg font-bold mb-1 font-headline">Final Submission</h4>
                  <p className="text-indigo-200 text-sm">
                    All grades must be finalized before the semester end deadline.
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-indigo-400/30 flex items-center justify-between">
                  <span className="text-sm font-medium">{courses.length} Course{courses.length !== 1 ? 's' : ''}</span>
                  <span className="material-symbols-outlined text-sm">info</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function CourseCard({ course, onEnterGrades }) {
  const { gradingProgress, componentStatus } = course
  const progressWidth = `${gradingProgress.percentage}%`
  const isComplete = gradingProgress.percentage === 100

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 hover:shadow-[0_20px_40px_rgba(70,69,85,0.06)] transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="bg-indigo-50 text-indigo-600 font-mono text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
            {course.code}
          </span>
          <h3 className="text-2xl font-bold text-on-surface leading-tight font-headline">
            {course.name}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            {course.department?.name || 'No Department'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl flex-shrink-0 ml-4">
          <span className="material-symbols-outlined text-indigo-500 text-lg">group</span>
          <span className="text-sm font-semibold text-on-surface">{course.enrollmentCount} students</span>
        </div>
      </div>

      {/* Grading Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Grading Progress
          </span>
          <span className="text-sm font-bold text-indigo-600">
            {gradingProgress.fullyGraded} / {gradingProgress.total} fully graded
          </span>
        </div>
        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-primary-container'}`}
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      {/* Component Status & Action */}
      <div className="flex items-center justify-between pt-6 border-t border-outline-variant/15">
        <div className="flex gap-2">
          <ComponentPill label="Internal" done={componentStatus.INTERNAL} />
          <ComponentPill label="Mid-Term" done={componentStatus.MID_TERM} />
          <ComponentPill label="Final" done={componentStatus.FINAL} />
        </div>
        <button
          onClick={onEnterGrades}
          className="bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Enter Grades
        </button>
      </div>
    </div>
  )
}

function ComponentPill({ label, done }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {label}
    </span>
  )
}
