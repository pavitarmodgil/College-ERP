import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function AdminProfilePage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="ml-16 md:ml-64 flex-1 flex items-center justify-center p-12">
        <div className="bg-surface-container-lowest rounded-xl p-12 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              manage_accounts
            </span>
          </div>
          <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight mb-2">
            My Profile
          </h1>
          <p className="text-on-surface-variant text-sm mb-6">
            Profile management is coming in Phase 6.
          </p>
          <div className="bg-surface-container-low rounded-xl p-4 text-left space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email</p>
              <p className="text-sm font-semibold text-on-surface mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Role</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold rounded-full uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
