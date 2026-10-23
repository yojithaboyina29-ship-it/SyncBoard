import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LayoutDashboard, Zap, ShieldCheck, RefreshCw, ArrowRight, Check } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && !isPasswordValid) {
      setError(
        'Password denied: Password must contain at least 8 characters, one capital letter (A-Z), one small letter (a-z), one number (0-9), and one special character (e.g. !@#$%^&*).'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-4">
          <LayoutDashboard className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          SyncBoard
        </h2>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
          Real-time collaborative project board with live synchronization, presence, and fractional indexing.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 sm:px-10">
          {/* Toggle Tab */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`flex-1 py-2 rounded-md transition ${
                isLogin
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`flex-1 py-2 rounded-md transition ${
                !isLogin
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {!isLogin && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-100"
              />

              {!isLogin && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasMinLength ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 inline-block rounded-full border border-slate-300 dark:border-slate-600" />}
                      8+ Characters
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasUpper ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 inline-block rounded-full border border-slate-300 dark:border-slate-600" />}
                      1 Capital Letter (A-Z)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasLower ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasLower ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 inline-block rounded-full border border-slate-300 dark:border-slate-600" />}
                      1 Small Letter (a-z)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 inline-block rounded-full border border-slate-300 dark:border-slate-600" />}
                      1 Number (0-9)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 sm:col-span-2 ${
                        hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasSpecial ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 inline-block rounded-full border border-slate-300 dark:border-slate-600" />}
                      1 Special Character (!@#$%^&*)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Workspace' : 'Get Started Free'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Highlights */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Real-time sync via WebSockets & Presence indicators</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>$O(1)$ Fractional Indexing card reordering</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Enforced Role-Based Access Control (Owner / Member / Viewer)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
