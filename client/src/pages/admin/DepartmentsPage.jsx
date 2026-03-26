import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

function DeptFormModal({ dept, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: dept?.name || '', code: dept?.code || '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
          <h2 className="text-xl font-bold font-headline">{dept ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-xl transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Department Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Computer Science & Engineering"
              className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">
              Code
            </label>
            <input
              name="code"
              value={form.code}
              onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              required
              placeholder="e.g. CSE"
              maxLength={10}
              className="w-full px-4 py-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary text-sm outline-none font-mono uppercase"
            />
          </div>
          {error && (
            <div className="text-error text-sm bg-error-container/30 px-4 py-3 rounded-xl">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high font-bold rounded-full hover:bg-surface-container transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-primary-container text-on-primary font-bold rounded-full disabled:opacity-60 text-sm"
            >
              {loading ? 'Saving…' : dept ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteModal({ dept, onClose, onConfirm, loading, error }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-8 py-6">
          <h2 className="text-xl font-bold font-headline mb-2">Delete Department</h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Are you sure you want to delete <span className="font-bold text-on-surface">{dept.name}</span>?
            This cannot be undone.
          </p>
          {error && (
            <div className="text-error text-sm bg-error-container/30 px-4 py-3 rounded-xl mb-4">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high font-bold rounded-full hover:bg-surface-container transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-error text-on-error font-bold rounded-full disabled:opacity-60 text-sm"
            >
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [targetDept, setTargetDept] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function fetchDepartments() {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get('/users/departments')
      setDepartments(data)
    } catch {
      setError('Failed to load departments')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchDepartments() }, [])

  async function handleCreate(form) {
    await api.post('/users/departments', form)
    setShowFormModal(false)
    fetchDepartments()
  }

  async function handleEdit(form) {
    await api.patch(`/users/departments/${editingDept.id}`, form)
    setShowFormModal(false)
    setEditingDept(null)
    fetchDepartments()
  }

  async function handleDelete() {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await api.delete(`/users/departments/${targetDept.id}`)
      setShowDeleteModal(false)
      setTargetDept(null)
      fetchDepartments()
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete department')
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalUsers = departments.reduce((s, d) => s + (d._count?.users || 0), 0)

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="ml-16 md:ml-64 min-h-screen flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-6 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div>
            <p className="text-primary font-bold tracking-widest text-[10px] uppercase font-label">
              Management Console
            </p>
            <h2 className="text-4xl font-extrabold font-headline tracking-tight">Departments</h2>
          </div>
          <button
            onClick={() => { setEditingDept(null); setShowFormModal(true) }}
            className="bg-primary-container text-on-primary px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Department
          </button>
        </header>

        <div className="p-8 lg:p-12 space-y-8">
          {/* Bento Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Total Departments</p>
                  <h3 className="text-3xl font-headline font-bold">{departments.length}</h3>
                </div>
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
              </div>
              <p className="text-[0.7rem] text-emerald-600 font-medium flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                Active institutional units
              </p>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-label uppercase tracking-widest text-slate-500 mb-1">Total Users</p>
                  <h3 className="text-3xl font-headline font-bold">{totalUsers}</h3>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </div>
              <p className="text-[0.7rem] text-slate-500 mt-2">Across all departments</p>
            </div>

            <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-2xl flex flex-col justify-between min-h-[140px] text-on-primary relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <h4 className="font-headline text-xl font-bold mb-2">Efficiency Drive</h4>
                <p className="text-sm text-indigo-100/80 max-w-[200px]">
                  Organize your institution by creating specialized departments.
                </p>
              </div>
              <div className="relative z-10">
                <button
                  onClick={() => { setEditingDept(null); setShowFormModal(true) }}
                  className="bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  Quick Setup
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 text-on-surface-variant">
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider">Department</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Code</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Users</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Courses</th>
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant text-sm">Loading…</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-error text-sm">{error}</td>
                    </tr>
                  ) : departments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                        No departments yet. Create one above.
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept, idx) => (
                      <tr
                        key={dept.id}
                        className={`hover:bg-slate-50/50 transition-colors group ${
                          idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/30'
                        }`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                              <span className="material-symbols-outlined text-sm">account_balance</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-sm">{dept.name}</p>
                              <p className="text-[10px] text-on-surface-variant">
                                Created {new Date(dept.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-[0.7rem] font-bold rounded-lg tracking-wider font-mono">
                            {dept.code}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                            <span className={`px-2 py-0.5 text-[0.65rem] font-bold rounded-full ${
                              (dept._count?.users || 0) > 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {dept._count?.users || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-slate-400">school</span>
                            <span className={`px-2 py-0.5 text-[0.65rem] font-bold rounded-full ${
                              (dept._count?.courses || 0) > 0
                                ? 'bg-primary-fixed text-primary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {dept._count?.courses || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingDept(dept); setShowFormModal(true) }}
                              className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => { setTargetDept(dept); setDeleteError(''); setShowDeleteModal(true) }}
                              className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && departments.length > 0 && (
              <div className="px-8 py-4 bg-surface-container-high/30 text-sm text-on-surface-variant">
                Showing {departments.length} department{departments.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </main>

      {showFormModal && (
        <DeptFormModal
          dept={editingDept}
          onClose={() => { setShowFormModal(false); setEditingDept(null) }}
          onSubmit={editingDept ? handleEdit : handleCreate}
        />
      )}

      {showDeleteModal && targetDept && (
        <DeleteModal
          dept={targetDept}
          loading={deleteLoading}
          error={deleteError}
          onClose={() => { setShowDeleteModal(false); setTargetDept(null); setDeleteError('') }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
