import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (username) => {
    setError(null);
    setLoading(true);
    try {
      await login(username, 'password123');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed. Please ensure seed script has run.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-brand-500/25">
            <Flame className="w-7 h-7 fill-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Log in to PaceTrack</h1>
          <p className="text-xs text-slate-400">Track activities, compete on segments, and connect with athletes.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email or Username</label>
            <input
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="alex_runner or alex@pacetrack.dev"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm py-3 rounded-xl shadow-md shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* 1-Click Demo Login Shortcuts */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
            Instant 1-Click Demo Athlete Login
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('alex_runner')}
              className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-left transition-colors"
            >
              <div className="font-bold text-slate-900 text-xs">🏃 Alex Rivera</div>
              <div className="text-[10px] text-slate-500">Marathon Runner</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('sarah_cyclist')}
              className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-left transition-colors"
            >
              <div className="font-bold text-slate-900 text-xs">🚴 Sarah Chen</div>
              <div className="text-[10px] text-slate-500">Road Cyclist</div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-600 hover:underline">
            Sign up now
          </Link>
        </div>
      </div>
    </div>
  );
}
