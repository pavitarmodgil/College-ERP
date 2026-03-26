import { useState, useEffect } from 'react'

export default function UserModal({ user, departments, onClose, onSubmit }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    email: user?.email || '',
    password: '',
    role: user?.role || 'STUDENT',
    departmentId: user?.department?.id || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    title: user?.title || '',
  })
  // For edit mode, track whether admin wants to change the password
  const [changePassword, setChangePassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isEdit && form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const payload = {
        email: form.email,
        role: form.role,
        departmentId: form.departmentId || null,
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        title: form.title || null,
      }
      if (!isEdit) {
        payload.password = form.password
      } else if (changePassword && form.password) {
        payload.password = form.password
      }
      await onSubmit(payload)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-container-high flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary font-headline">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {/* Title + First Name + Last Name */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
                Title
              </label>
              <select
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface outline-none"
              >
                <option value="">None</option>
                <option value="Mr">Mr</option>
                <option value="Ms">Ms</option>
                <option value="Mrs">Mrs</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
                First Name
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Aman"
                className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
                Last Name
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Kumar"
                className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="user@university.edu"
              className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface placeholder-on-surface-variant/50 outline-none"
            />
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={isEdit}
                className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface disabled:opacity-60 outline-none"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
                Department
              </label>
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface outline-none"
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password field */}
          {isEdit ? (
            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setChangePassword((v) => !v); setForm((p) => ({ ...p, password: '' })) }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {changePassword ? 'Cancel change' : 'Change password'}
                </button>
              </div>
              {changePassword ? (
                <div className="relative flex items-center">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="New password (min 8 chars)"
                    className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface placeholder-on-surface-variant/50 outline-none pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="bg-surface-container-high rounded-lg py-3 px-4 text-on-surface-variant text-sm tracking-widest">
                  ••••••••
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 ml-1">
                Temporary Password
              </label>
              <div className="relative flex items-center">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-high border-0 rounded-lg py-3 px-4 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all text-on-surface placeholder-on-surface-variant/50 outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-on-surface-variant/70 italic px-1">
                User will be prompted to reset password upon first login.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-error font-medium px-1">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-outline-variant text-on-surface-variant font-medium text-sm hover:bg-surface-container-low hover:text-on-surface transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-bold text-sm shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
