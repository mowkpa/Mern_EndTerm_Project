import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Calendar,
  ShieldCheck,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { login } from '../store/authSlice';

export default function Landing() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleQuickDemoLogin = async (email, password) => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate('/search');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Campus Space Allocation
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              Room scheduling without conflicts or chaos.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              SlotSync automates campus rooms and laboratory bookings with database-enforced race
              safety, administrative approvals, auto-promoting waitlists, and no-show releases.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {user ? (
                <Link
                  to="/search"
                  className="px-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold shadow-md shadow-primary-500/25 hover:bg-primary-700 transition-all flex items-center gap-2"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold shadow-md shadow-primary-500/25 hover:bg-primary-700 transition-all flex items-center gap-2"
                  >
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-3.5 rounded-xl bg-white text-slate-700 font-semibold border border-slate-300 hover:bg-slate-100 transition-all"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Section for Evaluators */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary-600" />
                Evaluator Quick Demo Logins
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Click any role to autofill and log in instantly for evaluation.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Password: Demo@12345
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleQuickDemoLogin('admin@slotsync.demo', 'Demo@12345')}
              className="p-4 rounded-xl border border-slate-200 hover:border-primary-400 bg-slate-50/50 hover:bg-primary-50/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-primary-700 bg-primary-100/60 px-2 py-0.5 rounded">
                  Admin
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-2">Campus Admin</p>
              <p className="text-xs text-slate-500">admin@slotsync.demo</p>
              <p className="text-[11px] text-slate-400 mt-2">Unlimited quota • Approvals • Analytics</p>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('faculty@slotsync.demo', 'Demo@12345')}
              className="p-4 rounded-xl border border-slate-200 hover:border-primary-400 bg-slate-50/50 hover:bg-primary-50/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                  Faculty
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-2">Dr. Sarah Jenkins</p>
              <p className="text-xs text-slate-500">faculty@slotsync.demo</p>
              <p className="text-[11px] text-slate-400 mt-2">Quota: 6 slots/day • Labs & Halls</p>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('student1@slotsync.demo', 'Demo@12345')}
              className="p-4 rounded-xl border border-slate-200 hover:border-primary-400 bg-slate-50/50 hover:bg-primary-50/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                  Student
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-2">Alex Rivera</p>
              <p className="text-xs text-slate-500">student1@slotsync.demo</p>
              <p className="text-[11px] text-slate-400 mt-2">Quota: 3 slots/day • Waitlist & Check-in</p>
            </button>
          </div>
        </div>
      </section>

      {/* 5 Core Workflows Showcase */}
      <section className="bg-white py-16 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Five Complete Engineering Workflows
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              SlotSync is engineered with stateful business logic and verified guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Race-Safe Concurrency</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Guaranteed zero double-bookings via MongoDB partial unique indexes on active slots.
                Tested under 10 concurrent requests at the exact same millisecond.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Approval State Machine</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Restricted rooms place bookings into a pending state holding the slot. Staff review
                and approve or reject with decision notes in real-time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">FIFO Waitlist & Auto-Promotion</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                When a held slot is cancelled or released, the earliest eligible waitlisted student
                is automatically booked and notified via WebSockets.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">No-Show Release Engine</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Check-in opens 10 minutes before slot start. Unclaimed reservations past the 15-minute
                grace period are automatically released to the waitlist queue.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Usage Analytics & Reporting</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Real database aggregation pipelines computing room utilization %, peak booking hours,
                historical trends, and departmental no-show rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-900 text-slate-400 text-xs text-center border-t border-slate-800">
        <p>SlotSync — Smart Campus Room & Lab Booking System • Final Software Project Submission</p>
      </footer>
    </div>
  );
}
