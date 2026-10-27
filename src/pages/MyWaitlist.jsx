import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Calendar, Clock, Building2, Trash2, Users } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { formatSlotRange } from '../utils/time';

export default function MyWaitlist() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Waitlist State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const fetchWaitlist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/waitlist/mine');
      setEntries(res.data.entries || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch waitlist entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleOpenLeave = (entry) => {
    setSelectedEntry(entry);
    setLeaveModalOpen(true);
  };

  const handleConfirmLeave = async () => {
    if (!selectedEntry) return;
    try {
      setLeaveLoading(true);
      await api.delete(`/waitlist/${selectedEntry._id}`);
      setLeaveModalOpen(false);
      addToast('Removed from waitlist queue.', 'success');
      fetchWaitlist();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to leave waitlist', 'error');
    } finally {
      setLeaveLoading(false);
    }
  };

  // Render queue dots: e.g. ●●○○ for 2nd of 4
  const renderQueueDots = (position, total = Math.max(position, 4)) => {
    const dots = [];
    const count = Math.max(total, position);
    for (let i = 1; i <= count; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-2.5 h-2.5 rounded-full transition-colors ${
            i <= position ? 'bg-mine' : 'bg-line'
          }`}
          title={`Position ${i}`}
        />
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">{dots}</div>
        <span className="text-xs font-bold text-ink tabular-nums">
          #{position} in line
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            Waitlist queue
          </h1>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            When an occupied slot is cancelled or released as a no-show, you will automatically be
            promoted according to your queue order.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => navigate('/search')}>
            Find another room
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-panel" />
          <Skeleton className="h-32 w-full rounded-panel" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No active waitlists"
          description="You are not on any waitlists. When a room you want is taken, you can line up for it."
          actionLabel="Find a room"
          onAction={() => navigate('/search')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const timeLabel = formatSlotRange(entry.slot);
            const position = entry.queuePosition || 1;

            return (
              <div
                key={entry._id}
                className="bg-surface rounded-panel p-5 border border-line hover:border-mine/30 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading font-bold text-base text-ink">
                        {entry.room?.name || 'Campus Space'}
                      </h3>
                      <p className="text-xs text-text-2 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-text-2/70" />
                        {entry.room?.building || 'Main Campus'} • {entry.room?.capacity || 20} seats
                      </p>
                    </div>

                    <div className="text-right">
                      {renderQueueDots(position, position + 2)}
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-paper text-ink border border-line font-medium">
                      <Calendar className="w-3.5 h-3.5 text-text-2" />
                      {entry.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-paper text-ink border border-line font-medium">
                      <Clock className="w-3.5 h-3.5 text-text-2" />
                      {timeLabel}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-control bg-paper text-xs text-text-2 leading-relaxed">
                    Auto-promotes immediately if the holder cancels or fails to complete check-in within the 15-minute grace period.
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[11px] text-text-2">
                    Joined on {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenLeave(entry)}
                    className="text-danger hover:bg-danger-bg hover:text-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Leave waitlist
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leave Confirmation Modal */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave waitlist queue"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-2 leading-relaxed">
            Are you sure you want to leave the waitlist queue for{' '}
            <strong className="text-ink">{selectedEntry?.room?.name}</strong> on{' '}
            {selectedEntry?.date} ({selectedEntry && formatSlotRange(selectedEntry.slot)})?
          </p>
          <p className="text-xs text-text-2 bg-paper p-3 rounded-control border border-line">
            You will lose your queue position. If you rejoin later, you will be placed at the end of the line.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setLeaveModalOpen(false)}
              disabled={leaveLoading}
            >
              Stay in queue
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmLeave}
              isLoading={leaveLoading}
            >
              Yes, leave waitlist
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
