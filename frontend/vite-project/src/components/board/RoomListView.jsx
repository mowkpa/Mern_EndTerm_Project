import React, { useState } from 'react';
import { Lock, Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatSlotHour } from '../../utils/time';

export const RoomListView = ({
  rooms = [],
  onSelectFreeSlot,
  onSelectBookedSlot,
}) => {
  const [expandedRooms, setExpandedRooms] = useState({});

  const toggleExpand = (roomId) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  return (
    <div className="space-y-4">
      {rooms.map((room) => {
        const isExpanded = !!expandedRooms[room._id];
        const allSlots = room.slots || [];
        const freeSlots = allSlots.filter((s) => s.state === 'free');
        const visibleSlots = isExpanded ? allSlots : freeSlots;

        return (
          <div
            key={room._id}
            className="p-4 bg-surface rounded-panel border border-line space-y-3 shadow-2xs"
          >
            {/* Room Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-base text-ink">
                    {room.name}
                  </h3>
                  {room.requiresApproval && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-chip bg-pending-bg text-pending border border-pending/20">
                      Approval
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-2 mt-0.5">
                  {room.building} • {room.capacity} seats • Hours {room.openHour}:00 - {room.closeHour}:00
                </p>
              </div>

              {allSlots.length > freeSlots.length && (
                <button
                  type="button"
                  onClick={() => toggleExpand(room._id)}
                  className="text-xs font-semibold text-mine hover:underline flex items-center gap-0.5"
                >
                  <span>{isExpanded ? 'Free only' : 'All hours'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Slots Chips Row */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-text-2 block">
                {isExpanded ? 'All hourly slots:' : `Available slots (${freeSlots.length} free):`}
              </span>

              {visibleSlots.length === 0 ? (
                <div className="text-xs text-text-2/70 py-2">
                  No available slots remaining today for this room.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {visibleSlots.map((slotObj) => {
                    const timeLabel = formatSlotHour(slotObj.slot);

                    if (slotObj.state === 'free') {
                      return (
                        <button
                          key={slotObj.slot}
                          type="button"
                          onClick={() => onSelectFreeSlot?.(room, slotObj)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-chip bg-free-bg text-free border border-free/30 hover:bg-free hover:text-white transition-colors"
                        >
                          {timeLabel}
                        </button>
                      );
                    }

                    if (slotObj.state === 'mine') {
                      return (
                        <button
                          key={slotObj.slot}
                          type="button"
                          onClick={() => onSelectBookedSlot?.(room, slotObj)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-chip bg-mine text-white border border-mine flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>{timeLabel}</span>
                        </button>
                      );
                    }

                    if (slotObj.state === 'booked') {
                      return (
                        <button
                          key={slotObj.slot}
                          type="button"
                          onClick={() => onSelectBookedSlot?.(room, slotObj)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-chip bg-booked text-text-2 border border-line flex items-center gap-1 hover:bg-slate-200"
                        >
                          <Lock className="w-3 h-3 opacity-60" />
                          <span>{timeLabel}</span>
                        </button>
                      );
                    }

                    if (slotObj.state === 'pending') {
                      return (
                        <button
                          key={slotObj.slot}
                          type="button"
                          onClick={() => onSelectBookedSlot?.(room, slotObj)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-chip hatch-pending text-pending border border-pending/30 flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{timeLabel}</span>
                        </button>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RoomListView;
