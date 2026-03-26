import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

export default function StudentGradesPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/grades/my')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        {/* Header */}
        <header className="px-10 py-10 mb-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">
            My Grades
          </h1>
          <p className="text-on-surface-variant font-medium uppercase tracking-widest text-xs">
            Academic Performance Report
          </p>
        </header>

        <div className="px-10 pb-16 space-y-8">
          {isLoading ? (
            <LoadingSkeleton />
          ) : !data ? (
            <div className="text-center py-24 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">grade</span>
              <p className="font-medium">Could not load grades. Please try again.</p>
            </div>
          ) : (
            <>
              {/* GPA Summary Card */}
              <section>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-10 text-on-primary flex flex-col md:flex-row items-center justify-between">
                  <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col items-start gap-1">
                    <span className="text-7xl font-black tracking-tighter">
                      {data.gpa !== null ? data.gpa.toFixed(2) : '—'}
                    </span>
                    <span className="text-lg opacity-80 font-medium">
                      {data.gpa !== null ? 'Cumulative Grade Point Average' : 'GPA pending — no final grades yet'}
                    </span>
                  </div>
                  <div className="relative z-10 flex gap-8 mt-8 md:mt-0">
                    <StatPill value={data.totalCourses} label="Courses" />
                    <StatPill value={data.passedCourses} label="Passed" color="text-emerald-300" />
                    <StatPill value={data.pendingCourses} label="Pending" color="text-amber-300" />
                    {data.failedCourses > 0 && (
                      <StatPill value={data.failedCourses} label="Failed" color="text-red-300" />
                    )}
                  </div>
                </div>
              </section>

              {/* Course Grade Cards */}
              <div className="space-y-6">
                {data.courses.length === 0 ? (
                  <div className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">
                      menu_book
                    </span>
                    <p className="font-medium">You are not enrolled in any courses yet.</p>
                  </div>
                ) : (
                  data.courses.map((course) => (
                    <GradeCard key={course.courseId} course={course} />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatPill({ value, label, color = '' }) {
  return (
    <div className="flex flex-col items-center px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10">
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      <span className="text-xs uppercase tracking-widest font-bold opacity-70">{label}</span>
    </div>
  )
}

function statusBadge(status) {
  if (status === 'PASS') {
    return (
      <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest border border-emerald-100">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Pass
      </span>
    )
  }
  if (status === 'FAIL') {
    return (
      <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-widest border border-red-100">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Fail
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest border border-amber-100">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      Pending
    </span>
  )
}

function gradeBadgeColor(letterGrade) {
  if (!letterGrade) return 'bg-surface-variant text-on-surface-variant'
  if (['O', 'A+', 'A'].includes(letterGrade)) return 'bg-primary-fixed text-on-primary-fixed-variant'
  if (['B+', 'B'].includes(letterGrade)) return 'bg-primary-fixed text-on-primary-fixed-variant'
  if (['C', 'P'].includes(letterGrade)) return 'bg-primary-fixed text-on-primary-fixed-variant'
  return 'bg-error-container text-on-error-container'
}

function overallGradeColor(letterGrade) {
  if (!letterGrade) return 'bg-surface-container-high text-on-surface-variant'
  if (letterGrade === 'F') return 'bg-error text-on-error'
  return 'bg-primary text-on-primary'
}

function ComponentBox({ label, grade, isPending }) {
  return (
    <div className={`bg-surface-container-low rounded-xl p-6 border-0 ${isPending ? 'ring-2 ring-amber-500/20' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${isPending ? 'text-amber-700' : 'text-on-surface-variant'}`}>
          {label}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isPending ? 'bg-amber-100 text-amber-800' : gradeBadgeColor(grade?.letterGrade)}`}>
          {isPending ? 'N/A' : (grade?.letterGrade || '—')}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${isPending ? 'text-amber-400' : 'text-on-surface'}`}>
          {isPending ? '—' : (grade ? grade.marks : '—')}
        </span>
        <span className="text-on-surface-variant text-sm">/ 100</span>
      </div>
    </div>
  )
}

function GradeCard({ course }) {
  const { grades, passStatus } = course
  const isPending = passStatus === 'PENDING'
  const opacity = isPending ? 'opacity-100' : ''

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-8 border-0 transition-all hover:-translate-y-1">
      {/* Top Row */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {course.courseCode}
          </span>
          <div>
            <h3 className="text-2xl font-bold text-on-surface font-headline">{course.courseName}</h3>
            <p className="text-on-surface-variant text-sm font-medium">
              {course.department?.name || 'No Department'}
            </p>
          </div>
        </div>
        {statusBadge(passStatus)}
      </div>

      {/* Component Breakdown */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 ${isPending ? 'opacity-60' : ''}`}>
        <ComponentBox label="Internal" grade={grades.INTERNAL} isPending={false} />
        <ComponentBox label="Mid-Term" grade={grades.MID_TERM} isPending={false} />
        <ComponentBox
          label="Final Exam"
          grade={grades.FINAL}
          isPending={!grades.FINAL && passStatus === 'PENDING'}
        />
      </div>

      {/* Total Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pt-8 border-t border-dashed border-outline-variant/30">
        <div className="flex gap-8 mb-4 md:mb-0">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">
              Total Marks
            </span>
            <span className="text-xl font-bold text-on-surface">
              {course.averagePercentage !== null ? `${course.totalMarks}` : '—'}
              <span className="text-sm font-medium text-on-surface-variant"> / {300}</span>
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">
              Average
            </span>
            <span className="text-xl font-bold text-on-surface">
              {course.averagePercentage !== null ? `${course.averagePercentage}%` : '— %'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-on-surface-variant">Overall Grade</span>
          <span className={`px-6 py-3 rounded-xl text-xl font-black ${overallGradeColor(course.overallGrade)}`}>
            {course.overallGrade || '—'}
          </span>
        </div>
      </div>
    </article>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-surface-container-low h-40 animate-pulse" />
      {[1, 2].map((i) => (
        <div key={i} className="bg-surface-container-lowest rounded-2xl p-8 animate-pulse">
          <div className="h-6 bg-surface-container-high rounded w-2/3 mb-4" />
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="h-24 bg-surface-container-high rounded-xl" />
            <div className="h-24 bg-surface-container-high rounded-xl" />
            <div className="h-24 bg-surface-container-high rounded-xl" />
          </div>
          <div className="h-8 bg-surface-container-high rounded w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  )
}
