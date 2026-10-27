import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Calendar,
  Clock,
  Users,
  Search as SearchIcon,
  Filter,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import api from '../api/axios';
import { socket } from '../socket';
import { useToast } from '../components/Toast';
import SlotGrid from '../components/SlotGrid';
import BookingModal from '../components/BookingModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

// Helper to get local IST YYYY-MM-DD
const getTodayString = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

const getFutureDateString = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

export default function Search() {
  const { user } = useSelector((state) => state.auth);
  const { addToast } = useToast();

  const [date, setDate] = useState(getTodayString());
  const [capacity, setCapacity] = useState('');
  const [startHour, setStartHour] = useState('8');
  const [endHour, setEndHour] = useState('20');
  const [selectedEquipment, setSelectedEquipment] = useState([]);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [activeBookingRoom, setActiveBookingRoom] = useState(null);
  const [activeBookingSlot, setActiveBookingSlot] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingErrorCode, setBookingErrorCode] = useState(null);

  // Waitlist Dialog State
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [activeWaitlistRoom, setActiveWaitlistRoom] = useState(null);
  const [activeWaitlistSlot, setActiveWaitlistSlot] = useState(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponseMsg, setAiResponseMsg] = useState(null);

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      setAiResponseMsg(null);
      const res = await api.post('/ai/parse', { prompt: aiPrompt.trim() });
      if (res.data.parsed) {
        const { date: pDate, capacity: pCap, startHour: pStart, equipment: pEq } = res.data.parsed;
        if (pDate) setDate(pDate);
        if (pCap) setCapacity(String(pCap));
        if (pStart !== undefined && pStart !== null) setStartHour(String(pStart));
        if (Array.isArray(pEq) && pEq.length > 0) setSelectedEquipment(pEq);
        addToast('Applied AI filters!', 'success');
      } else {
        setAiResponseMsg(res.data.message || 'AI assistant is not configured on this instance.');
      }
    } catch (err) {
      setAiResponseMsg(err.response?.data?.message || 'Failed to query AI assistant');
    } finally {
      setAiLoading(false);
    }
  };

  const equipmentOptions = [
    { id: 'computers', label: 'Computers' },
    { id: 'projector', label: 'Projector' },
    { id: 'whiteboard', label: 'Whiteboard' },
    { id: 'ac', label: 'Air Conditioning' },
  ];

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date };
      if (capacity) params.capacity = capacity;
      if (startHour) params.startHour = startHour;
      if (endHour) params.endHour = endHour;
      if (selectedEquipment.length > 0) {
        params.equipment = selectedEquipment.join(',');
      }

      const res = await api.get('/rooms/availability', { params });
      setRooms(res.data.rooms || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch room availability', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, capacity, startHour, endHour, selectedEquipment, addToast]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Real-time Socket.IO room subscription for live slot updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    // Watch selected date
    socket.emit('availability:watch', { date });

    const handleAvailabilityChanged = (data) => {
      if (data?.date === date) {
        // Silently refresh availability grid to avoid state drift
        api.get('/rooms/availability', {
          params: {
            date,
            capacity: capacity || undefined,
            startHour: startHour || undefined,
            endHour: endHour || undefined,
            equipment: selectedEquipment.length > 0 ? selectedEquipment.join(',') : undefined,
          },
        }).then((res) => {
          setRooms(res.data.rooms || []);
        }).catch(() => {});
      }
    };

    socket.on('availability:changed', handleAvailabilityChanged);

    return () => {
      socket.emit('availability:unwatch', { date });
      socket.off('availability:changed', handleAvailabilityChanged);
    };
  }, [date, capacity, startHour, endHour, selectedEquipment]);

  const toggleEquipment = (tag) => {
    setSelectedEquipment((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleOpenBooking = (room, slotObj) => {
    setActiveBookingRoom(room);
    setActiveBookingSlot(slotObj.slot);
    setBookingError(null);
    setBookingErrorCode(null);
    setBookingModalOpen(true);
  };

  const handleOpenWaitlist = (room, slotObj) => {
    setActiveWaitlistRoom(room);
    setActiveWaitlistSlot(slotObj);
    setWaitlistModalOpen(true);
  };

  const handleConfirmBooking = async (purpose) => {
    if (!activeBookingRoom || activeBookingSlot === null) return;
    try {
      setBookingLoading(true);
      setBookingError(null);
      setBookingErrorCode(null);

      const res = await api.post('/bookings', {
        roomId: activeBookingRoom._id,
        date,
        slot: activeBookingSlot,
        purpose,
      });

      setBookingModalOpen(false);
      const isPending = res.data.booking.status === 'pending';
      addToast(
        isPending
          ? 'Request submitted! Awaiting administrator approval.'
          : 'Room booked successfully! See details in My Bookings.',
        'success'
      );
      fetchAvailability();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete booking';
      const code = err.response?.data?.code;
      setBookingError(msg);
      setBookingErrorCode(code);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleConfirmWaitlist = async () => {
    if (!activeWaitlistRoom || !activeWaitlistSlot) return;
    try {
      setWaitlistLoading(true);
      const res = await api.post('/waitlist', {
        roomId: activeWaitlistRoom._id,
        date,
        slot: activeWaitlistSlot.slot,
      });

      setWaitlistModalOpen(false);
      addToast(
        `Added to waitlist (Queue position: #${res.data.queuePosition}). You will be auto-promoted if freed.`,
        'success'
      );
      fetchAvailability();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to join waitlist', 'error');
    } finally {
      setWaitlistLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Filters Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Campus Spaces Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live slot availability in Asia/Kolkata time with automated conflict protection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Date:</span>
            <input
              type="date"
              value={date}
              min={getTodayString()}
              max={getFutureDateString(14)}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* AI Booking Assistant Prompt Bar */}
        <form onSubmit={handleAiSearch} className="bg-gradient-to-r from-primary-50 via-indigo-50/50 to-purple-50 p-3.5 rounded-xl border border-primary-100 flex flex-col sm:flex-row gap-2.5 items-center">
          <div className="flex items-center gap-2 text-primary-700 font-semibold text-xs shrink-0">
            <Sparkles className="w-4 h-4 text-primary-600 animate-pulse" />
            <span>AI Assistant:</span>
          </div>
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., 'Need a lab for 30 students with computers tomorrow at 2 PM'"
              className="w-full text-xs sm:text-sm bg-white border border-primary-200 rounded-lg px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={aiLoading || !aiPrompt.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
          >
            {aiLoading ? <Spinner size="sm" className="text-white" /> : <Sparkles className="w-3.5 h-3.5" />}
            Parse Intent
          </button>
        </form>

        {aiResponseMsg && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Notice: </span>
              {aiResponseMsg}
            </div>
            <button
              type="button"
              onClick={() => setAiResponseMsg(null)}
              className="text-amber-600 hover:text-amber-800 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Min. Capacity
            </label>
            <input
              type="number"
              min="1"
              max="150"
              placeholder="e.g. 10"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-hidden transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Start Hour
            </label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-hidden transition-all"
            >
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              End Hour
            </label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-hidden transition-all"
            >
              {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Filter by Equipment
            </label>
            <div className="flex flex-wrap gap-1.5">
              {equipmentOptions.map((eq) => {
                const isSelected = selectedEquipment.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {eq.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Slot Legend */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 border border-emerald-300" />
            Available (Free)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-primary-600 border border-primary-700" />
            Your Booking (Mine)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-200 border border-slate-300" />
            Occupied (Join Waitlist)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-amber-100 border border-amber-300" />
            Holiday / Blackout
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-200 opacity-60" />
            Past
          </span>
        </div>
      </div>

      {/* Rooms Listing & Slot Grids */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Checking room schedules...</p>
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matching spaces found"
          description="Try adjusting your capacity, operating hours, or equipment filters to find available rooms."
        />
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <div
              key={room._id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Room Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {room.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{room.name}</h3>
                      {room.requiresApproval && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Requires Approval
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {room.building} • Capacity: {room.capacity} seats • Hours:{' '}
                      {String(room.openHour).padStart(2, '0')}:00 -{' '}
                      {String(room.closeHour).padStart(2, '0')}:00
                    </p>
                  </div>
                </div>

                {/* Equipment Chips */}
                {room.equipment && room.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.equipment.map((eq) => (
                      <span
                        key={eq}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium capitalize"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Slot Schedule Grid */}
              <SlotGrid
                room={room}
                slots={room.slots || []}
                onSelectFreeSlot={handleOpenBooking}
                onSelectBookedSlot={handleOpenWaitlist}
              />
            </div>
          ))}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        room={activeBookingRoom}
        date={date}
        slot={activeBookingSlot}
        isLoading={bookingLoading}
        error={bookingError}
        errorCode={bookingErrorCode}
        onClose={() => setBookingModalOpen(false)}
        onSubmit={handleConfirmBooking}
        onJoinWaitlistFromConflict={() => {
          setBookingModalOpen(false);
          handleOpenWaitlist(activeBookingRoom, { slot: activeBookingSlot, waitlistCount: 0 });
        }}
      />

      {/* Join Waitlist Confirmation Dialog */}
      <ConfirmDialog
        isOpen={waitlistModalOpen}
        title="Join Waitlist"
        message={`This slot is currently occupied. Joining the waitlist queues you in FIFO order. If the current reservation is cancelled, rejected, or released as a no-show, you will be booked automatically.`}
        confirmText="Join Waitlist Queue"
        isLoading={waitlistLoading}
        onConfirm={handleConfirmWaitlist}
        onCancel={() => setWaitlistModalOpen(false)}
      />
    </div>
  );
}
