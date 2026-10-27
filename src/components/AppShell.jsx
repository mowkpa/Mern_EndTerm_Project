import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home,
  Calendar,
  Bookmark,
  Clock,
  ShieldCheck,
  DoorOpen,
  CalendarOff,
  Users,
  BarChart3,
  Activity,
  Bell,
  LogOut,
  Menu,
  X,
  MoreHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { logoutUser } from '../store/authSlice';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
  addRealtimeNotification,
} from '../store/notificationSlice';
import { socket } from '../socket';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Popover } from './ui/Popover';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';

export const AppShell = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const { items: notifications, unreadCount } = useSelector((state) => state.notifications);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Load notifications and listen to socket events
  useEffect(() => {
    if (user) {
      dispatch(fetchNotifications());

      const handleNewNotification = (notif) => {
        dispatch(addRealtimeNotification(notif));
      };

      const handleApprovalsChanged = (data) => {
        if (data?.pendingCount !== undefined) {
          setPendingApprovalsCount(data.pendingCount);
        }
      };

      socket.on('notification:new', handleNewNotification);
      socket.on('approvals:changed', handleApprovalsChanged);

      return () => {
        socket.off('notification:new', handleNewNotification);
        socket.off('approvals:changed', handleApprovalsChanged);
      };
    }
  }, [user, dispatch]);

  const handleSignOut = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Find a room', path: '/search', icon: Calendar },
    { label: 'My bookings', path: '/bookings', icon: Bookmark },
    { label: 'Waitlist', path: '/waitlist', icon: Clock },
  ];

  const adminNavItems = [
    {
      label: 'Approvals',
      path: '/admin/approvals',
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
    },
    { label: 'Rooms', path: '/admin/rooms', icon: DoorOpen },
    { label: 'Blackouts', path: '/admin/blackouts', icon: CalendarOff },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  ];

  // If public route or unauthenticated
  const isAuthPage = ['/', '/login', '/register'].includes(location.pathname);
  if (!user || isAuthPage) {
    return (
      <div className="min-h-screen bg-paper flex flex-col text-ink font-body">
        {/* Simple Public Top Nav */}
        <header className="h-16 border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-control bg-mine flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-ink">
              SlotSync
            </span>
          </NavLink>
          <div className="flex items-center gap-3">
            {user ? (
              <Button size="sm" onClick={() => navigate('/home')}>
                Dashboard
              </Button>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-text-2 hover:text-ink px-3 py-2 transition-colors"
                >
                  Sign in
                </NavLink>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex text-ink font-body">
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden sm:flex flex-col w-16 lg:w-[232px] shrink-0 bg-ink text-white select-none sticky top-0 h-screen z-30 transition-all duration-200">
        {/* Brand Header */}
        <div className="h-16 px-4 lg:px-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-control bg-mine flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
            S
          </div>
          <span className="hidden lg:block font-heading font-bold text-lg tracking-tight text-white">
            SlotSync
          </span>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-2 lg:px-3 py-4 space-y-6">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-control text-xs lg:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-mine text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Admin Group */}
          {user.role === 'admin' && (
            <div className="pt-3 border-t border-white/10 space-y-1">
              <span className="hidden lg:block px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Admin
              </span>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-control text-xs lg:text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-mine text-white shadow-xs font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-danger text-white tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={user.name} size="sm" />
            <div className="hidden lg:block min-w-0">
              <div className="text-xs font-semibold text-white truncate leading-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {user.role}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-8 h-8 rounded-control flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="sm:hidden font-heading font-bold text-base text-ink">
              SlotSync
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-text-2">
              Asia/Kolkata (IST)
            </span>
          </div>

          {/* Right Header: Notification Popover & Avatar */}
          <div className="flex items-center gap-3">
            {/* Notification Bell Popover */}
            <Popover
              width="w-84 sm:w-96"
              trigger={
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative w-9 h-9 rounded-control border border-line flex items-center justify-center text-text-2 hover:text-ink hover:bg-paper transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-surface animate-pulse" />
                  )}
                </button>
              }
            >
              {({ close }) => (
                <div className="divide-y divide-line">
                  <div className="px-4 py-3 flex items-center justify-between bg-paper/50">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-sm text-ink">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-danger text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => dispatch(markAllNotificationsRead())}
                        className="text-xs text-mine font-semibold hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* List of latest 6 */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-line/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-text-2">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => {
                            if (!notif.isRead) {
                              dispatch(markSingleNotificationRead(notif._id));
                            }
                            close();
                            if (notif.type.includes('approval')) {
                              navigate('/admin/approvals');
                            } else if (notif.type.includes('waitlist')) {
                              navigate('/bookings');
                            } else {
                              navigate('/bookings');
                            }
                          }}
                          className={`p-3 text-xs flex items-start gap-2.5 cursor-pointer hover:bg-paper transition-colors ${
                            notif.isRead ? 'opacity-70' : 'bg-mine-bg/30 font-medium'
                          }`}
                        >
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-mine shrink-0 mt-1.5" />
                          )}
                          <p className="flex-1 text-ink leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 text-center bg-paper/50">
                    <NavLink
                      to="/notifications"
                      onClick={close}
                      className="text-xs font-semibold text-mine hover:underline block"
                    >
                      View all notifications
                    </NavLink>
                  </div>
                </div>
              )}
            </Popover>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-line">
              <Avatar name={user.name} size="sm" />
              <span className="text-xs font-semibold text-ink truncate max-w-[120px]">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-16 sm:pb-8">{children}</main>

        {/* Mobile Bottom Tab Bar (<640px) */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface border-t border-line z-40 flex items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-mine font-bold' : 'text-text-2 hover:text-ink'
                  }`
                }
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium text-text-2 hover:text-ink"
          >
            <MoreHorizontal className="w-4 h-4 mb-0.5" />
            <span>More</span>
          </button>
        </nav>

        {/* Mobile More Drawer */}
        <Drawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          title="Account & Navigation"
          subtitle={user.email}
          footer={
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setMobileDrawerOpen(false);
                handleSignOut();
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          }
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-paper rounded-control border border-line">
              <Avatar name={user.name} size="md" />
              <div>
                <div className="text-sm font-bold text-ink">{user.name}</div>
                <div className="text-xs text-text-2 capitalize">
                  {user.role} • {user.department || 'Campus Member'}
                </div>
              </div>
            </div>

            {user.role === 'admin' && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-text-2 uppercase tracking-wide block mb-2">
                  Admin Management
                </span>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-control text-sm font-medium text-ink hover:bg-paper border border-transparent hover:border-line"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-text-2" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-danger text-white">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-line space-y-1">
              <NavLink
                to="/notifications"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-control text-sm font-medium text-ink hover:bg-paper"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-text-2" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="danger" size="sm">{unreadCount} unread</Badge>
                )}
              </NavLink>
            </div>
          </div>
        </Drawer>
      </div>
    </div>
  );
};

export default AppShell;
