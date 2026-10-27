import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Calendar, Clock, Building2, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function MyWaitlist() {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          My Waitlist Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          When an occupied slot is cancelled or released as a no-show, you will automatically be
          promoted according to your queue order.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Loading your waitlist positions...</p>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No active waitlists"
          description="You are not waiting for any occupied slots. You can join the waitlist on any taken slot in the space directory."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const slotStartHour = `${String(entry.slot).padStart(2, '0')}:00`;
            const slotEndHour = `${String(entry.slot + 1).padStart(2, '0')}:00`;

            return (
              <div
                key={entry._id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {entry.room?.name || 'Campus Space'}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {entry.room?.building || 'Main Campus'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
                        Queue Position: #{entry.queuePosition || 1}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {entry.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {slotStartHour} - {slotEndHour}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Joined on {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenLeave(entry)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Leave Waitlist
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leave Confirmation Dialog */}
      <ConfirmDialog
        isOpen={leaveModalOpen}
        title="Leave Waitlist"
        message="Are you sure you want to surrender your position in the waitlist queue for this room and slot?"
        confirmText="Leave Queue"
        isDanger={true}
        isLoading={leaveLoading}
        onConfirm={handleConfirmLeave}
        onCancel={() => setLeaveModalOpen(false)}
      />
    </div>
  );
}
