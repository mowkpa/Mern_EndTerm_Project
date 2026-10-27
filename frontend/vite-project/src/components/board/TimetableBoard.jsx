import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lock, Check, Clock, ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import {
  formatSlotHour,
  formatSlotRange,
  getTodayIST,
  getISTCurrentHour,
  getISTCurrentMinute,
} from '../../utils/time';

export const TimetableBoard = ({
  rooms = [],
  date,
  startHour = 8,
  endHour = 20,
  onSelectFreeSlot,
  onSelectBookedSlot,
  selectedRange = null,
  onRangeSelect = null,
}) => {
  const containerRef = useRef(null);
  const isToday = date === getTodayIST();
  const currentHour = getISTCurrentHour();
  const currentMinute = getISTCurrentMinute();

  // "Earlier" collapsed toggle (default collapsed when today)
  const [showEarlier, setShowEarlier] = useState(!isToday);

  // Live "Now" line state updating every minute
  const [nowMinute, setNowMinute] = useState(currentMinute);
  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      setNowMinute(getISTCurrentMinute());
    }, 60000);
    return () => clearInterval(interval);
  }, [isToday]);

  // All hours in range
  const allHours = useMemo(() => {
    const list = [];
    for (let h = Number(startHour); h <= Number(endHour); h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  // Hours visible on the board: if today and !showEarlier, collapse hours < currentHour
  const visibleHours = useMemo(() => {
    if (!isToday || showEarlier) return allHours;
    return allHours.filter((h) => h >= currentHour);
  }, [allHours, isToday, showEarlier, currentHour]);

  const earlierHoursCount = isToday && !showEarlier ? allHours.filter((h) => h < currentHour).length : 0;

  // Auto-scroll so current hour is immediately in view on mount
  useEffect(() => {
    if (isToday && containerRef.current) {
      // Find element or scroll to roughly 200px
      const targetScroll = earlierHoursCount > 0 ? 0 : Math.max(0, (currentHour - startHour - 1) * 56);
      containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [isToday, currentHour, startHour, earlierHoursCount]);

  // Group rooms by building
  const groupedRooms = useMemo(() => {
    const groups = {};
    rooms.forEach((r) => {
      const b = r.building || 'Main Campus';
      if (!groups[b]) groups[b] = [];
      groups[b].push(r);
    });
    return groups;
  }, [rooms]);

  // Cell state resolver
  const getCellState = (room, slotHour) => {
    if (slotHour < room.openHour || slotHour >= room.closeHour) {
      return { state: 'outside', label: 'Closed' };
    }
    const slotObj = room.slots?.find((s) => s.slot === slotHour);
    if (!slotObj) return { state: 'outside', label: 'Closed' };
    return slotObj;
  };

  const handleCellClick = (room, slotHour, slotData, e) => {
    if (slotData.state === 'outside' || slotData.state === 'blackout' || slotData.state === 'past') {
      return;
    }

    if (slotData.state === 'free') {
      // Shift-click range select support
      if (e?.shiftKey && onRangeSelect && selectedRange && selectedRange.roomId === room._id) {
        const rangeStart = Math.min(selectedRange.slots[0], slotHour);
        const rangeEnd = Math.max(selectedRange.slots[selectedRange.slots.length - 1], slotHour);
        const count = rangeEnd - rangeStart + 1;
        if (count <= 4) {
          const continuousSlots = [];
          for (let s = rangeStart; s <= rangeEnd; s++) {
            continuousSlots.push(s);
          }
          onRangeSelect({ roomId: room._id, date, slots: continuousSlots });
          return;
        }
      }
      onSelectFreeSlot?.(room, slotData);
    } else if (slotData.state === 'booked' || slotData.state === 'pending') {
      onSelectBookedSlot?.(room, slotData);
    }
  };

  // Calculate now-line horizontal offset (when today)
  const calculateNowLineLeft = () => {
    if (!isToday || currentHour < startHour || currentHour > endHour) return null;
    const hourColWidth = 56;
    const stickyColWidth = 240;
    const earlierColWidth = earlierHoursCount > 0 ? 56 : 0;

    let hourIndex = visibleHours.indexOf(currentHour);
    if (hourIndex === -1) return null;

    const fraction = nowMinute / 60;
    const leftOffset = stickyColWidth + earlierColWidth + (hourIndex + fraction) * hourColWidth;
    return leftOffset;
  };

  const nowLineLeft = calculateNowLineLeft();

  return (
    <div className="space-y-3">
      {/* Inline Minimalist Cell Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-text-2 bg-surface p-3 rounded-panel border border-line">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-ink">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-chip bg-free-bg border border-free/40 text-free flex items-center justify-center font-bold text-[10px]">
              +
            </span>
            <span>Free</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-chip bg-mine text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>Your booking</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-chip bg-booked border border-line text-text-2 flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 opacity-60" />
            </span>
            <span>Occupied</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-chip hatch-pending border border-pending/40 text-pending flex items-center justify-center">
              <Clock className="w-2.5 h-2.5" />
            </span>
            <span>Pending</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-chip hatch-danger border border-danger/40" />
            <span>Blackout</span>
          </span>
        </div>

        {/* Earlier hours expand / collapse toggle */}
        {isToday && (
          <button
            type="button"
            onClick={() => setShowEarlier((prev) => !prev)}
            className="text-xs font-semibold text-mine hover:underline flex items-center gap-1 cursor-pointer"
          >
            {showEarlier ? 'Collapse earlier hours' : `Show earlier hours (${currentHour - startHour}h)`}
          </button>
        )}
      </div>

      {/* The Timetable Board Container */}
      <div
        ref={containerRef}
        className="relative bg-surface rounded-panel border border-line overflow-x-auto shadow-xs select-none max-h-[70vh]"
      >
        <div className="relative min-w-max">
          {/* Header Row: Sticky Hour Columns */}
          <div className="sticky top-0 z-20 flex bg-paper border-b border-line">
            {/* Sticky Room Column Header */}
            <div className="sticky left-0 z-30 w-[240px] shrink-0 p-3 bg-paper border-r border-line text-xs font-semibold text-text-2">
              Campus Space
            </div>

            {/* Earlier column (if collapsed) */}
            {isToday && !showEarlier && earlierHoursCount > 0 && (
              <div
                onClick={() => setShowEarlier(true)}
                title="Click to show earlier hours"
                className="w-14 shrink-0 p-2 text-center text-[10px] font-semibold text-text-2/70 bg-paper/80 border-r border-line flex flex-col items-center justify-center cursor-pointer hover:bg-paper"
              >
                <span>Earlier</span>
                <span className="text-[9px] text-mine">+{earlierHoursCount}h</span>
              </div>
            )}

            {/* Hour Columns */}
            {visibleHours.map((h) => {
              const isCurrent = isToday && h === currentHour;
              return (
                <div
                  key={h}
                  className={`w-14 shrink-0 py-2.5 text-center text-xs font-semibold tabular-nums border-r border-line/60 ${
                    isCurrent ? 'bg-mine-bg/50 text-mine font-bold' : 'text-text-2'
                  }`}
                >
                  {formatSlotHour(h)}
                </div>
              );
            })}
          </div>

          {/* Room Rows Grouped by Building */}
          {Object.entries(groupedRooms).map(([building, bRooms]) => (
            <div key={building} className="divide-y divide-line/60">
              {/* Plain sentence-case Building Header */}
              <div className="sticky left-0 z-10 px-4 py-2 bg-paper/60 border-y border-line text-xs font-bold text-ink uppercase tracking-wider">
                {building}
              </div>

              {bRooms.map((room) => (
                <div key={room._id} className="flex hover:bg-paper/30 transition-colors">
                  {/* Sticky Room Info Cell */}
                  <div className="sticky left-0 z-10 w-[240px] shrink-0 p-3 bg-surface border-r border-line flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ink truncate leading-tight">
                        {room.name}
                      </span>
                      {room.requiresApproval && (
                        <span
                          className="shrink-0 text-[10px] font-semibold px-1.5 py-0.2 rounded-chip bg-pending-bg text-pending border border-pending/20"
                          title="Requires Admin Approval"
                        >
                          Approval
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-2 mt-0.5 flex items-center gap-2">
                      <span>{room.capacity} seats</span>
                      {room.equipment && room.equipment.length > 0 && (
                        <span className="capitalize text-text-2/70 truncate">
                          • {room.equipment.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Earlier Column cell (if collapsed) */}
                  {isToday && !showEarlier && earlierHoursCount > 0 && (
                    <div
                      onClick={() => setShowEarlier(true)}
                      className="w-14 shrink-0 bg-paper/40 border-r border-line/60 flex items-center justify-center cursor-pointer hover:bg-paper/70"
                      title="Show earlier hours"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-text-2/50" />
                    </div>
                  )}

                  {/* Slot Cells */}
                  {visibleHours.map((h) => {
                    const slotData = getCellState(room, h);
                    const slotRangeText = formatSlotRange(h);
                    const isRangeSelected =
                      selectedRange &&
                      selectedRange.roomId === room._id &&
                      selectedRange.slots.includes(h);

                    if (slotData.state === 'outside') {
                      return (
                        <div
                          key={h}
                          className="w-14 h-12 shrink-0 border-r border-line/40 bg-paper/20 select-none"
                          title={`${room.name}, ${slotRangeText}: Closed`}
                        />
                      );
                    }

                    if (slotData.state === 'blackout') {
                      return (
                        <div
                          key={h}
                          className="w-14 h-12 shrink-0 border-r border-line/60 hatch-danger flex items-center justify-center text-danger select-none"
                          title={`${room.name}, ${slotRangeText}: Closed (${slotData.reason || 'Blackout'})`}
                        />
                      );
                    }

                    if (slotData.state === 'past') {
                      return (
                        <div
                          key={h}
                          className="w-14 h-12 shrink-0 border-r border-line/40 bg-paper/50 flex items-center justify-center opacity-40 select-none"
                          title={`${room.name}, ${slotRangeText}: Past slot`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-text-2/40" />
                        </div>
                      );
                    }

                    if (slotData.state === 'mine') {
                      return (
                        <div
                          key={h}
                          onClick={(e) => handleCellClick(room, h, slotData, e)}
                          className="w-14 h-12 shrink-0 border-r border-line/60 bg-mine text-white flex items-center justify-center cursor-pointer shadow-xs select-none hover:brightness-110 transition-all"
                          title={`${room.name}, ${slotRangeText}: Your reservation`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      );
                    }

                    if (slotData.state === 'pending') {
                      return (
                        <div
                          key={h}
                          onClick={(e) => handleCellClick(room, h, slotData, e)}
                          className="w-14 h-12 shrink-0 border-r border-line/60 hatch-pending text-pending flex items-center justify-center cursor-pointer select-none hover:brightness-95 transition-all"
                          title={`${room.name}, ${slotRangeText}: Awaiting admin approval`}
                        >
                          <Clock className="w-4 h-4" />
                        </div>
                      );
                    }

                    if (slotData.state === 'booked') {
                      return (
                        <div
                          key={h}
                          onClick={(e) => handleCellClick(room, h, slotData, e)}
                          className="relative w-14 h-12 shrink-0 border-r border-line/60 bg-booked text-text-2 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors select-none"
                          title={`${room.name}, ${slotRangeText}: Booked (${slotData.waitlistCount || 0} waiting)`}
                        >
                          <Lock className="w-3.5 h-3.5 opacity-60" />
                          {slotData.waitlistCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-pending ring-1 ring-white" />
                          )}
                        </div>
                      );
                    }

                    // Default: 'free'
                    return (
                      <div
                        key={h}
                        onClick={(e) => handleCellClick(room, h, slotData, e)}
                        className={`w-14 h-12 shrink-0 border-r border-line/60 bg-free-bg/80 hover:bg-free-bg text-free font-bold text-sm flex items-center justify-center cursor-pointer transition-all select-none group ${
                          isRangeSelected ? 'ring-2 ring-mine bg-mine-bg/50' : ''
                        }`}
                        title={`${room.name}, ${slotRangeText}: Free (Click to book)`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          +
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {/* Vertical Red "Now" line across the timetable board */}
          {nowLineLeft !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
              style={{ left: `${nowLineLeft}px` }}
            >
              <div className="sticky top-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-danger text-white uppercase tracking-wider tabular-nums shadow-xs -translate-x-1/2">
                now {currentHour}:{String(nowMinute).padStart(2, '0')}
              </div>
              <div className="w-[2px] flex-1 bg-danger shadow-xs" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimetableBoard;
