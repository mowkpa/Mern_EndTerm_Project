import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Clock,
  Calendar,
  Building2,
  Users as UsersIcon,
  Check,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import api from '../../api/axios';
import { socket } from '../../socket';
import { useToast } from '../../components/ui/Toast';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              Approvals
            </h1>
            <Badge variant="warning" size="sm">
              {approvals.length} Pending
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Review and decide on booking requests for restricted labs, seminar halls, and studios.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Panel key={i} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="w-32 h-5" />
                  <Skeleton className="w-48 h-4" />
                </div>
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <Skeleton className="w-full h-14 rounded-xl" />
              <div className="flex justify-end gap-2 pt-2">
                <Skeleton className="w-20 h-8 rounded-lg" />
                <Skeleton className="w-24 h-8 rounded-lg" />
              </div>
            </Panel>
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="All caught up!"
          description="There are currently no reservations waiting for administrative approval."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.map((b) => {
            const slotStartHour = `${String(b.slot).padStart(2, '0')}:00`;
            const slotEndHour = `${String(b.slot + 1).padStart(2, '0')}:00`;
            const isProcessing = actionLoadingId === b._id;

            return (
              <Panel
                key={b._id}
                className="p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  {/* Header: Room & Pending Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-ink">{b.room?.name}</h3>
                      <p className="text-xs text-text-2 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-text-3" />
                        {b.room?.building} • Capacity: {b.room?.capacity}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm">
                      Needs Review
                    </Badge>
                  </div>

                  {/* Requester Profile Strip */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-line flex items-center gap-3">
                    <Avatar name={b.user?.name} size="sm" />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-ink">
                        <span className="truncate">{b.user?.name}</span>
                        <span className="text-[10px] uppercase font-bold text-text-3 px-1.5 py-0.2 bg-white rounded border border-line">
                          {b.user?.role}
                        </span>
                      </div>
                      <p className="text-text-3 truncate mt-0.5">
                        {b.user?.email} • {b.user?.department || 'Campus Member'}
                      </p>
                    </div>
                  </div>

                  {/* Date, Time & Purpose */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface text-ink border border-line font-medium">
                      <Calendar className="w-3.5 h-3.5 text-text-3" />
                      {b.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface text-ink border border-line font-medium">
                      <Clock className="w-3.5 h-3.5 text-text-3" />
                      {slotStartHour} - {slotEndHour}
                    </span>
                  </div>

                  <div className="text-xs text-text-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-ink">Purpose: </span>
                    {b.purpose}
                  </div>
                </div>

                {/* Inline Action Buttons */}
                <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReject(b)}
                    disabled={isProcessing}
                    icon={X}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(b._id)}
                    loading={isProcessing}
                    icon={Check}
                  >
                    Approve
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Reservation Request"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-2 leading-relaxed">
            Specify an optional rejection reason. The requester will receive a notification and see
            this explanation on their dashboard.
          </p>

          <form onSubmit={handleConfirmReject} className="space-y-4">
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g., Scheduled maintenance or departmental seminar taking place at this time"
              maxLength={200}
              className="w-full text-xs rounded-xl border border-line p-3 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />

            <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                loading={actionLoadingId === selectedBookingForReject?._id}
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
