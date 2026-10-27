import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Calendar,
  Clock,
  Users,
  Search as SearchIcon,
  Filter,
  Sparkles,
  Info,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Minus,
} from 'lucide-react';
import api from '../api/axios';
import { socket } from '../socket';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Popover } from '../components/ui/Popover';
import { SegmentedControl } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import TimetableBoard from '../components/board/TimetableBoard';
import RoomListView from '../components/board/RoomListView';
import BookingDrawer from '../components/board/BookingDrawer';
import TakenSlotDrawer from '../components/board/TakenSlotDrawer';
import {
  getTodayIST,
  getTomorrowIST,
  getAddDaysIST,
  getISTCurrentHour,
  formatDateLabel,
  formatSlotRange,
} from '../utils/time';

export default function Search() {
  const { user } = useSelector((state) => state.auth);
  const { addToast } = useToast();

  const today = getTodayIST();
  const tomorrow = getTomorrowIST();
  const currentHour = getISTCurrentHour();

  // If fewer than 2 bookable slots remain today (past 7 PM IST), default to tomorrow
  const isLateToday = currentHour >= 19;
  const initialDate = isLateToday ? tomorrow : today;

  const [date, setDate] = useState(initialDate);
  const [capacity, setCapacity] = useState('');
  const [startHour, setStartHour] = useState('8');
  const [endHour, setEndHour] = useState('20');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [viewMode, setViewMode] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'list' : 'board'
  );

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Drawer State
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [activeBookingRoom, setActiveBookingRoom] = useState(null);
  const [activeBookingSlot, setActiveBookingSlot] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingErrorCode, setBookingErrorCode] = useState(null);

  // Taken Slot Drawer State
  const [takenDrawerOpen, setTakenDrawerOpen] = useState(false);
  const [activeTakenRoom, setActiveTakenRoom] = useState(null);
  const [activeTakenSlot, setActiveTakenSlot] = useState(null);
  const [activeTakenSlotData, setActiveTakenSlotData] = useState(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // AI Assistant Popover State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState(null);

  const abortControllerRef = useRef(null);

  // Equipment tags with labels
  const equipmentOptions = [
    { id: 'computers', label: 'Computers' },
    { id: 'projector', label: 'Projector' },
    { id: 'whiteboard', label: 'Whiteboard' },
    { id: 'ac', label: 'AC' },
  ];

  // Fetch rooms availability with debounce and request cancellation
  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cancel ongoing request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const params = { date };
      if (capacity) params.capacity = capacity;
      if (startHour) params.startHour = startHour;
      if (endHour) params.endHour = endHour;
      if (selectedEquipment.length > 0) {
        params.equipment = selectedEquipment.join(',');
      }

      const res = await api.get('/rooms/availability', {
        params,
        signal: abortControllerRef.current.signal,
      });

      setRooms(res.data?.rooms || []);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setError(err.response?.data?.message || 'Failed to fetch timetable schedules');
      }
    } finally {
      setLoading(false);
    }
  }, [date, capacity, startHour, endHour, selectedEquipment]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAvailability();
    }, 250); // 250ms debounce
    return () => clearTimeout(timer);
  }, [fetchAvailability]);

  // Live Socket.IO single-cell availability updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('availability:watch', { date });

    const handleAvailabilityChanged = (data) => {
      if (data?.date === date && data?.roomId && data?.slot !== undefined) {
        // Update single slot in-place without full board re-fetch!
        setRooms((prevRooms) =>
          prevRooms.map((r) => {
            if (r._id !== data.roomId) return r;
            const updatedSlots = (r.slots || []).map((s) => {
              if (s.slot !== data.slot) return s;
              return {
                ...s,
                state: data.state || (data.status === 'pending' ? 'pending' : 'booked'),
                waitlistCount: data.waitlistCount !== undefined ? data.waitlistCount : s.waitlistCount,
              };
            });
            return { ...r, slots: updatedSlots };
          })
        );
      } else if (data?.date === date) {
        fetchAvailability();
      }
    };

    socket.on('availability:changed', handleAvailabilityChanged);

    return () => {
      socket.emit('availability:unwatch', { date });
      socket.off('availability:changed', handleAvailabilityChanged);
    };
  }, [date, fetchAvailability]);

  // Count matching rooms per equipment
  const equipmentCounts = useMemo(() => {
    const counts = { computers: 0, projector: 0, whiteboard: 0, ac: 0 };
    rooms.forEach((r) => {
      r.equipment?.forEach((eq) => {
        if (counts[eq] !== undefined) counts[eq] += 1;
      });
    });
    return counts;
  }, [rooms]);

  const toggleEquipment = (tag) => {
    setSelectedEquipment((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleOpenBooking = (room, slotObj) => {
    setActiveBookingRoom(room);
    setActiveBookingSlot(slotObj.slot);
    setSelectedRange({ roomId: room._id, date, slots: [slotObj.slot] });
    setBookingError(null);
    setBookingErrorCode(null);
    setBookingDrawerOpen(true);
  };

  const handleOpenTakenSlot = (room, slotObj) => {
    setActiveTakenRoom(room);
    setActiveTakenSlot(slotObj.slot);
    setActiveTakenSlotData(slotObj);
    setTakenDrawerOpen(true);
  };

  const handleConfirmBooking = async (purpose, slotsToBook) => {
    if (!activeBookingRoom || !slotsToBook || slotsToBook.length === 0) return;
    try {
      setBookingLoading(true);
      setBookingError(null);
      setBookingErrorCode(null);

      const isMulti = slotsToBook.length > 1;
      const res = isMulti
        ? await api.post('/bookings/batch', {
            roomId: activeBookingRoom._id,
            date,
            slots: slotsToBook,
            purpose,
          })
        : await api.post('/bookings', {
            roomId: activeBookingRoom._id,
            date,
            slot: slotsToBook[0],
            purpose,
          });

      setBookingDrawerOpen(false);
      setSelectedRange(null);
      const isPending = activeBookingRoom.requiresApproval;
      const rangeText = formatSlotRange(slotsToBook[0], slotsToBook[slotsToBook.length - 1] + 1);
      addToast(
        isPending
          ? 'Request sent. You will be notified when an admin decides.'
          : `Booked: ${activeBookingRoom.name}, ${rangeText}`,
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

  const handleJoinWaitlist = async () => {
    if (!activeTakenRoom || activeTakenSlot === null) return;
    try {
      setWaitlistLoading(true);
      const res = await api.post('/waitlist', {
        roomId: activeTakenRoom._id,
        date,
        slot: activeTakenSlot,
      });

      setTakenDrawerOpen(false);
      addToast(
        `You are #${res.data.queuePosition} in line. We will book it for you if it opens up.`,
        'success'
      );
      fetchAvailability();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to join waitlist', 'error');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!activeTakenSlotData?._id && !activeTakenSlotData?.waitlistId) return;
    try {
      setWaitlistLoading(true);
      const id = activeTakenSlotData.waitlistId || activeTakenSlotData._id;
      await api.delete(`/waitlist/${id}`);
      setTakenDrawerOpen(false);
      addToast('Left waitlist queue.', 'info');
      fetchAvailability();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to leave waitlist', 'error');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleBookAlternative = async (alt) => {
    try {
      await api.post('/bookings', {
        roomId: alt.roomId,
        date: alt.date,
        slot: alt.slot,
        purpose: 'Study & Discussion (Smart Alternative)',
      });
      setTakenDrawerOpen(false);
      addToast(`Booked ${alt.roomName} on ${alt.date} (${formatSlotRange(alt.slot)})!`, 'success');
      if (alt.date !== date) {
        setDate(alt.date);
      } else {
        fetchAvailability();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to book alternative slot', 'error');
      throw err;
    }
  };

  const handleAiParse = async (closePopover) => {
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      setAiNotice(null);
      const res = await api.post('/ai/parse', { prompt: aiPrompt.trim() });
      if (res.data.parsed) {
        const { date: pDate, capacity: pCap, startHour: pStart, equipment: pEq } = res.data.parsed;
        if (pDate) setDate(pDate);
        if (pCap) setCapacity(String(pCap));
        if (pStart !== undefined && pStart !== null) setStartHour(String(pStart));
        if (Array.isArray(pEq) && pEq.length > 0) setSelectedEquipment(pEq);
        addToast('Applied AI filters!', 'success');
        closePopover?.();
      } else {
        setAiNotice(res.data.message || 'AI assistant is not configured on this instance.');
      }
    } catch (err) {
      setAiNotice(err.response?.data?.message || 'Failed to query AI assistant');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            Find a room
          </h1>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Times shown in India Standard Time (IST).
          </p>
        </div>

        {/* Board / List View Toggle */}
        <SegmentedControl
          tabs={[
            { id: 'board', label: 'Board', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { id: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
          ]}
          activeTab={viewMode}
          onChange={setViewMode}
        />
      </div>

      {/* Late Today Notice (if defaulted to tomorrow) */}
      {isLateToday && date === tomorrow && (
        <div className="p-3 bg-paper rounded-panel border border-line flex items-center justify-between text-xs text-text-2">
          <span>Today is almost over, showing tomorrow.</span>
          <button
            type="button"
            onClick={() => setDate(today)}
            className="text-xs font-semibold text-mine hover:underline cursor-pointer"
          >
            Show today instead
          </button>
        </div>
      )}

      {/* Compact Filter Bar */}
      <div className="bg-surface rounded-panel border border-line p-4 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Date Quick Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDate(today)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-control border transition-colors ${
                date === today
                  ? 'bg-mine text-white border-mine'
                  : 'bg-paper text-text-2 border-line hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDate(tomorrow)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-control border transition-colors ${
                date === tomorrow
                  ? 'bg-mine text-white border-mine'
                  : 'bg-paper text-text-2 border-line hover:bg-slate-200'
              }`}
            >
              Tomorrow
            </button>
            <div className="relative">
              <input
                type="date"
                value={date}
                min={today}
                max={getAddDaysIST(14)}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs font-semibold text-ink bg-paper border border-line rounded-control px-2.5 py-1.5 focus:outline-hidden focus:border-mine"
              />
            </div>
          </div>

          {/* Seats Stepper [ - 10 + ] */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-2">Seats:</span>
            <div className="flex items-center border border-line rounded-control overflow-hidden bg-paper">
              <button
                type="button"
                onClick={() => setCapacity((prev) => Math.max(1, (Number(prev) || 10) - 5))}
                className="w-8 h-8 flex items-center justify-center text-text-2 hover:text-ink hover:bg-line/40 transition-colors"
                aria-label="Decrease capacity"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-10 text-center text-xs font-bold text-ink tabular-nums">
                {capacity || 'Any'}
              </span>
              <button
                type="button"
                onClick={() => setCapacity((prev) => (Number(prev) || 5) + 5)}
                className="w-8 h-8 flex items-center justify-center text-text-2 hover:text-ink hover:bg-line/40 transition-colors"
                aria-label="Increase capacity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {capacity && (
              <button
                type="button"
                onClick={() => setCapacity('')}
                className="text-[11px] text-text-2 hover:text-ink underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Operating Hours Window */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-2">Hours:</span>
            <select
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="text-xs font-medium bg-paper border border-line rounded-control px-2 py-1.5 text-ink"
            >
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
            <span className="text-xs text-text-2">to</span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="text-xs font-medium bg-paper border border-line rounded-control px-2 py-1.5 text-ink"
            >
              {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>

          {/* Ask AI Popover */}
          <Popover
            width="w-80"
            trigger={
              <Button size="sm" variant="secondary" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-mine" />
                <span>Ask AI</span>
              </Button>
            }
          >
            {({ close }) => (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-mine" />
                    <span className="font-heading font-semibold text-xs text-ink">
                      AI Booking Assistant
                    </span>
                  </div>
                  <button onClick={close} className="text-xs text-text-2 hover:text-ink">
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Lab for 30 students tomorrow at 2 PM"
                  className="w-full text-xs bg-paper border border-line rounded-control p-2 text-ink focus:outline-hidden focus:border-mine"
                  autoFocus
                />
                {aiNotice && (
                  <p className="text-[11px] text-danger bg-danger-bg p-2 rounded-control">
                    {aiNotice}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  isLoading={aiLoading}
                  onClick={() => handleAiParse(close)}
                >
                  Apply AI Filters
                </Button>
              </div>
            )}
          </Popover>
        </div>

        {/* Equipment Chips with Room Counts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
          <span className="text-xs font-semibold text-text-2 mr-1">Equipment:</span>
          {equipmentOptions.map((eq) => {
            const isSelected = selectedEquipment.includes(eq.id);
            const count = equipmentCounts[eq.id] || 0;

            return (
              <button
                key={eq.id}
                type="button"
                onClick={() => toggleEquipment(eq.id)}
                className={`text-xs px-2.5 py-1 rounded-chip border transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-mine text-white border-mine font-semibold shadow-xs'
                    : 'bg-paper text-text-2 border-line hover:bg-slate-200'
                }`}
              >
                <span>{eq.label}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-full tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface text-text-2'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Board or List Rendering */}
      {loading ? (
        <div className="bg-surface rounded-panel border border-line p-8 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load timetable"
          description={error}
          onRetry={fetchAvailability}
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No rooms match these filters"
          description="Try relaxing your minimum capacity or equipment requirements."
          actionLabel="Clear filters"
          onAction={() => {
            setCapacity('');
            setSelectedEquipment([]);
          }}
        />
      ) : viewMode === 'board' ? (
        <TimetableBoard
          rooms={rooms}
          date={date}
          startHour={Number(startHour)}
          endHour={Number(endHour)}
          onSelectFreeSlot={handleOpenBooking}
          onSelectBookedSlot={handleOpenTakenSlot}
          selectedRange={selectedRange}
          onRangeSelect={setSelectedRange}
        />
      ) : (
        <RoomListView
          rooms={rooms}
          onSelectFreeSlot={handleOpenBooking}
          onSelectBookedSlot={handleOpenTakenSlot}
        />
      )}

      {/* Booking Drawer */}
      <BookingDrawer
        isOpen={bookingDrawerOpen}
        onClose={() => {
          setBookingDrawerOpen(false);
          setSelectedRange(null);
        }}
        room={activeBookingRoom}
        date={date}
        slot={activeBookingSlot}
        selectedSlots={
          selectedRange && selectedRange.roomId === activeBookingRoom?._id
            ? selectedRange.slots
            : activeBookingSlot !== null
            ? [activeBookingSlot]
            : []
        }
        onSubmit={handleConfirmBooking}
        isLoading={bookingLoading}
        error={bookingError}
        errorCode={bookingErrorCode}
        onSwitchToTakenDrawer={() => {
          setBookingDrawerOpen(false);
          handleOpenTakenSlot(activeBookingRoom, {
            slot: activeBookingSlot,
            waitlistCount: 0,
            inWaitlist: false,
          });
        }}
      />

      {/* Taken Slot Drawer */}
      <TakenSlotDrawer
        isOpen={takenDrawerOpen}
        onClose={() => setTakenDrawerOpen(false)}
        room={activeTakenRoom}
        date={date}
        slot={activeTakenSlot}
        slotData={activeTakenSlotData}
        onJoinWaitlist={handleJoinWaitlist}
        onLeaveWaitlist={handleLeaveWaitlist}
        onBookAlternative={handleBookAlternative}
        waitlistLoading={waitlistLoading}
      />
    </div>
  );
}
