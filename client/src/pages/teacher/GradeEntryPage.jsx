import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

const COMPONENTS = ['INTERNAL', 'MID_TERM', 'FINAL']
const COMPONENT_LABELS = { INTERNAL: 'Internal', MID_TERM: 'Mid-Term', FINAL: 'Final' }

export default function GradeEntryPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeComponent, setActiveComponent] = useState('INTERNAL')
  const [savingId, setSavingId] = useState(null)
  const [localMarks, setLocalMarks] = useState({})
  const [bulkValue, setBulkValue] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')

  useEffect(() => {
    api.get(`/grades/${courseId}/students`)
      .then(({ data }) => {
        setStudents(data.students)
        // Pre-fill localMarks from existing grades
        const marks = {}
        data.students.forEach((s) => {
          COMPONENTS.forEach((comp) => {
            const g = s.grades[comp]
            marks[`${s.enrollmentId}-${comp}`] = g ? String(g.marks) : ''
          })
        })
        setLocalMarks(marks)
      })
      .catch(() => setStudents([]))
      .finally(() => setIsLoading(false))

    // Fetch course name from teacher courses list
    api.get('/grades/courses')
      .then(({ data }) => {
        const course = data.find((c) => String(c.id) === String(courseId))
        if (course) {
          setCourseName(course.name)
          setCourseCode(course.code)
        }
      })
      .catch(() => {})
  }, [courseId])

  const fullyGraded = students.filter((s) =>
    COMPONENTS.every((comp) => s.grades[comp] !== null)
  ).length

  async function handleSaveGrade(enrollmentId, component) {
    const key = `${enrollmentId}-${component}`
    const marks = parseFloat(localMarks[key])
    if (isNaN(marks) || marks < 0 || marks > 100) return

    setSavingId(key)
    try {
      const { data } = await api.post(
        `/grades/${courseId}/students/${enrollmentId}`,
        { component, marks }
      )
      setStudents((prev) =>
        prev.map((s) =>
          s.enrollmentId === enrollmentId
            ? {
                ...s,
                grades: {
                  ...s.grades,
                  [component]: { marks: data.marks, letterGrade: data.letterGrade },
                },
              }
            : s
        )
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleBulkApply() {
    const marks = parseFloat(bulkValue)
    if (isNaN(marks) || marks < 0 || marks > 100) return

    // Apply to all students who don't have this component graded yet
    const ungradedStudents = students.filter((s) => s.grades[activeComponent] === null)
    if (ungradedStudents.length === 0) return

    // Update localMarks for all ungraded
    const updated = { ...localMarks }
    ungradedStudents.forEach((s) => {
      updated[`${s.enrollmentId}-${activeComponent}`] = String(marks)
    })
    setLocalMarks(updated)

    // Save all in sequence
    for (const s of ungradedStudents) {
      setSavingId(`${s.enrollmentId}-${activeComponent}`)
      try {
        const { data } = await api.post(
          `/grades/${courseId}/students/${s.enrollmentId}`,
          { component: activeComponent, marks }
        )
        setStudents((prev) =>
          prev.map((st) =>
            st.enrollmentId === s.enrollmentId
              ? {
                  ...st,
                  grades: {
                    ...st.grades,
                    [activeComponent]: { marks: data.marks, letterGrade: data.letterGrade },
                  },
                }
              : st
          )
        )
      } catch {
        // continue with next student
      }
    }
    setSavingId(null)
    setBulkValue('')
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 ml-16 md:ml-64 overflow-y-auto">
        {/* Top Header */}
        <header className="flex justify-between items-center px-10 py-6 bg-surface/80 backdrop-blur-md sticky top-0 z-30 border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/grades')}
              className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-indigo-600 font-headline">
                {courseName || 'Loading…'}
              </h1>
              <p className="text-on-surface-variant text-sm font-medium">
                {courseCode ? `${courseCode} • Grade Entry` : 'Grade Entry'}
              </p>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs font-bold text-primary">
              {fullyGraded} / {students.length} fully graded
            </span>
            {students.length > 0 && (
              <div className="w-32 h-1.5 bg-surface-container-high rounded-full mt-1 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.round((fullyGraded / students.length) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </header>

        <div className="px-10 py-10 space-y-8">
          {/* Component Tab Switcher */}
          <nav className="flex space-x-8 border-b border-outline-variant/15">
            {COMPONENTS.map((comp) => (
              <button
                key={comp}
                onClick={() => setActiveComponent(comp)}
                className={`pb-4 px-2 font-bold text-xs tracking-[0.15em] uppercase transition-colors ${
                  activeComponent === comp
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-slate-500 hover:text-primary'
                }`}
              >
                {COMPONENT_LABELS[comp]}
              </button>
            ))}
          </nav>

          {/* Bulk Grade Entry */}
          <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 text-primary p-3 rounded-xl">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Bulk Grade Entry</h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Apply marks to all ungraded students for {COMPONENT_LABELS[activeComponent]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                className="bg-surface-container-high border-none rounded-xl px-4 py-3 w-32 focus:ring-2 focus:ring-primary text-center font-bold outline-none"
                placeholder="0–100"
                type="number"
                min="0"
                max="100"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              />
              <button
                onClick={handleBulkApply}
                disabled={savingId !== null}
                className="bg-primary text-on-primary font-bold px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all text-sm shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                Apply to All
              </button>
            </div>
          </section>

          {/* Marks Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl p-4 animate-pulse">
                  <div className="h-12 bg-surface-container-high rounded-lg" />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">
                group_off
              </span>
              <p className="font-medium">No students enrolled in this course.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <div className="col-span-5">Student Details</div>
                <div className="col-span-2">ID Number</div>
                <div className="col-span-3 text-center">Marks &amp; Grade</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {students.map((student) => (
                <StudentRow
                  key={student.enrollmentId}
                  student={student}
                  component={activeComponent}
                  localMark={localMarks[`${student.enrollmentId}-${activeComponent}`] ?? ''}
                  onMarkChange={(val) =>
                    setLocalMarks((prev) => ({
                      ...prev,
                      [`${student.enrollmentId}-${activeComponent}`]: val,
                    }))
                  }
                  onSave={() => handleSaveGrade(student.enrollmentId, activeComponent)}
                  isSaving={savingId === `${student.enrollmentId}-${activeComponent}`}
                />
              ))}
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="pt-6 flex justify-end items-center space-x-4 border-t border-outline-variant/15">
            <button
              onClick={() => navigate('/teacher/grades')}
              className="px-8 py-3 rounded-full font-bold text-slate-500 hover:bg-surface-container-high transition-all text-sm uppercase tracking-widest"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function gradeColor(letterGrade) {
  if (!letterGrade) return 'bg-slate-100 text-slate-400'
  if (['O', 'A+', 'A'].includes(letterGrade)) return 'bg-blue-100 text-blue-700'
  if (['B+', 'B'].includes(letterGrade)) return 'bg-amber-100 text-amber-700'
  if (['C', 'P'].includes(letterGrade)) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function StudentRow({ student, component, localMark, onMarkChange, onSave, isSaving }) {
  const existing = student.grades[component]
  const displayGrade = existing?.letterGrade || null
  const initials = student.email.slice(0, 2).toUpperCase()

  const inputRingClass = displayGrade === 'F'
    ? 'focus:ring-error'
    : 'focus:ring-primary'

  return (
    <div className="grid grid-cols-12 items-center bg-surface-container-lowest rounded-xl p-4 border border-transparent hover:border-indigo-100 transition-all hover:translate-x-0.5">
      {/* Student Info */}
      <div className="col-span-5 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-lg flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-on-surface truncate">
            {student.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
          <p className="text-xs text-on-surface-variant font-medium truncate">{student.email}</p>
        </div>
      </div>

      {/* Student ID */}
      <div className="col-span-2 font-mono text-sm text-on-surface-variant font-semibold">
        {student.studentId ? `#${student.studentId}` : '—'}
      </div>

      {/* Marks & Grade */}
      <div className="col-span-3 flex items-center justify-center space-x-3">
        <input
          className={`bg-surface-container-high border-none rounded-xl w-24 px-4 py-2.5 text-center font-bold focus:ring-2 ${inputRingClass} outline-none`}
          type="number"
          min="0"
          max="100"
          placeholder="0–100"
          value={localMark}
          onChange={(e) => onMarkChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave() }}
        />
        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${gradeColor(displayGrade)}`}>
          {displayGrade || '—'}
        </span>
      </div>

      {/* Save */}
      <div className="col-span-2 flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving || localMark === '' || isNaN(parseFloat(localMark))}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-40 ${
            displayGrade === 'F'
              ? 'text-error hover:bg-red-50'
              : 'text-primary hover:bg-indigo-50'
          }`}
        >
          {isSaving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
