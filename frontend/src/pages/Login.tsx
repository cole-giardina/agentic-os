import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { session, loading } = useAuth()

  if (!loading && session) return <Navigate to="/" replace />

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 p-8 text-center">
        <h1 className="mb-6 text-2xl font-semibold">Agentic OS</h1>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
