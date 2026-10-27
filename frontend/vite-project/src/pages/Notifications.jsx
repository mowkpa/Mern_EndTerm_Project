import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
} from '../store/notificationSlice';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function Notifications() {
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead());
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      dispatch(markSingleNotificationRead(n._id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Real-time updates regarding your reservations, approvals, waitlist promotions, and
            grace period warnings.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors border border-primary-200 shadow-2xs"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Loading notifications...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You are fully caught up! Alerts regarding your bookings will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {items.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                !notification.isRead ? 'bg-primary-50/25' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  !notification.isRead
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm leading-relaxed ${
                      !notification.isRead
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-600'
                    }`}
                  >
                    {notification.message}
                  </p>
                  {!notification.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {new Date(notification.createdAt).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
