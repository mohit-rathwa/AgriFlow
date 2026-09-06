import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      if (user.role === 'farmer') navigate('/dashboard');
      else if (user.role === 'mandiAgent') navigate('/mandi');
      else if (user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">AF</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Sign in to AgriFlow</h1>
          <p className="text-sm text-slate-500 mt-1">Agricultural Intelligence Platform</p>
        </div>

        {/* Form */}
        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Sign In <FiArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Guest Login Option */}
          <div className="mt-6 flex items-center justify-between">
            <div className="w-full h-px bg-slate-800"></div>
            <span className="px-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Or</span>
            <div className="w-full h-px bg-slate-800"></div>
          </div>
          
          <button 
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                // Auto-login using the guest account
                const user = await login('guest@agriflow.com', 'guestpassword123');
                toast.success('Logged in as Guest');
                if (user.role === 'farmer') navigate('/dashboard');
                else if (user.role === 'mandiAgent') navigate('/mandi');
                else if (user.role === 'admin') navigate('/admin');
                else navigate('/');
              } catch (err) {
                toast.error('Guest account unavailable. Please register.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Explore Dashboard as Guest
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
