import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function Layout() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Agentic OS</span>
          <NavLink to="/" className={navLinkClass} end>
            Today
          </NavLink>
          <NavLink to="/tasks" className={navLinkClass}>
            Tasks
          </NavLink>
          <NavLink to="/activity" className={navLinkClass}>
            Activity
          </NavLink>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{session?.user.email}</span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-md px-3 py-1.5 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
