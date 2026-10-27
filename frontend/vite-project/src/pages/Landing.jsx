import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Github,
} from 'lucide-react';
import { loginUser } from '../store/authSlice';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import MiniBoard from '../components/MiniBoard';

export default function Landing() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { addToast } = useToast();

  // If already logged in, redirect to /home
  React.useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleDemoLogin = async (email, roleName) => {
    try {
      await dispatch(loginUser({ email, password: 'Demo@12345' })).unwrap();
      addToast(`Logged in as demo ${roleName}!`, 'success');
      navigate('/home');
    } catch (err) {
      addToast(err || 'Failed to sign in with demo account', 'error');
    }
  };

  const showDemo = import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false';

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mine-bg border border-mine/20 text-mine text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Campus Timetable & Room Booking</span>
            </div>

            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-ink tracking-tight leading-[1.1]">
              Book a campus room in 3 clicks.
            </h1>

            <p className="text-base sm:text-lg text-text-2 leading-relaxed max-w-xl">
              See what is free right now, get in line when it is not, and never
              lose a room to a no-show. Built for students, faculty, and campus
              administrators.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" onClick={() => navigate('/search')}>
                Find a room
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See how it works
              </Button>
            </div>
          </div>

          {/* Right Hero Column: Mini Timetable Board */}
          <div className="lg:col-span-6">
            <MiniBoard />
          </div>
        </div>
      </section>

      {/* How It Works (Numbered Sequence) */}
      <section id="how-it-works" className="border-t border-line bg-surface py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-left max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-mine">
              Sequence
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-ink mt-1">
              How it works
            </h2>
            <p className="text-sm text-text-2 mt-2">
              A clear, automated flow that eliminates manual spreadsheets and physical bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-panel bg-mine-bg text-mine flex items-center justify-center font-heading font-bold text-lg border border-mine/20">
                1
              </div>
              <h3 className="font-heading font-semibold text-lg text-ink">
                Search by time, size & equipment
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">
                Filter by date, 1-hour slot windows, room capacity, and specialized equipment like projectors, AC, or computers.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-panel bg-free-bg text-free flex items-center justify-center font-heading font-bold text-lg border border-free/20">
                2
              </div>
              <h3 className="font-heading font-semibold text-lg text-ink">
                Book instantly or request approval
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">
                Standard study spaces confirm immediately. Restricted labs route to an administrator queue with live decision updates.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-panel bg-pending-bg text-pending flex items-center justify-center font-heading font-bold text-lg border border-pending/20">
                3
              </div>
              <h3 className="font-heading font-semibold text-lg text-ink">
                Join waitlist, auto-promoted
              </h3>
              <p className="text-sm text-text-2 leading-relaxed">
                If a slot is occupied, line up in FIFO order. If the holder cancels or fails to check in within 15 minutes, you are booked automatically.
              </p>
            </div>
          </div>

          {/* 3 Core Guarantees */}
          <div className="border-t border-line pt-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-2 mb-4">
              Built to prevent the usual campus problems
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-ink font-medium">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-free shrink-0 mt-0.5" />
                <span>Zero double bookings via database engine partial unique compound index.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-free shrink-0 mt-0.5" />
                <span>Zero ghost bookings: rooms not checked in within 15 minutes release automatically.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-free shrink-0 mt-0.5" />
                <span>Clear approvals with full audit notes and instant Socket.IO notifications.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Accounts (Evaluator 1-Click Access) */}
      {showDemo && (
        <section className="border-t border-line bg-paper py-14">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <div>
              <span className="text-xs font-semibold text-text-2 uppercase tracking-wider">
                Evaluator Testing
              </span>
              <h2 className="font-heading font-bold text-2xl text-ink mt-1">
                Demo accounts (testing only)
              </h2>
              <p className="text-xs sm:text-sm text-text-2 mt-1">
                Click below to instantly sign in with pre-seeded demo accounts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@slotsync.demo', 'Admin')}
                className="p-4 bg-surface rounded-panel border border-line hover:border-mine/50 hover:bg-mine-bg/20 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Campus Admin</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-chip bg-danger-bg text-danger">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-text-2 mt-1.5">
                  Approvals queue, room CRUD, blackouts, and usage analytics.
                </p>
                <span className="text-xs font-semibold text-mine mt-3 inline-block group-hover:underline">
                  Sign in as Admin →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('faculty@slotsync.demo', 'Faculty')}
                className="p-4 bg-surface rounded-panel border border-line hover:border-mine/50 hover:bg-mine-bg/20 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Dr. Sarah Jenkins</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-chip bg-pending-bg text-pending">
                    Faculty
                  </span>
                </div>
                <p className="text-xs text-text-2 mt-1.5">
                  6 slots/day quota, priority reservations, lab bookings.
                </p>
                <span className="text-xs font-semibold text-mine mt-3 inline-block group-hover:underline">
                  Sign in as Faculty →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('student1@slotsync.demo', 'Student')}
                className="p-4 bg-surface rounded-panel border border-line hover:border-mine/50 hover:bg-mine-bg/20 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Aisha Patel</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-chip bg-free-bg text-free">
                    Student
                  </span>
                </div>
                <p className="text-xs text-text-2 mt-1.5">
                  3 slots/day quota, slot grid, waitlists, and check-in window.
                </p>
                <span className="text-xs font-semibold text-mine mt-3 inline-block group-hover:underline">
                  Sign in as Student →
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-line bg-surface py-8 px-4 sm:px-8 text-center text-xs text-text-2">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            SlotSync — Smart Campus Room & Lab Booking System (MERN End-Term Project)
          </div>
          <div className="flex items-center gap-4">
            <span className="text-text-2">Asia/Kolkata (IST)</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-ink transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
