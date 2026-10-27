import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { login, clearError } from '../store/authSlice';
import Spinner from '../components/Spinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, actionLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());
    if (user) {
      const from = location.state?.from?.pathname || '/search';
      navigate(from, { replace: true });
    }
  }, [user, navigate, dispatch, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(login({ email, password }));
  };

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@12345');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in with your campus account credentials</p>
        </div>

        {/* Evaluator Quick Autofill Bar */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold text-slate-600 mb-2">Autofill Demo Account:</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleFillDemo('admin@slotsync.demo')}
              className="text-xs px-2.5 py-1 bg-white hover:bg-primary-50 hover:text-primary-600 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('faculty@slotsync.demo')}
              className="text-xs px-2.5 py-1 bg-white hover:bg-primary-50 hover:text-primary-600 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Faculty
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('student1@slotsync.demo')}
              className="text-xs px-2.5 py-1 bg-white hover:bg-primary-50 hover:text-primary-600 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors shadow-2xs"
            >
              Student
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@slotsync.demo"
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading || !email || !password}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {actionLoading ? <Spinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
