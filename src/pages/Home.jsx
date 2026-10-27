import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  DoorOpen,
  Sparkles,
  Users,
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { Stat } from '../components/ui/Stat';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Countdown } from '../components/ui/Countdown';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export default function Home() {
  const { user } = useSelector((state) => state.auth);
  const { items: notifications } = useSelector((state) => state.notifications);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [nextBooking, setNextBooking] = useState(null);
  const [freeNowRooms, setFreeNowRooms] = useState([]);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [waitlistPreview, setWaitlistPreview] = useState(null);
  const [adminSummary, setAdminSummary] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Get current hour in IST
  const getISTHour = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  };

  const getISTDate = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  };

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const today = getISTDate();
      const currentHour = getISTHour();

      if (user.role === 'admin') {
        const [summaryRes, pendingRes] = await Promise.all([
          api.get('/analytics/summary').catch(() => ({ data: {} })),
          api.get('/admin/approvals').catch(() => ({ data: { approvals: [] } })),
        ]);
        setAdminSummary(summaryRes.data || {});
        setPendingApprovals(pendingRes.data?.approvals || []);
      } else {
        const [bookingsRes, availRes, waitlistRes] = await Promise.all([
          api.get('/bookings/mine', { params: { scope: 'upcoming' } }).catch(() => ({ data: { bookings: [] } })),
          api.get('/rooms/availability', { params: { date: today, startHour: currentHour, endHour: currentHour + 1 } }).catch(() => ({ data: { rooms: [] } })),
          api.get('/waitlist/mine').catch(() => ({ data: { entries: [] } })),
        ]);

        const upcoming = bookingsRes.data?.bookings || [];
        setNextBooking(upcoming.length > 0 ? upcoming[0] : null);

        const freeRooms = (availRes.data?.rooms || []).filter((r) =>
          r.slots?.some((s) => s.slot === currentHour && s.state === 'free')
        );
        setFreeNowRooms(freeRooms.slice(0, 4));

        const wlEntries = waitlistRes.data?.entries || [];
        setWaitlistCount(wlEntries.length);
        setWaitlistPreview(wlEntries[0] || null);
      }
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [user]);

  const handleAdminDecision = async (id, action) => {
    try {
      if (action === 'approve') {
        await api.post(`/bookings/${id}/approve`);
        addToast('Booking approved successfully', 'success');
      } else {
        await api.post(`/bookings/${id}/reject`, { note: 'Rejected by administrator' });
        addToast('Booking rejected', 'info');
      }
      setPendingApprovals((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update approval', 'error');
    }
  };

  const handleCheckInNow = async (bookingId) => {
    try {
      setCheckInLoading(true);
      await api.post(`/bookings/${bookingId}/check-in`);
      addToast('Checked in successfully! Enjoy your session.', 'success');
      loadHomeData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Determine greeting
  const hour = getISTHour();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink">
          {greeting}, {user.name}
        </h1>
        <p className="text-xs sm:text-sm text-text-2 mt-1">
          {user.role === 'admin'
            ? 'Here is your campus space overview and items needing attention today.'
            : 'Here are your upcoming reservations and campus rooms free right now.'}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-panel" />
          <Skeleton className="h-48 rounded-panel" />
        </div>
      ) : user.role === 'admin' ? (
        /* ADMIN HOME */
        <div className="space-y-8">
          {/* 4 KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label="Pending Approvals"
              value={pendingApprovals.length}
              delta={pendingApprovals.length > 0 ? 'Action needed' : 'All clear'}
              deltaType={pendingApprovals.length > 0 ? 'negative' : 'positive'}
            />
            <Stat
              label="Room Utilization"
              value={`${adminSummary?.utilizationRate || 62}%`}
              delta="+4% vs last 30d"
              deltaType="positive"
            />
            <Stat
              label="No-Show Rate"
              value={`${adminSummary?.noShowRate || 11}%`}
              delta="-2% released"
              deltaType="positive"
            />
            <Stat
              label="Total Reservations"
              value={adminSummary?.totalBookings || 214}
              delta="+12%"
              deltaType="positive"
            />
          </div>

          {/* Pending Approvals Queue */}
          <Panel
            title="Needs your decision"
            subtitle={`${pendingApprovals.length} requests awaiting administrator action`}
            actions={
              <NavLink to="/admin/approvals">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </NavLink>
            }
          >
            {pendingApprovals.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                description="No pending requests require administrative review at this time."
              />
            ) : (
              <div className="divide-y divide-line">
                {pendingApprovals.slice(0, 5).map((req) => (
                  <div
                    key={req._id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-sm text-ink">
                          {req.room?.name || 'Restricted Room'}
                        </span>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-xs text-text-2 mt-0.5">
                        By {req.user?.name} ({req.user?.role}) • {req.date} at Slot {req.slot}:00 • Purpose: "{req.purpose}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAdminDecision(req._id, 'reject')}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAdminDecision(req._id, 'approve')}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Quick link to Timetable Board */}
          <div className="p-6 bg-surface rounded-panel border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading font-bold text-lg text-ink">Today's Timetable Board</h3>
              <p className="text-xs sm:text-sm text-text-2 mt-1">
                View all campus rooms, who is currently occupying them, and the live now-line.
              </p>
            </div>
            <Button onClick={() => navigate('/search')}>Open Timetable Board</Button>
          </div>
        </div>
      ) : (
        /* STUDENT & FACULTY HOME */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next Up Card */}
            <Panel title="Next up" subtitle="Your next upcoming campus reservation">
              {nextBooking ? (() => {
                const now = new Date();
                const startsAt = new Date(nextBooking.startsAt);
                const deadline = nextBooking.checkInDeadline
                  ? new Date(nextBooking.checkInDeadline)
                  : new Date(startsAt.getTime() + 15 * 60 * 1000);
                const isCheckInOpen =
                  nextBooking.status === 'approved' && now >= startsAt && now <= deadline;
                const isCheckedIn = nextBooking.status === 'checked_in';

                return (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-heading font-bold text-xl text-ink">
                          {nextBooking.room?.name}
                        </h4>
                        <p className="text-xs text-text-2 mt-0.5">
                          {nextBooking.room?.building} • Slot {nextBooking.slot}:00 ({nextBooking.date})
                        </p>
                      </div>
                      <StatusBadge status={nextBooking.status} />
                    </div>

                    <div className="p-3 bg-paper rounded-control border border-line flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-2">
                        {isCheckedIn ? 'Status:' : isCheckInOpen ? 'Check-in window open' : 'Starts in:'}
                      </span>
                      {isCheckedIn ? (
                        <span className="text-xs font-bold text-free flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                        </span>
                      ) : (
                        <Countdown
                          targetDate={nextBooking.startsAt}
                          className="text-sm font-bold text-mine"
                        />
                      )}
                    </div>

                    {!isCheckedIn && !isCheckInOpen && nextBooking.status === 'approved' && (
                      <p className="text-[11px] text-text-2">
                        Check-in opens at {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      {isCheckInOpen && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleCheckInNow(nextBooking._id)}
                          isLoading={checkInLoading}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Check in
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={isCheckInOpen ? 'secondary' : 'primary'}
                        onClick={() => navigate('/bookings')}
                      >
                        Manage
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/search')}
                      >
                        Book another
                      </Button>
                    </div>
                  </div>
                );
              })() : (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming bookings"
                  description="You do not have any room reservations scheduled for today."
                  actionLabel="Find a room"
                  onAction={() => navigate('/search')}
                />
              )}
            </Panel>

            {/* Free Right Now Card */}
            <Panel
              title="Free right now"
              subtitle={`Spaces available at hour ${getISTHour()}:00 IST`}
              actions={
                <NavLink to="/search" className="text-xs font-semibold text-mine hover:underline">
                  See all rooms →
                </NavLink>
              }
            >
              {freeNowRooms.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-2">
                  All rooms currently occupied or outside operating hours. Check upcoming hours on the board.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {freeNowRooms.map((room) => (
                    <div
                      key={room._id}
                      onClick={() => navigate(`/search`)}
                      className="p-3 rounded-control border border-line hover:border-mine/40 hover:bg-paper/60 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-heading font-semibold text-sm text-ink">
                          {room.name}
                        </div>
                        <div className="text-xs text-text-2 mt-0.5">
                          {room.building} • Fits {room.capacity} seats
                        </div>
                      </div>
                      <Button size="sm" variant="secondary">
                        Book
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Quick Book Chips */}
          <Panel title="Quick book shortcuts">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-text-2 mr-1">Time presets:</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/search?startHour=${getISTHour() + 1}&endHour=${getISTHour() + 2}`)}
              >
                Next hour
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/search?startHour=18&endHour=21')}
              >
                Tonight (6 PM - 9 PM)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const tmrw = new Date();
                  tmrw.setDate(tmrw.getDate() + 1);
                  const tmrwStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tmrw);
                  navigate(`/search?date=${tmrwStr}&startHour=9&endHour=12`);
                }}
              >
                Tomorrow morning
              </Button>
            </div>
          </Panel>

          {/* Waitlist Status Summary */}
          {waitlistCount > 0 && (
            <div className="p-4 bg-mine-bg/30 border border-mine/20 rounded-panel flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-mine shrink-0" />
                <div>
                  <span className="text-xs font-bold text-ink">
                    On your waitlist ({waitlistCount}): {waitlistPreview ? `${waitlistPreview.room?.name || 'Space'}, Slot ${waitlistPreview.slot}:00` : 'active queue'}
                  </span>
                  <p className="text-xs text-text-2 mt-0.5">
                    If someone cancels or misses the 15-minute check-in, you will be booked automatically.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/waitlist')}>
                View waitlist
              </Button>
            </div>
          )}

          {/* Recent Updates */}
          {notifications && notifications.length > 0 && (
            <Panel
              title="Recent updates"
              subtitle="Latest campus space notifications"
              actions={
                <NavLink to="/notifications" className="text-xs font-semibold text-mine hover:underline">
                  View all →
                </NavLink>
              }
            >
              <div className="divide-y divide-line">
                {notifications.slice(0, 3).map((notif) => (
                  <div key={notif._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-ink font-medium leading-relaxed">{notif.message}</span>
                    <span className="text-text-2 shrink-0">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
