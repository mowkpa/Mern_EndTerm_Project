import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Plus, Trash2, Calendar, Building2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

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
    try {
      setModalLoading(true);
      const res = await api.post('/blackouts', {
        date,
        roomId: roomId || null,
        reason,
      });

      setModalOpen(false);
      addToast(
        res.data.message || 'Blackout created successfully.',
        'success'
      );
      fetchBlackoutsAndRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create blackout date', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDelete = (blackout) => {
    setSelectedBlackout(blackout);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBlackout) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/blackouts/${selectedBlackout._id}`);
      setDeleteModalOpen(false);
      addToast('Blackout date removed. Normal scheduling resumed.', 'success');
      fetchBlackoutsAndRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete blackout date', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            Campus Blackout Dates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Designate campus-wide holidays or individual facility maintenance dates.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Blackout
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Loading blackout dates...</p>
        </div>
      ) : blackouts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No upcoming blackout dates"
          description="There are currently no campus holidays or facility closures scheduled."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blackouts.map((bo) => (
            <div
              key={bo._id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>{bo.date}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      bo.room
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {bo.room ? 'Single Facility' : 'Campus-Wide'}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {bo.room ? `${bo.room.name} (${bo.room.building})` : 'Applies to all campus facilities'}
                  </p>
                  <p className="pt-1 text-slate-600">
                    <span className="font-semibold text-slate-700">Reason: </span>
                    {bo.reason}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenDelete(bo)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Blackout
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Blackout Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Campus Blackout Closure</h3>
            <p className="text-xs text-slate-500">
              Users cannot reserve rooms on blackout dates.
            </p>

            <form onSubmit={handleCreateBlackout} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Blackout Date (YYYY-MM-DD) *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block mb-1">Target Space / Facility</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                >
                  <option value="">All Campus Spaces (Campus-Wide Holiday)</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.building})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">Closure Reason *</label>
                <textarea
                  rows={2}
                  required
                  minLength={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. National Campus Holiday & Convocation"
                  className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !date || !reason}
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                >
                  {modalLoading && <Spinner size="sm" />}
                  Schedule Blackout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Remove Blackout Date"
        message={`Are you sure you want to remove the blackout closure for ${selectedBlackout?.date}? Normal slot booking will be re-enabled.`}
        confirmText="Remove Closure"
        isDanger={true}
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
