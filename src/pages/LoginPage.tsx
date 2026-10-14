import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError
      window.location.href = '/inbox'
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Avatar inspired by reference image */}
        <div className="relative inline-block mx-auto mb-2">
          <div className="w-12 h-12 rounded-full bg-[#1b2133] text-white flex items-center justify-center font-bold text-base tracking-tight shadow-xs mx-auto">
            DS
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a86b] border-2 border-[#eef2f6]" />
        </div>

        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
          Datastraw CX Assistant
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Sign in to your customer support workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-[#e2e8f0] rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs rounded-lg font-medium">
              {message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-[0.06em] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@company.com"
                className="w-full h-9 px-3 py-2 bg-[#f9fafb] border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-[0.06em] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 py-2 bg-[#f9fafb] border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] transition-all shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 px-4 py-2 bg-[#00a86b] hover:bg-[#00915c] disabled:bg-slate-200 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? 'Signing in...' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link
              to="/inbox"
              className="text-xs text-[#00a86b] hover:text-[#00915c] font-semibold"
            >
              ← Continue to Inbox Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
