import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import UserModal from '../../components/UserModal'
import DeactivateConfirmModal from '../../components/DeactivateConfirmModal'
import api from '../../lib/api'

const LIMIT = 20

// Derive display initials from email (e.g. "aman.kumar@uni.com" → "AK")
function getInitials(email) {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const ROLE_STYLES = {
  ADMIN:   { pill: 'bg-primary/10 text-primary', label: 'Admin' },
  TEACHER: { pill: 'bg-secondary/10 text-secondary', label: 'Teacher' },
  STUDENT: { pill: 'bg-tertiary/10 text-tertiary', label: 'Student' },
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-primary',
  'bg-orange-100 text-orange-600',
  'bg-purple-100 text-purple-600',
  'bg-emerald-100 text-emerald-600',
  'bg-rose-100 text-rose-600',
]

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [targetUser, setTargetUser] = useState(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const [departments, setDepartments] = useState([])

  const totalPages = Math.ceil(total / LIMIT)

  async function fetchUsers() {
    setIsLoading(true)
    setError('')
    try {
      const params = { page, limit: LIMIT }
      if (roleFilter) params.role = roleFilter
      const { data } = await api.get('/users', { params })
      setUsers(data.data)
      setTotal(data.total)
    } catch {
      setError('Failed to load users')
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

  useEffect(() => { fetchUsers() }, [page, roleFilter])
  useEffect(() => { fetchDepartments() }, [])

  function handleFilterChange(role) {
    setRoleFilter(role)
    setPage(1)
  }

  async function handleCreate(formData) {
    await api.post('/users', formData)
    setShowModal(false)
    fetchUsers()
  }

  async function handleEdit(formData) {
    await api.patch(`/users/${editingUser.id}`, formData)
    setShowModal(false)
    setEditingUser(null)
    fetchUsers()
  }

  async function handleDeactivate() {
    setDeactivateLoading(true)
    try {
      await api.patch(`/users/${targetUser.id}/deactivate`)
      setShowDeactivate(false)
      setTargetUser(null)
      fetchUsers()
    } catch {
      // error handled by modal
    } finally {
      setDeactivateLoading(false)
    }
  }

  async function handleResetPassword(userId) {
    try {
      await api.post(`/users/${userId}/reset-password`)
      alert('Temporary password sent to user email.')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password')
    }
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
                placeholder="Search academic records..."
                type="text"
              />
            </div>
            <nav className="flex gap-6">
              <span className="text-indigo-600 border-b-2 border-indigo-600 px-1 py-1 text-sm font-semibold">
                Overview
              </span>
              <span className="text-slate-500 hover:text-indigo-500 transition-all text-sm font-medium cursor-pointer">
                Reports
              </span>
              <span className="text-slate-500 hover:text-indigo-500 transition-all text-sm font-medium cursor-pointer">
                Settings
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
              <h2 className="text-4xl font-extrabold font-headline tracking-tight">Users</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Role filter tabs */}
              <div className="bg-surface-container-low p-1 rounded-2xl flex gap-1">
                {['', 'ADMIN', 'TEACHER', 'STUDENT'].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleFilterChange(role)}
                    className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${
                      roleFilter === role
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {role === '' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setEditingUser(null); setShowModal(true) }}
                className="bg-primary-container text-on-primary px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add User
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 text-on-surface-variant">
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider">User</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Role</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">ID</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Department</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                        Loading…
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-error text-sm">
                        {error}
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u, idx) => {
                      const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                      const roleStyle = ROLE_STYLES[u.role] || ROLE_STYLES.STUDENT
                      const displayId = u.studentId || u.teacherId || '—'

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/50 transition-colors group ${
                            idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/30'
                          }`}
                        >
                          {/* User */}
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-11 h-11 rounded-xl ${avatarColor} flex items-center justify-center font-bold text-sm`}>
                                {getInitials(u.email)}
                              </div>
                              <div>
                                <p className="font-bold text-on-surface leading-tight capitalize">
                                  {u.email.split('@')[0].replace(/[._-]/g, ' ')}
                                </p>
                                <p className="text-xs text-on-surface-variant">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 ${roleStyle.pill} text-[10px] font-bold rounded-full uppercase tracking-wider`}>
                              {roleStyle.label}
                            </span>
                          </td>

                          {/* ID */}
                          <td className="px-6 py-5">
                            <span className="font-mono text-sm text-on-surface-variant font-medium">
                              {displayId}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-6 py-5">
                            {u.department ? (
                              <span className="px-2 py-0.5 bg-surface-container-high rounded text-xs font-bold text-on-surface-variant">
                                {u.department.code}
                              </span>
                            ) : (
                              <span className="text-sm text-on-surface-variant">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-5">
                            <div className={`flex items-center gap-2 text-xs font-bold ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                              {u.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingUser(u); setShowModal(true) }}
                                className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                title="Edit user"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {u.isActive && (
                                <button
                                  onClick={() => { setTargetUser(u); setShowDeactivate(true) }}
                                  className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
                                  title="Deactivate user"
                                >
                                  <span className="material-symbols-outlined text-[18px]">person_off</span>
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
                  <span className="font-bold text-on-surface">{total}</span> users
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
                <div className="p-3 bg-indigo-50 rounded-xl text-primary">
                  <span className="material-symbols-outlined">security</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded uppercase tracking-widest">
                  Security
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">Access Control</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                System-wide RBAC is active and protecting all role-based routes.
              </p>
            </div>

            <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded uppercase tracking-widest">
                  Stats
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">Total Users</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                <span className="font-bold text-on-surface text-xl">{total}</span> users registered across all roles.
              </p>
            </div>

            <div className="p-6 bg-primary-container text-on-primary rounded-2xl shadow-lg shadow-indigo-600/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl text-white">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">Quick Invite</h3>
              <p className="text-sm text-white/80 leading-relaxed mb-4">
                Invite entire departments instantly via the Add User form.
              </p>
              <button
                onClick={() => { setEditingUser(null); setShowModal(true) }}
                className="w-full py-2 bg-white text-primary rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Add New User
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showModal && (
        <UserModal
          user={editingUser}
          departments={departments}
          onClose={() => { setShowModal(false); setEditingUser(null) }}
          onSubmit={editingUser ? handleEdit : handleCreate}
        />
      )}

      {showDeactivate && (
        <DeactivateConfirmModal
          user={targetUser}
          loading={deactivateLoading}
          onClose={() => { setShowDeactivate(false); setTargetUser(null) }}
          onConfirm={handleDeactivate}
        />
      )}
    </div>
  )
}
