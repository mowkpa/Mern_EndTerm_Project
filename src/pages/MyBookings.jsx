import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function MyBookings() {
  const { addToast } = useToast();
  const [scope, setScope] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cancellation State
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
      addToast('Checked in successfully! Enjoy your session.', 'success');
      fetchBookings();
    } catch (err) {
      addToast(err.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckInLoadingId(null);
    }
  };

  // Helper to determine if current time is within check-in window
  const isCheckInEligible = (booking) => {
    if (booking.status !== 'approved') return false;
    const now = new Date();
    const startsAt = new Date(booking.startsAt);
    const deadline = new Date(booking.checkInDeadline);
    const earlyStart = new Date(startsAt.getTime() - 10 * 60 * 1000); // 10 min before

    return now >= earlyStart && now <= deadline;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Scope Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track active reservations, check in on arrival, or manage cancellations.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setScope('upcoming')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              scope === 'upcoming'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setScope('past')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              scope === 'past'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past History
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Loading your reservations...</p>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={scope === 'upcoming' ? 'No upcoming reservations' : 'No past reservations'}
          description={
            scope === 'upcoming'
              ? 'You do not have any active room bookings. Browse available spaces in the directory to reserve a slot.'
              : 'Your booking history will appear here once sessions are completed or expired.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((booking) => {
            const slotStartHour = `${String(booking.slot).padStart(2, '0')}:00`;
            const slotEndHour = `${String(booking.slot + 1).padStart(2, '0')}:00`;
            const eligibleForCheckIn = isCheckInEligible(booking);
            const canCancel =
              booking.status === 'pending' ||
              (booking.status === 'approved' && new Date() < new Date(booking.startsAt));

            return (
              <div
                key={booking._id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {booking.room?.name || 'Campus Room'}
                        </h3>
                        {booking.fromWaitlist && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            From Waitlist
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {booking.room?.building || 'Main Campus'}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  {/* Date & Time pills */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {booking.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {slotStartHour} - {slotEndHour}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                    <span className="font-semibold text-slate-700">Purpose: </span>
                    {booking.purpose}
                  </p>

                  {/* Rejection Note */}
                  {booking.status === 'rejected' && booking.decisionNote && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <span className="font-semibold">Rejection reason: </span>
                      {booking.decisionNote}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => handleCancelClick(booking)}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {booking.status === 'approved' ? 'Locked (slot started)' : ''}
                    </span>
                  )}

                  {booking.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(booking._id)}
                      disabled={!eligibleForCheckIn || checkInLoadingId === booking._id}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                        eligibleForCheckIn
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                      title={
                        eligibleForCheckIn
                          ? 'Check in to confirm attendance'
                          : 'Check-in opens 10 minutes before slot start'
                      }
                    >
                      {checkInLoadingId === booking._id && <Spinner size="sm" />}
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {eligibleForCheckIn ? 'Check In Now' : 'Check-In Window (10m prior)'}
                    </button>
                  )}

                  {booking.status === 'checked_in' && (
                    <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this booking? The slot will immediately be released and auto-assigned to the next student in the waitlist queue."
        confirmText="Confirm Cancellation"
        isDanger={true}
        isLoading={cancelLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}
