import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

export default function Rooms() {
  const { addToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [openHour, setOpenHour] = useState(8);
  const [closeHour, setCloseHour] = useState(20);
  const [description, setDescription] = useState('');

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/rooms?includeInactive=true');
      setRooms(res.data.rooms || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch rooms', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setName('');
    setBuilding('');
    setCapacity(20);
    setEquipmentInput('whiteboard, ac');
    setRequiresApproval(false);
    setOpenHour(8);
    setCloseHour(20);
    setDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setName(room.name);
    setBuilding(room.building);
    setCapacity(room.capacity);
    setEquipmentInput(room.equipment?.join(', ') || '');
    setRequiresApproval(room.requiresApproval);
    setOpenHour(room.openHour);
    setCloseHour(room.closeHour);
    setDescription(room.description || '');
    setModalOpen(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      const equipment = equipmentInput
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        name,
        building,
        capacity: Number(capacity),
        equipment,
        requiresApproval,
        openHour: Number(openHour),
        closeHour: Number(closeHour),
        description,
      };

      if (editingRoom) {
        await api.put(`/rooms/${editingRoom._id}`, payload);
        addToast('Room updated successfully.', 'success');
      } else {
        await api.post('/rooms', payload);
        addToast('Room created successfully.', 'success');
      }

      setModalOpen(false);
      fetchRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save room', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDelete = (room) => {
    setRoomToDelete(room);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await api.delete(`/rooms/${roomToDelete._id}`);
      setDeleteModalOpen(false);
      addToast(
        `Room deactivated. ${res.data.affectedFutureBookings || 0} future bookings exist.`,
        'success'
      );
      fetchRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to deactivate room', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.building.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" />
            Room & Lab Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure campus rooms, capacity limits, operating hours, and approval requirements.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Space
        </button>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by space name or building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Loading campus facilities...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No spaces found"
          description="Create a new room or adjust your search filter."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Space Name</th>
                  <th className="py-3.5 px-4">Building</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Operating Hours</th>
                  <th className="py-3.5 px-4">Approval</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{r.name}</td>
                    <td className="py-3.5 px-4">{r.building}</td>
                    <td className="py-3.5 px-4">{r.capacity} seats</td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {String(r.openHour).padStart(2, '0')}:00 - {String(r.closeHour).padStart(2, '0')}:00
                    </td>
                    <td className="py-3.5 px-4">
                      {r.requiresApproval ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Direct</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          r.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Room"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {r.isActive && (
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(r)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Deactivate Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingRoom ? 'Edit Space Configuration' : 'Add New Campus Space'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter room details and booking rules for scheduling.
            </p>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Advanced Robotics Lab R-102"
                  className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Building Location *</label>
                  <input
                    type="text"
                    required
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g. Science Block 2nd Floor"
                    className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block mb-1">Capacity (Seats) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Open Hour (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={openHour}
                    onChange={(e) => setOpenHour(e.target.value)}
                    className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block mb-1">Close Hour (1-24)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={closeHour}
                    onChange={(e) => setCloseHour(e.target.value)}
                    className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Equipment Tags (comma-separated)</label>
                <input
                  type="text"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  placeholder="e.g. computers, projector, whiteboard, ac"
                  className="w-full text-sm font-normal rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiresApproval"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded-sm focus:ring-primary-500 border-slate-300"
                />
                <label htmlFor="requiresApproval" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Require Administrative Approval for bookings
                </label>
              </div>

              <div>
                <label className="block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brief notes or equipment instructions"
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
                  disabled={modalLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                >
                  {modalLoading && <Spinner size="sm" />}
                  {editingRoom ? 'Update Space' : 'Create Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Deactivate Campus Space"
        message={`Are you sure you want to deactivate "${roomToDelete?.name}"? It will no longer be visible in directory searches.`}
        confirmText="Deactivate"
        isDanger={true}
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
