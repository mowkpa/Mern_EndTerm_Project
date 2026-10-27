import React, { useState, useEffect, useCallback } from 'react';
import {
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  AlertTriangle,
  Building2,
  Users as UsersIcon,
  Clock,
  ShieldAlert,
  Power,
  Tv,
  Presentation,
  Wifi,
  Sparkles,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const COMMON_EQUIPMENT = ['projector', 'whiteboard', 'video_conf', 'ac', 'workstations', 'podium'];

export default function Rooms() {
  const { addToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');

  // Drawer State (Add / Edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [equipmentList, setEquipmentList] = useState([]);
  const [customEquip, setCustomEquip] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [openHour, setOpenHour] = useState(8);
  const [closeHour, setCloseHour] = useState(20);
  const [description, setDescription] = useState('');

  // Deactivate / Delete State
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
    setCapacity(30);
    setEquipmentList(['projector', 'whiteboard']);
    setCustomEquip('');
    setRequiresApproval(false);
    setOpenHour(8);
    setCloseHour(20);
    setDescription('');
    setDrawerOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setName(room.name);
    setBuilding(room.building);
    setCapacity(room.capacity);
    setEquipmentList(room.equipment || []);
    setCustomEquip('');
    setRequiresApproval(room.requiresApproval);
    setOpenHour(room.openHour);
    setCloseHour(room.closeHour);
    setDescription(room.description || '');
    setDrawerOpen(true);
  };

  const toggleEquipment = (item) => {
    setEquipmentList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCustomEquipment = (e) => {
    e.preventDefault();
    const clean = customEquip.trim().toLowerCase();
    if (clean && !equipmentList.includes(clean)) {
      setEquipmentList((prev) => [...prev, clean]);
      setCustomEquip('');
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!name.trim() || !building.trim()) {
      addToast('Name and building are required.', 'error');
      return;
    }

    try {
      setDrawerLoading(true);
      const payload = {
        name: name.trim(),
        building: building.trim(),
        capacity: Number(capacity),
        equipment: equipmentList,
        requiresApproval,
        openHour: Number(openHour),
        closeHour: Number(closeHour),
        description: description.trim(),
      };

      if (editingRoom) {
        await api.put(`/rooms/${editingRoom._id}`, payload);
        addToast('Room details updated successfully.', 'success');
      } else {
        await api.post('/rooms', payload);
        addToast('New room registered successfully.', 'success');
      }

      setDrawerOpen(false);
      fetchRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save room', 'error');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleToggleActive = async (room) => {
    try {
      const nextActive = !room.isActive;
      await api.put(`/rooms/${room._id}`, { isActive: nextActive });
      addToast(
        nextActive
          ? `Room "${room.name}" activated.`
          : `Room "${room.name}" deactivated.`,
        'success'
      );
      setRooms((prev) =>
        prev.map((r) => (r._id === room._id ? { ...r, isActive: nextActive } : r))
      );
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to toggle room status', 'error');
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
      const msg = res.data.affectedFutureBookings
        ? `Room deactivated. ${res.data.affectedFutureBookings} future bookings will be impacted.`
        : 'Room deactivated successfully.';
      addToast(msg, 'success');
      fetchRooms();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to deactivate room', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Distinct buildings for filter
  const buildings = ['all', ...new Set(rooms.map((r) => r.building))];

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.building.toLowerCase().includes(search.toLowerCase()) ||
      r.equipment?.some((e) => e.toLowerCase().includes(search.toLowerCase()));

    const matchesBuilding = buildingFilter === 'all' || r.building === buildingFilter;

    return matchesSearch && matchesBuilding;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              Rooms & Facilities
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {rooms.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Configure room capacities, operational hours, approval policies, and equipment inventory.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
          Add Room
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by room name, building, equipment..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-line bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="px-3.5 py-2 text-xs rounded-xl border border-line bg-surface text-ink focus:outline-hidden focus:ring-2 focus:ring-primary-500"
        >
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b === 'all' ? 'All Buildings' : b}
            </option>
          ))}
        </select>
      </div>

      {/* Rooms Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Panel key={i} className="p-5 space-y-3">
              <Skeleton className="w-1/2 h-5" />
              <Skeleton className="w-1/3 h-4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="w-16 h-4 rounded-full" />
                <Skeleton className="w-16 h-4 rounded-full" />
              </div>
            </Panel>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms match your filter"
          description="Try adjusting your search criteria or register a new campus facility."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Panel
              key={room._id}
              className={`p-5 flex flex-col justify-between space-y-4 border transition-all ${
                room.isActive
                  ? 'border-line hover:border-slate-300'
                  : 'border-slate-200 bg-slate-50/70 opacity-75'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-base text-ink flex items-center gap-1.5">
                      {room.name}
                      {!room.isActive && (
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                          Inactive
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-text-2 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-text-3" />
                      {room.building}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      room.requiresApproval
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {room.requiresApproval ? 'Requires Approval' : 'Instant Book'}
                  </span>
                </div>

                {/* Specs */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-paper border border-line">
                    <UsersIcon className="w-3 h-3 text-text-3" />
                    {room.capacity} seats
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-paper border border-line">
                    <Clock className="w-3 h-3 text-text-3" />
                    {room.openHour}:00 - {room.closeHour}:00
                  </span>
                </div>

                {/* Equipment Tags */}
                {room.equipment && room.equipment.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {room.equipment.map((eq) => (
                      <span
                        key={eq}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize"
                      >
                        {eq.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {room.description && (
                  <p className="mt-3 text-xs text-text-2 line-clamp-2">{room.description}</p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(room)}
                  className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                    room.isActive
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      : 'text-slate-600 bg-slate-100 border-slate-300 hover:bg-slate-200'
                  }`}
                  title={room.isActive ? 'Deactivate room' : 'Activate room'}
                >
                  <Power className="w-3 h-3" />
                  {room.isActive ? 'Active' : 'Disabled'}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleOpenEdit(room)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleOpenDelete(room)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Add / Edit Room Slide-over Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRoom ? `Edit ${editingRoom.name}` : 'Register New Room'}
        subtitle="Manage room physical parameters, approval rules, and equipment"
        width="max-w-lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={drawerLoading}
              onClick={handleSaveRoom}
            >
              {editingRoom ? 'Save Changes' : 'Create Room'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Room Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lab 402, Seminar Hall A"
              className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Building / Block *</label>
            <input
              type="text"
              required
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="e.g. Science Block, Academic Wing"
              className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Open Hour</label>
              <select
                value={openHour}
                onChange={(e) => setOpenHour(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                {[...Array(24)].map((_, h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Close Hour</label>
              <select
                value={closeHour}
                onChange={(e) => setCloseHour(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                {[...Array(24)].map((_, h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Requires Approval Toggle */}
          <div className="p-3 rounded-xl border border-line bg-paper/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink">Requires Admin Approval</p>
              <p className="text-[11px] text-text-3">
                Bookings will remain pending until an administrator approves them.
              </p>
            </div>
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-line"
            />
          </div>

          {/* Equipment Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Available Equipment
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_EQUIPMENT.map((eq) => {
                const isSelected = equipmentList.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-primary-50 border-primary-300 text-primary-800 font-medium'
                        : 'bg-surface border-line text-text-2 hover:bg-paper'
                    }`}
                  >
                    {eq.replace('_', ' ')}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customEquip}
                onChange={(e) => setCustomEquip(e.target.value)}
                placeholder="Add other equipment..."
                className="flex-1 text-xs rounded-xl border border-line p-2 bg-surface"
              />
              <Button variant="outline" size="sm" type="button" onClick={addCustomEquipment}>
                Add
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dual projector displays with surround sound and high-speed Wi-Fi."
              className="w-full text-xs rounded-xl border border-line p-2.5 bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </form>
      </Drawer>

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Deactivate ${roomToDelete?.name || 'Room'}?`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-2 leading-relaxed">
            Deactivating this room will hide it from the search timetable board and prevent any new
            bookings from being made. Historical reservations and attendance analytics will remain
            preserved.
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
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
