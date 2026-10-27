import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Calendar,
  Clock,
  Layers,
  CheckSquare,
  ShieldAlert,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { logout } from '../store/authSlice';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const navItemClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  const mobileNavItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link to={user ? '/search' : '/'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-700 to-primary-500 flex items-center justify-center text-white shadow-sm shadow-primary-500/20 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Slot<span className="text-primary-600">Sync</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink to="/search" className={navItemClass}>
                  <CalendarDays className="w-4 h-4" />
                  Find Rooms
                </NavLink>
                <NavLink to="/bookings" className={navItemClass}>
                  <Clock className="w-4 h-4" />
                  My Bookings
                </NavLink>
                <NavLink to="/waitlist" className={navItemClass}>
                  <Layers className="w-4 h-4" />
                  Waitlist
                </NavLink>

                {/* Admin Links */}
                {user.role === 'admin' && (
                  <div className="flex items-center gap-1 pl-2 ml-2 border-l border-slate-200">
                    <NavLink to="/admin/approvals" className={navItemClass}>
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                      Approvals
                    </NavLink>
                    <NavLink to="/admin/rooms" className={navItemClass}>
                      <Building2 className="w-4 h-4" />
                      Rooms
                    </NavLink>
                    <NavLink to="/admin/blackouts" className={navItemClass}>
                      <ShieldAlert className="w-4 h-4" />
                      Blackouts
                    </NavLink>
                    <NavLink to="/admin/users" className={navItemClass}>
                      <Users className="w-4 h-4" />
                      Users
                    </NavLink>
                    <NavLink to="/admin/analytics" className={navItemClass}>
                      <BarChart3 className="w-4 h-4 text-primary-600" />
                      Analytics
                    </NavLink>
                  </div>
                )}
              </nav>
            )}
          </div>

          {/* User actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <NotificationBell />

                <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-800 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary-600">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>

                {/* Mobile Hamburger toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  aria-label="Toggle Navigation"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-primary-600 px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1">
          <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {user.role}
            </span>
          </div>

          <NavLink
            to="/search"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavItemClass}
          >
            <CalendarDays className="w-4 h-4" />
            Find Rooms
          </NavLink>
          <NavLink
            to="/bookings"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavItemClass}
          >
            <Clock className="w-4 h-4" />
            My Bookings
          </NavLink>
          <NavLink
            to="/waitlist"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavItemClass}
          >
            <Layers className="w-4 h-4" />
            Waitlist
          </NavLink>

          {user.role === 'admin' && (
            <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 px-3">
                Admin Panel
              </span>
              <NavLink
                to="/admin/approvals"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavItemClass}
              >
                <CheckSquare className="w-4 h-4 text-amber-600" />
                Approvals Queue
              </NavLink>
              <NavLink
                to="/admin/rooms"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavItemClass}
              >
                <Building2 className="w-4 h-4" />
                Manage Rooms
              </NavLink>
              <NavLink
                to="/admin/blackouts"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavItemClass}
              >
                <ShieldAlert className="w-4 h-4" />
                Blackout Dates
              </NavLink>
              <NavLink
                to="/admin/users"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavItemClass}
              >
                <Users className="w-4 h-4" />
                Manage Users
              </NavLink>
              <NavLink
                to="/admin/analytics"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavItemClass}
              >
                <BarChart3 className="w-4 h-4 text-primary-600" />
                Analytics Dashboard
              </NavLink>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
