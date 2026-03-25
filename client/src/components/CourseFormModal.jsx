import { useState, useEffect } from 'react'

export default function CourseFormModal({ course, departments, onClose, onSubmit }) {
  const isEdit = Boolean(course)

  const [form, setForm] = useState({
    name: course?.name || '',
    code: course?.code || '',
    type: course?.type || 'MANDATORY',
    credits: course?.credits ?? 3,
    departmentId: course?.departmentId || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold font-label">
              {isEdit ? 'Edit Course' : 'New Course'}
            </p>
            <h2 className="text-xl font-bold font-headline mt-0.5">
              {isEdit ? 'Update course details' : 'Add a course to the catalog'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Course Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Data Structures"
              className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm outline-none"
            />
          </div>

          {/* Code + Credits row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
                Course Code
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                placeholder="e.g. CS301"
                className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm font-mono outline-none uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
                Credits
              </label>
              <input
                name="credits"
                type="number"
                min="1"
                max="6"
                value={form.credits}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm outline-none"
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Course Type
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm outline-none appearance-none"
            >
              <option value="MANDATORY">Mandatory</option>
              <option value="ELECTIVE">Elective</option>
            </select>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Department
            </label>
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-sm outline-none appearance-none"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error bg-error-container/30 px-4 py-3 rounded-xl text-sm">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-primary-container text-on-primary font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? 'Saving…' : isEdit ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
