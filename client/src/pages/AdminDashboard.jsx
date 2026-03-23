import Sidebar from '../components/Sidebar'

export default function AdminDashboard() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome. Features coming in Phase 4.</p>
      </main>
    </div>
  )
}
