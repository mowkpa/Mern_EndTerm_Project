import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  Building2,
  User,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/axios';
import { socket } from '../../socket';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

export default function Approvals() {
  const { addToast } = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBookingForReject, setSelectedBookingForReject] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/approvals');
      setApprovals(res.data.approvals || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch pending approvals', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchApprovals();

    // Listen for live approval requests / decisions
    const handleApprovalsChanged = () => {
      fetchApprovals();
    };

    socket.on('approvals:changed', handleApprovalsChanged);

    return () => {
      socket.off('approvals:changed', handleApprovalsChanged);
    };
  }, [fetchApprovals]);

  const handleApprove = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      await api.post(`/bookings/${bookingId}/approve`);
      addToast('Reservation approved successfully.', 'success');
      fetchApprovals();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to approve booking', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (booking) => {
    setSelectedBookingForReject(booking);
    setRejectNote('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedBookingForReject) return;
    try {
      setActionLoadingId(selectedBookingForReject._id);
      await api.post(`/bookings/${selectedBookingForReject._id}/reject`, {
        note: rejectNote.trim(),
      });
      setRejectModalOpen(false);
      addToast('Reservation rejected. Requester has been notified.', 'success');
      fetchApprovals();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject booking', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-amber-500" />
            Pending Approval Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review and decide on reservations for restricted labs and seminar halls.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full w-fit">
          {approvals.length} pending decision{approvals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Checking pending requests...</p>
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="All caught up!"
          description="There are no pending room reservations requiring administrative review at this time."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.map((b) => {
            const slotStartHour = `${String(b.slot).padStart(2, '0')}:00`;
            const slotEndHour = `${String(b.slot + 1).padStart(2, '0')}:00`;

            return (
              <div
                key={b._id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{b.room?.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {b.room?.building} • Capacity: {b.room?.capacity}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Pending
                    </span>
                  </div>

                  {/* Requester Profile */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {b.user?.name}
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        ({b.user?.role})
                      </span>
                    </div>
                    <p className="text-slate-500 pl-5">
                      {b.user?.email} • {b.user?.department || 'General Campus'}
                    </p>
                  </div>

                  {/* Date & Time */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {b.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {slotStartHour} - {slotEndHour}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Purpose: </span>
                    {b.purpose}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenReject(b)}
                    disabled={actionLoadingId === b._id}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(b._id)}
                    disabled={actionLoadingId === b._id}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {actionLoadingId === b._id ? (
                      <Spinner size="sm" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal with Note Input */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Reservation Request</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provide an optional explanation for rejecting this reservation. The requester will
              receive a notification containing this note.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Time conflict with departmental faculty seminar"
                maxLength={200}
                className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === selectedBookingForReject?._id}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
