import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginUser } from '../store/authSlice';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import MiniBoard from '../components/MiniBoard';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await dispatch(loginUser({ email: email.trim(), password })).unwrap();
      addToast('Welcome back to SlotSync!', 'success');
      navigate('/home');
    } catch (err) {
      setErrorMsg(err || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@12345');
    try {
      setLoading(true);
      setErrorMsg(null);
      await dispatch(loginUser({ email: demoEmail, password: 'Demo@12345' })).unwrap();
      addToast('Logged in with demo credentials!', 'success');
      navigate('/home');
    } catch (err) {
      setErrorMsg(err || 'Failed to sign in with demo credentials');
    } finally {
      setLoading(false);
    }
  };

  const showDemo = import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false';

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-paper">
      {/* Left Column (--ink) */}
      <div className="hidden lg:flex lg:col-span-5 bg-ink text-white p-10 xl:p-14 flex-col justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-mine flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-heading font-bold text-xl text-white">SlotSync</span>
        </NavLink>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-3xl text-white leading-tight">
              A smarter way to book campus spaces.
            </h2>
            <p className="text-sm text-slate-400">
              Check live slots in Asia/Kolkata time, line up with automatic FIFO promotion, and avoid double bookings.
            </p>
          </div>
          <MiniBoard className="shadow-2xl" />
        </div>

        <div className="text-xs text-slate-500">
          SlotSync Campus Booking System • Asia/Kolkata (IST)
        </div>
      </div>

      {/* Right Column (Form) */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink">
              Sign in to SlotSync
            </h1>
            <p className="text-xs sm:text-sm text-text-2 mt-1">
              Enter your university email to access rooms and reservations.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-control bg-danger-bg border border-danger/30 text-danger text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Campus Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@slotsync.demo"
              required
              autoFocus
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-2">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-10 px-3 pr-10 text-sm text-ink bg-surface border border-line rounded-control focus:outline-hidden focus:border-mine focus:ring-1 focus:ring-mine"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              isLoading={loading}
            >
              Sign in
            </Button>
          </form>

          {/* Demo Logins */}
          {showDemo && (
            <div className="pt-4 border-t border-line space-y-2">
              <span className="text-[11px] font-semibold text-text-2 uppercase tracking-wide block text-center">
                Demo accounts (testing only)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDemoFill('admin@slotsync.demo')}
                >
                  Admin
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDemoFill('faculty@slotsync.demo')}
                >
                  Faculty
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDemoFill('student1@slotsync.demo')}
                >
                  Student
                </Button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-text-2">
            Don't have an account yet?{' '}
            <NavLink to="/register" className="font-semibold text-mine hover:underline">
              Create an account
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
