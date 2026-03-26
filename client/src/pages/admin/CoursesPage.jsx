import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import CourseFormModal from '../../components/CourseFormModal'
import CourseDetailModal from '../../components/CourseDetailModal'
import DeactivateCourseModal from '../../components/DeactivateCourseModal'
import api from '../../lib/api'

const LIMIT = 5

const TYPE_STYLES = {
  MANDATORY: { pill: 'bg-primary/10 text-primary', label: 'Mandatory' },
  ELECTIVE:  { pill: 'bg-tertiary/10 text-tertiary', label: 'Elective' },
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [departments, setDepartments] = useState([])

  // Modals
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailCourse, setDetailCourse] = useState(null)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [targetCourse, setTargetCourse] = useState(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  const totalPages = Math.ceil(total / LIMIT)

  async function fetchCourses() {
    setIsLoading(true)
    setError('')
    try {
      const params = { page, limit: LIMIT }
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get('/courses', { params })
      setCourses(data.courses)
      setTotal(data.total)
    } catch {
      setError('Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchDepartments() {
    try {
      const { data } = await api.get('/users/departments')
      setDepartments(data)
    } catch {
      // non-fatal
    }
  }

  useEffect(() => { fetchCourses() }, [page, typeFilter])
  useEffect(() => { fetchDepartments() }, [])

  function handleFilterChange(type) {
    setTypeFilter(type)
    setPage(1)
  }

  async function handleCreate(formData) {
    await api.post('/courses', formData)
    setShowFormModal(false)
    fetchCourses()
  }

  async function handleEdit(formData) {
    await api.patch(`/courses/${editingCourse.id}`, formData)
    setShowFormModal(false)
    setEditingCourse(null)
    fetchCourses()
  }

  async function handleDeactivate() {
    setDeactivateLoading(true)
    setDeactivateError('')
    try {
      await api.patch(`/courses/${targetCourse.id}/deactivate`)
      setShowDeactivate(false)
      setTargetCourse(null)
      fetchCourses()
    } catch (err) {
      setDeactivateError(err.response?.data?.error || 'Failed to deactivate course')
    } finally {
      setDeactivateLoading(false)
    }
  }

  function openDetail(course) {
    setDetailCourse(course)
    setShowDetailModal(true)
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="ml-16 md:ml-64 min-h-screen flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-6 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-full max-w-md hidden lg:block">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full pl-12 pr-4 py-2.5 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm outline-none"
                placeholder="Search courses..."
                type="text"
              />
            </div>
            <nav className="flex gap-6">
              <span className="text-indigo-600 border-b-2 border-indigo-600 px-1 py-1 text-sm font-semibold">
                Overview
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-slate-50" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 lg:p-12 space-y-8">
          {/* Page Title + Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <p className="text-primary font-bold tracking-widest text-[10px] uppercase font-label">
                Management Console
              </p>
              <h2 className="text-4xl font-extrabold font-headline tracking-tight">Courses</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Type filter tabs */}
              <div className="bg-surface-container-low p-1 rounded-2xl flex gap-1">
                {['', 'MANDATORY', 'ELECTIVE'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange(type)}
                    className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${
                      typeFilter === type
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {type === '' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setEditingCourse(null); setShowFormModal(true) }}
                className="bg-primary-container text-on-primary px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add Course
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 text-on-surface-variant">
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider">Course</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Code</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Type</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Department</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Enrolled</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                        Loading…
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center text-error text-sm">
                        {error}
                      </td>
                    </tr>
                  ) : courses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    courses.map((c, idx) => {
                      const typeStyle = TYPE_STYLES[c.type] || TYPE_STYLES.ELECTIVE

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${
                            idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/30'
                          }`}
                          onClick={() => openDetail(c)}
                        >
                          {/* Course name */}
                          <td className="px-8 py-5">
                            <p className="font-bold text-on-surface leading-tight">{c.name}</p>
                          </td>

                          {/* Code */}
                          <td className="px-6 py-5">
                            <span className="font-mono text-sm bg-surface-container-high text-on-surface-variant px-2 py-1 rounded font-medium">
                              {c.code}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 ${typeStyle.pill} text-[10px] font-bold rounded-full uppercase tracking-wider`}>
                              {typeStyle.label}
                            </span>
                          </td>

                          {/* Credits */}
                          <td className="px-6 py-5">
                            <span className="text-sm font-semibold text-on-surface-variant">
                              {c.credits}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-6 py-5">
                            {c.department ? (
                              <span className="px-2 py-0.5 bg-surface-container-high rounded text-xs font-bold text-on-surface-variant">
                                {c.department.code}
                              </span>
                            ) : (
                              <span className="text-sm text-on-surface-variant">—</span>
                            )}
                          </td>

                          {/* Enrolled count */}
                          <td className="px-6 py-5">
                            <span className="text-sm font-semibold text-on-surface-variant">
                              {c._count?.enrollments ?? 0}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-5">
                            <div className={`flex items-center gap-2 text-xs font-bold ${c.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                              {c.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingCourse(c); setShowFormModal(true) }}
                                className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                title="Edit course"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {c.isActive && (
                                <button
                                  onClick={() => { setTargetCourse(c); setDeactivateError(''); setShowDeactivate(true) }}
                                  className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
                                  title="Deactivate course"
                                >
                                  <span className="material-symbols-outlined text-[18px]">block</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && total > 0 && (
              <div className="px-8 py-6 bg-surface-container-high/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-on-surface-variant">
                  Showing{' '}
                  <span className="font-bold text-on-surface">{(page - 1) * LIMIT + 1}</span>
                  {' '}to{' '}
                  <span className="font-bold text-on-surface">{Math.min(page * LIMIT, total)}</span>
                  {' '}of{' '}
                  <span className="font-bold text-on-surface">{total}</span> courses
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary disabled:opacity-40 transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                        p === page
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary disabled:opacity-40 transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded uppercase tracking-widest">
                  Catalog
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">Course Catalog</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                <span className="font-bold text-on-surface text-xl">{total}</span> courses in the system.
              </p>
            </div>

            <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-tertiary/10 rounded-xl text-tertiary">
                  <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded uppercase tracking-widest">
                  Types
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">Electives & Mandatory</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Filter by course type using the tabs above.
              </p>
            </div>

            <div className="p-6 bg-primary-container text-on-primary rounded-2xl shadow-lg shadow-indigo-600/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl text-white">
                  <span className="material-symbols-outlined">add_circle</span>
                </div>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">Add a Course</h3>
              <p className="text-sm text-white/80 leading-relaxed mb-4">
                Create new courses and assign them to departments and teachers.
              </p>
              <button
                onClick={() => { setEditingCourse(null); setShowFormModal(true) }}
                className="w-full py-2 bg-white text-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                New Course
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showFormModal && (
        <CourseFormModal
          course={editingCourse}
          departments={departments}
          onClose={() => { setShowFormModal(false); setEditingCourse(null) }}
          onSubmit={editingCourse ? handleEdit : handleCreate}
        />
      )}

      {showDetailModal && detailCourse && (
        <CourseDetailModal
          courseId={detailCourse.id}
          onClose={() => { setShowDetailModal(false); setDetailCourse(null) }}
          onRefresh={fetchCourses}
        />
      )}

      {showDeactivate && (
        <DeactivateCourseModal
          course={targetCourse}
          loading={deactivateLoading}
          error={deactivateError}
          onClose={() => { setShowDeactivate(false); setTargetCourse(null) }}
          onConfirm={handleDeactivate}
        />
      )}
    </div>
  )
}
