import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { registerUser } from '../store/authSlice';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import MiniBoard from '../components/MiniBoard';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Civil Engineering',
    'Business Administration',
    'Mathematics & Computing',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await dispatch(
        registerUser({
          name: name.trim(),
          email: email.trim(),
          department,
          password,
        })
      ).unwrap();
      addToast('Registration successful! Welcome to SlotSync.', 'success');
      navigate('/home');
    } catch (err) {
      setErrorMsg(err || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-paper">
      {/* Left Column (--ink) */}
      <div className="hidden lg:flex lg:col-span-5 bg-sidebar-bg border-r border-sidebar-border text-white p-10 xl:p-14 flex-col justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-mine flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-heading font-bold text-xl text-white">SlotSync</span>
        </NavLink>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-3xl text-white leading-tight">
              Join your campus booking network.
            </h2>
            <p className="text-sm text-slate-400">
              Create your student account to reserve study rooms, access project labs, and participate in waitlists.
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
              Create an account
            </h1>
            <p className="text-xs sm:text-sm text-text-2 mt-1">
              New accounts start as Student with 3 active daily booking slots.
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
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              autoFocus
            />

            <Input
              label="Campus Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya@campus.edu"
              required
            />

            <Select
              label="Academic Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={departments.map((d) => ({ label: d, value: d }))}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
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
              <p className="text-[11px] text-text-2">
                Must include letters, numbers, and symbols.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              isLoading={loading}
            >
              Create student account
            </Button>
          </form>

          <div className="text-center text-xs text-text-2">
            Already have an account?{' '}
            <NavLink to="/login" className="font-semibold text-mine hover:underline">
              Sign in
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
