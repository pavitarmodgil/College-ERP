import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import api from '../../lib/api'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/users/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="ml-16 md:ml-64 flex-1">
        {/* Header */}
        <header className="sticky top-0 w-full flex justify-between items-center px-8 py-6 z-30 bg-slate-50/80 dark:bg-neutral-900/80 backdrop-blur-md">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold font-label">Management Console</p>
            <h2 className="text-4xl font-extrabold font-headline tracking-tight">Departments</h2>
          </div>
        </header>

        <div className="p-8 space-y-8">

          {/* Stat row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest rounded-2xl p-6">
              <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit mb-4">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
              </div>
              <p className="text-3xl font-bold font-headline">{departments.length}</p>
              <p className="text-sm text-on-surface-variant mt-1">Total departments</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-6">
              <div className="p-3 bg-secondary/10 rounded-xl text-secondary w-fit mb-4">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <p className="text-3xl font-bold font-headline">
                {departments.map(d => d.code).join(', ') || '—'}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">Department codes</p>
            </div>
            <div className="bg-primary-container text-on-primary rounded-2xl p-6">
              <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
                <span className="material-symbols-outlined">info</span>
              </div>
              <p className="font-bold font-headline text-lg mb-1">Note</p>
              <p className="text-sm text-white/80">
                Departments are created via the database. Contact the system administrator to add or remove departments.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 text-on-surface-variant">
                    <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider">#</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Department Name</th>
                    <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-on-surface-variant text-sm">Loading…</td>
                    </tr>
                  ) : departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-16 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">account_tree</span>
                        <p className="text-on-surface-variant text-sm">No departments found.</p>
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept, idx) => (
                      <tr
                        key={dept.id}
                        className={`transition-colors ${idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/30'}`}
                      >
                        <td className="px-8 py-5">
                          <span className="text-sm font-mono text-on-surface-variant">{idx + 1}</span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold text-on-surface">{dept.name}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                            {dept.code}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
