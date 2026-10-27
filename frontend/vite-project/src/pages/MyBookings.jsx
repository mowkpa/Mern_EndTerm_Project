import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  CalendarPlus,
  AlertCircle,
  XCircle,
  FileText,
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Countdown } from '../components/ui/Countdown';
import { SegmentedControl } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { formatSlotRange } from '../utils/time';

export default function MyBookings() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [scope, setScope] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Check-in State
  const [checkInLoadingId, setCheckInLoadingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings/mine', { params: { scope } });
      setBookings(res.data.bookings || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [scope, addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelClick = (booking) => {
    setSelectedBookingForCancel(booking);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBookingForCancel) return;
    try {
      setCancelLoading(true);
      await api.post(`/bookings/${selectedBookingForCancel._id}/cancel`);
      setCancelModalOpen(false);
      addToast('Booking cancelled successfully. Slot freed for campus.', 'success');
      fetchBookings();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      setCheckInLoadingId(bookingId);
      await api.post(`/bookings/${bookingId}/check-in`);
      addToast('Checked in successfully! Enjoy your space.', 'success');
      fetchBookings();
    } catch (err) {
      addToast(err.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckInLoadingId(null);
    }
  };

  const handleDownloadIcs = async (booking) => {
    try {
      const res = await api.get(`/bookings/${booking._id}/ics`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      const roomSlug = (booking.room?.name || 'room').toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.setAttribute('download', `slotsync-${roomSlug}-${booking.date}.ics`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('Calendar event downloaded (.ics)', 'success');
    } catch (err) {
      addToast('Failed to download calendar event', 'error');
    }
  };

  const isCheckInEligible = (booking) => {
    if (booking.status !== 'approved') return false;
    const now = new Date();
    const startsAt = new Date(booking.startsAt);
    const deadline = booking.checkInDeadline
      ? new Date(booking.checkInDeadline)
      : new Date(startsAt.getTime() + 15 * 60 * 1000);

    return now >= startsAt && now <= deadline;
  };

  // Date block parsing helper
  const getDateBlock = (dateStr) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const day = d;
      const weekday = dateObj.toLocaleString('en-US', { weekday: 'short' });
      return { day, month, weekday };
    } catch {
      return { day: '??', month: '---', weekday: '---' };
    }
  };

  // Past summary calculations
  const pastTotal = bookings.length;
  const pastNoShows = bookings.filter((b) => b.status === 'no_show').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            My bookings
          </h1>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Track reservations, confirm attendance during check-in, or add sessions to your calendar.
          </p>
        </div>

        <SegmentedControl
          tabs={[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past', label: 'Past history' },
          ]}
          activeTab={scope}
          onChange={setScope}
        />
      </div>

      {/* Past Summary Banner */}
      {scope === 'past' && !loading && bookings.length > 0 && (
        <div className="p-3 bg-paper rounded-panel border border-line flex items-center justify-between text-xs text-text-2">
          <span>
            <strong className="text-ink font-semibold">{pastTotal}</strong> past reservation{pastTotal > 1 ? 's' : ''} recorded.
          </span>
          {pastNoShows > 0 ? (
            <span className="text-danger font-semibold">
              {pastNoShows} missed ({pastNoShows === 1 ? 'no-show' : 'no-shows'})
            </span>
          ) : (
            <span className="text-free font-semibold">100% attendance rate</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-panel" />
          <Skeleton className="h-28 w-full rounded-panel" />
          <Skeleton className="h-28 w-full rounded-panel" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={scope === 'upcoming' ? 'Nothing booked yet' : 'No past bookings'}
          description={
            scope === 'upcoming'
              ? 'You do not have any upcoming room reservations. Browse the timetable board to reserve a space.'
              : 'Your booking history will appear here once sessions are completed, cancelled, or expired.'
          }
          actionLabel={scope === 'upcoming' ? 'Find a room' : undefined}
          onAction={scope === 'upcoming' ? () => navigate('/search') : undefined}
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const dateBlock = getDateBlock(booking.date);
            const timeLabel = formatSlotRange(booking.slot);
            const inCheckInWindow = isCheckInEligible(booking);
            const isCheckedIn = booking.status === 'checked_in';
            const isNoShow = booking.status === 'no_show';
            const isPending = booking.status === 'pending';
            const isRejected = booking.status === 'rejected';
            const canCancel =
              isPending ||
              (booking.status === 'approved' && new Date() < new Date(booking.startsAt));

            return (
              <div
                key={booking._id}
                className={`bg-surface rounded-panel p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  inCheckInWindow
                    ? 'border-line border-l-4 border-l-mine shadow-xs'
                    : isNoShow
                    ? 'border-danger/30 bg-danger-bg/20'
                    : 'border-line hover:border-text-2/30'
                }`}
              >
                {/* Left: Date Block & Room Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Date Block */}
                  <div className="w-16 h-16 rounded-control bg-paper border border-line flex flex-col items-center justify-center shrink-0 text-center select-none">
                    <span className="text-[10px] font-bold text-text-2 uppercase tracking-wider">
                      {dateBlock.month}
                    </span>
                    <span className="font-heading font-bold text-xl text-ink leading-tight tabular-nums">
                      {dateBlock.day}
                    </span>
                    <span className="text-[10px] text-text-2">{dateBlock.weekday}</span>
                  </div>

                  {/* Room & Booking Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-base text-ink truncate">
                        {booking.room?.name || 'Campus Room'}
                      </h3>
                      <StatusBadge status={booking.status} />
                      {booking.fromWaitlist && (
                        <Badge variant="mine" size="sm">
                          From waitlist
                        </Badge>
                      )}
                      {booking.batchId && (
                        <Badge variant="neutral" size="sm">
                          Multi-hour
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {booking.room?.building || 'Campus'}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-ink">
                        <Clock className="w-3.5 h-3.5" />
                        {timeLabel}
                      </span>
                    </div>

                    {booking.purpose && (
                      <p className="text-xs text-text-2 line-clamp-1">
                        <span className="font-medium text-ink">Purpose: </span>
                        {booking.purpose}
                      </p>
                    )}

                    {/* Rejection Note Strip */}
                    {isRejected && booking.decisionNote && (
                      <div className="mt-2 p-2.5 rounded-control bg-danger-bg border border-danger/20 text-xs text-danger flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Administrator decision note: </span>
                          <span>{booking.decisionNote}</span>
                        </div>
                      </div>
                    )}

                    {/* Pending admin review notice */}
                    {isPending && (
                      <p className="text-xs text-pending font-medium flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        Waiting for administrator approval
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Countdown, Check-in & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-line">
                  {/* Countdown for Upcoming Approved */}
                  {scope === 'upcoming' && booking.status === 'approved' && (
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-text-2 block font-medium">
                        {inCheckInWindow ? 'Check-in active' : 'Starts in'}
                      </span>
                      {inCheckInWindow ? (
                        <span className="text-xs font-bold text-mine">Check-in open</span>
                      ) : (
                        <Countdown
                          targetDate={booking.startsAt}
                          className="text-xs font-bold text-ink"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Add to Calendar (.ics download) */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadIcs(booking)}
                      title="Download .ics calendar event"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                      .ics
                    </Button>

                    {/* Check In Button */}
                    {booking.status === 'approved' && (
                      <Button
                        size="sm"
                        variant={inCheckInWindow ? 'primary' : 'secondary'}
                        disabled={!inCheckInWindow || checkInLoadingId === booking._id}
                        isLoading={checkInLoadingId === booking._id}
                        onClick={() => handleCheckIn(booking._id)}
                        title={
                          inCheckInWindow
                            ? 'Check in to confirm attendance'
                            : `Check-in opens at ${new Date(booking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {inCheckInWindow ? 'Check in' : 'Check-in locked'}
                      </Button>
                    )}

                    {/* Cancel Action */}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelClick(booking)}
                        className="text-danger hover:bg-danger-bg hover:text-danger"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel reservation"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-2 leading-relaxed">
            Are you sure you want to cancel your booking for{' '}
            <strong className="text-ink">
              {selectedBookingForCancel?.room?.name}
            </strong>{' '}
            on {selectedBookingForCancel?.date} (Slot {selectedBookingForCancel?.slot}:00)?
          </p>
          <p className="text-xs text-text-2 bg-paper p-3 rounded-control border border-line">
            The slot will immediately be released and automatically granted to the next student waiting in the waitlist queue.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelLoading}
            >
              Keep booking
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              isLoading={cancelLoading}
            >
              Yes, cancel booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
