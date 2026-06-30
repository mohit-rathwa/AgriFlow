import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Login() {
  const navigate = useNavigate()
  const setUser = useStore((state) => state.setUser)

  const handleGuestLogin = () => {
    localStorage.setItem('demoMode', 'true')
    setUser({
      id: 'demo-123',
      name: 'Demo Recruiter',
      email: 'recruiter@agriflow.com',
      provider: 'demo',
      provider_id: 'demo',
      avatar_url: '',
      role: 'admin',
      created_at: new Date().toISOString()
    })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-agri-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-agri-600/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-agri-500 to-emerald-600 shadow-2xl shadow-agri-500/30 mb-6">
            <span className="text-4xl">🌾</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Agri<span className="text-agri-400">Flow</span>
          </h1>
          <p className="mt-3 text-dark-400 text-lg">
            Supply Chain Intelligence Platform
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8 space-y-4">
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            Sign in to continue
          </h2>

          {/* Google */}
          <a
            href={`${API_URL}/api/auth/google`}
            className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>

          {/* GitHub */}
          <a
            href={`${API_URL}/api/auth/github`}
            className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-xl border border-dark-600/50 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </a>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700/50"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-dark-900 px-3 text-xs text-dark-500 font-medium">OR</span>
            </div>
          </div>

          <button
            onClick={handleGuestLogin}
            className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 font-medium rounded-xl border border-emerald-600/30 transition-all duration-300 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Demo Dashboard (Guest)
          </button>

          <div className="pt-4 border-t border-dark-700/50 mt-6">
            <p className="text-xs text-dark-500 text-center leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              AgriFlow uses OAuth for secure, password-free authentication.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-dark-500">
          Built for Indian Agricultural Markets · AGMARKNET Data
        </p>
      </div>
    </div>
  )
}
