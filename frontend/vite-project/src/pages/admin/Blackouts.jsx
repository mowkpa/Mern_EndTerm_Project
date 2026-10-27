import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarOff,
  Plus,
  Trash2,
  Calendar,
  Building2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

function groupBlackoutsByMonth(blackouts) {
  const groups = {};
  blackouts.forEach((b) => {
    // b.date is YYYY-MM-DD
    const dateObj = new Date(b.date + 'T00:00:00');
    const monthKey = isNaN(dateObj.getTime())
      ? 'Upcoming'
      : dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(b);
  });
  return groups;
}

export default function Blackouts() {
  const { addToast } = useToast();
  const [blackouts, setBlackouts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [roomId, setRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBlackout, setSelectedBlackout] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBlackoutsAndRooms = useCallback(async () => {
    try {
      setLoading(true);
      const [blackoutsRes, roomsRes] = await Promise.all([
        api.get('/blackouts'),
        api.get('/rooms'),
      ]);
      setBlackouts(blackoutsRes.data.blackouts || []);
      setRooms(roomsRes.data.rooms || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch blackout dates', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBlackoutsAndRooms();
  }, [fetchBlackoutsAndRooms]);

  const handleOpenAdd = () => {
    setDate('');
    setRoomId('');
    setReason('');
    setModalOpen(true);
  };

  const handleCreateBlackout = async (e) => {
    e.preventDefault();
    if (!date || !reason.trim()) {
      addToast('Date and reason are required.', 'error');
      return;
    }

    try {
      setModalLoading(true);
      const res = await api.post('/blackouts', {
        date,
        roomId: roomId || null,
        reason: reason.trim(),
      });

      setModalOpen(false);
      addToast(res.data.message || 'Blackout created successfully.', 'success');
      fetchBlackoutsAndRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create blackout date', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDelete = (b) => {
    setSelectedBlackout(b);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBlackout) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/blackouts/${selectedBlackout._id}`);
      setDeleteModalOpen(false);
      addToast('Blackout removed successfully.', 'success');
      fetchBlackoutsAndRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete blackout', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const grouped = groupBlackoutsByMonth(blackouts);
  const monthKeys = Object.keys(grouped);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              Blackout Dates
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {blackouts.length} Scheduled
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Reserve campus holidays, renovation windows, and examination periods to prevent room bookings.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Blackout
        </Button>
      </div>

      {/* Overlap Notice Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Non-destructive scheduling:</strong> Adding a blackout blocks new reservations. Existing
          bookings are flagged with an overlap notice in the activity log without being automatically cancelled,
          allowing admins to coordinate alternate arrangements with re-booking options.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Panel key={i} className="p-5 space-y-3">
              <Skeleton className="w-1/4 h-5" />
              <div className="space-y-2">
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
              </div>
            </Panel>
          ))}
        </div>
      ) : blackouts.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No blackout dates configured"
          description="Rooms are fully bookable based on standard operating hours and user quotas."
        />
      ) : (
        <div className="space-y-6">
          {monthKeys.map((month) => (
            <div key={month} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-2 px-1">
                {month}
              </h2>

              <div className="divide-y divide-line border border-line rounded-2xl bg-surface overflow-hidden shadow-xs">
                {grouped[month].map((b) => (
                  <div
                    key={b._id}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-ink">{b.date}</span>
                        {b.room ? (
                          <Badge variant="warning" size="sm">
                            {b.room.name} ({b.room.building})
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Campus-wide
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-2">{b.reason}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleOpenDelete(b)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Blackout Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Blackout Date"
        size="md"
      >
        <form onSubmit={handleCreateBlackout} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Scope (Leave empty for Campus-wide)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-ink"
            >
              <option value="">Campus-wide (All Rooms & Blocks)</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} - {r.building}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Reason *</label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual Convocation, Electrical maintenance, Republic Day"
              className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Schedule Blackout
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Blackout Date?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-2 leading-relaxed">
            Removing this blackout will allow students and faculty to immediately search and book
            slots on <strong>{selectedBlackout?.date}</strong>.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteLoading}
              onClick={handleConfirmDelete}
            >
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
