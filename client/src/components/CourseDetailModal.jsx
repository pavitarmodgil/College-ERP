import { useState, useEffect } from 'react'
import api from '../lib/api'

export default function CourseDetailModal({ courseId, onClose, onRefresh }) {
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // All teachers/students for dropdowns
  const [allTeachers, setAllTeachers] = useState([])
  const [allStudents, setAllStudents] = useState([])

  // Assign teacher
  const [teacherUserId, setTeacherUserId] = useState('')
  const [teacherError, setTeacherError] = useState('')
  const [teacherLoading, setTeacherLoading] = useState(false)

  // Enroll student
  const [studentUserId, setStudentUserId] = useState('')
  const [studentError, setStudentError] = useState('')
  const [studentLoading, setStudentLoading] = useState(false)

  async function fetchDetail() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/courses/${courseId}`)
      setCourse(data)
    } catch {
      setError('Failed to load course details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // Fetch all teachers and students in parallel for dropdowns
    api.get('/users', { params: { role: 'TEACHER', limit: 200 } })
      .then(({ data }) => setAllTeachers(data.data || []))
      .catch(() => {})
    api.get('/users', { params: { role: 'STUDENT', limit: 500 } })
      .then(({ data }) => setAllStudents(data.data || []))
      .catch(() => {})
  }, [courseId])

  async function handleAssignTeacher(e) {
    e.preventDefault()
    if (!teacherUserId) return
    setTeacherError('')
    setTeacherLoading(true)
    try {
      await api.post(`/courses/${courseId}/teachers`, { userId: parseInt(teacherUserId) })
      setTeacherUserId('')
      fetchDetail()
      onRefresh?.()
    } catch (err) {
      setTeacherError(err.response?.data?.error || 'Failed to assign teacher')
    } finally {
      setTeacherLoading(false)
    }
  }

  async function handleRemoveTeacher(userId) {
    try {
      await api.delete(`/courses/${courseId}/teachers/${userId}`)
      fetchDetail()
      onRefresh?.()
    } catch (err) {
      setTeacherError(err.response?.data?.error || 'Failed to remove teacher')
    }
  }

  async function handleEnrollStudent(e) {
    e.preventDefault()
    if (!studentUserId) return
    setStudentError('')
    setStudentLoading(true)
    try {
      await api.post(`/courses/${courseId}/enrollments`, { userId: parseInt(studentUserId) })
      setStudentUserId('')
      fetchDetail()
      onRefresh?.()
    } catch (err) {
      setStudentError(err.response?.data?.error || 'Failed to enroll student')
    } finally {
      setStudentLoading(false)
    }
  }

  async function handleRemoveStudent(userId) {
    try {
      await api.delete(`/courses/${courseId}/enrollments/${userId}`)
      fetchDetail()
      onRefresh?.()
    } catch (err) {
      setStudentError(err.response?.data?.error || 'Failed to remove student')
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // Filter out already-assigned teachers/students from dropdowns
  const assignedTeacherIds = new Set(course?.teachers?.map((t) => t.teacher.id) || [])
  const enrolledStudentIds = new Set(course?.enrollments?.map((e) => e.user.id) || [])

  const availableTeachers = allTeachers.filter((t) => !assignedTeacherIds.has(t.id))
  const availableStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10 flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold font-label">
              Course Detail
            </p>
            <h2 className="text-xl font-bold font-headline mt-0.5">
              {loading ? 'Loading…' : course?.name || 'Course'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-on-surface-variant text-sm">
            Loading…
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center py-16 text-error text-sm">
            {error}
          </div>
        ) : course ? (
          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">
            {/* Course Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Code', value: course.code },
                { label: 'Type', value: course.type.charAt(0) + course.type.slice(1).toLowerCase() },
                { label: 'Credits', value: course.credits },
                { label: 'Department', value: course.department?.code || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{label}</p>
                  <p className="font-bold text-on-surface font-mono text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Teachers */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-headline text-lg">Assigned Teachers</h3>
                <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full font-bold">
                  {course.teachers.length} assigned
                </span>
              </div>

              {course.teachers.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">No teachers assigned yet.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {course.teachers.map(({ teacher }) => (
                    <div key={teacher.id} className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold text-sm text-on-surface">{teacher.email}</p>
                        {teacher.teacherId && (
                          <p className="text-[10px] text-on-surface-variant font-mono">{teacher.teacherId}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveTeacher(teacher.id)}
                        className="p-1.5 hover:bg-error/10 text-error rounded-lg transition-colors"
                        title="Remove teacher"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Assign teacher — select dropdown */}
              <form onSubmit={handleAssignTeacher} className="flex gap-2">
                <select
                  value={teacherUserId}
                  onChange={(e) => setTeacherUserId(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
                >
                  <option value="">Select a teacher…</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.email}{t.teacherId ? ` (${t.teacherId})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={teacherLoading || !teacherUserId}
                  className="px-5 py-2.5 bg-primary-container text-on-primary font-bold rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60"
                >
                  {teacherLoading ? '…' : 'Assign'}
                </button>
              </form>
              {teacherError && (
                <p className="text-error text-xs mt-2 font-medium">{teacherError}</p>
              )}
            </section>

            {/* Students */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-headline text-lg">Enrolled Students</h3>
                <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full font-bold">
                  {course._count?.enrollments ?? course.enrollments.length} enrolled
                </span>
              </div>

              {course.enrollments.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">No students enrolled yet.</p>
              ) : (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {course.enrollments.map(({ user }) => (
                    <div key={user.id} className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold text-sm text-on-surface">{user.email}</p>
                        {user.studentId && (
                          <p className="text-[10px] text-on-surface-variant font-mono">{user.studentId}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(user.id)}
                        className="p-1.5 hover:bg-error/10 text-error rounded-lg transition-colors"
                        title="Remove student"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Enroll student — select dropdown */}
              <form onSubmit={handleEnrollStudent} className="flex gap-2">
                <select
                  value={studentUserId}
                  onChange={(e) => setStudentUserId(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
                >
                  <option value="">Select a student…</option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.email}{s.studentId ? ` (${s.studentId})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={studentLoading || !studentUserId}
                  className="px-5 py-2.5 bg-primary-container text-on-primary font-bold rounded-xl text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60"
                >
                  {studentLoading ? '…' : 'Enroll'}
                </button>
              </form>
              {studentError && (
                <p className="text-error text-xs mt-2 font-medium">{studentError}</p>
              )}
            </section>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-8 py-4 border-t border-outline-variant/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
