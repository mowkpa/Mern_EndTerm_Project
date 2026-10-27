import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
} from '../store/notificationSlice';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
    if (n.type.includes('approval')) {
      navigate('/admin/approvals');
    } else if (n.type.includes('waitlist')) {
      navigate('/waitlist');
    } else {
      navigate('/bookings');
    }
  };

  // Group notifications by Today and Earlier
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const todayItems = items.filter((n) => {
    const itemDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(n.createdAt));
    return itemDate === todayIST;
  });
  const earlierItems = items.filter((n) => {
    const itemDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(n.createdAt));
    return itemDate !== todayIST;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_approved':
        return <CheckCircle2 className="w-4 h-4 text-free" />;
      case 'booking_rejected':
      case 'booking_cancelled_by_admin':
      case 'no_show_released':
        return <XCircle className="w-4 h-4 text-danger" />;
      case 'waitlist_promoted':
        return <Sparkles className="w-4 h-4 text-mine" />;
      case 'approval_requested':
        return <ShieldAlert className="w-4 h-4 text-pending" />;
      case 'booking_reminder':
        return <Clock className="w-4 h-4 text-mine" />;
      default:
        return <Bell className="w-4 h-4 text-text-2" />;
    }
  };

  const renderNotificationGroup = (groupTitle, list) => {
    if (!list || list.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-2 px-1">
          {groupTitle}
        </h3>
        <div className="bg-surface rounded-panel border border-line divide-y divide-line overflow-hidden shadow-2xs">
          {list.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-paper/70 ${
                !notification.isRead ? 'bg-mine-bg/30' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-control bg-paper border border-line flex items-center justify-center shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-sm leading-relaxed ${
                      !notification.isRead ? 'font-bold text-ink' : 'text-text-2 font-normal'
                    }`}
                  >
                    {notification.message}
                  </p>
                  {!notification.isRead && (
                    <span className="w-2 h-2 rounded-full bg-mine shrink-0 mt-1.5" />
                  )}
                </div>
                <span className="text-[11px] text-text-2 block tabular-nums">
                  {new Date(notification.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {groupTitle === 'Earlier' && ` • ${new Date(notification.createdAt).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Real-time updates regarding reservations, admin decisions, waitlist promotions, and reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-panel" />
          <Skeleton className="h-16 w-full rounded-panel" />
          <Skeleton className="h-16 w-full rounded-panel" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You are fully caught up! Alerts regarding your bookings and waitlists will appear here."
          actionLabel="Find a room"
          onAction={() => navigate('/search')}
        />
      ) : (
        <div className="space-y-6">
          {renderNotificationGroup('Today', todayItems)}
          {renderNotificationGroup('Earlier', earlierItems)}
        </div>
      )}
    </div>
  );
}
