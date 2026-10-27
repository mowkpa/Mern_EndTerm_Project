import React from 'react';
import { Clock, Users, Check, Lock, AlertCircle } from 'lucide-react';

export default function SlotGrid({
  room,
  slots,
  onSelectFreeSlot,
  onSelectBookedSlot,
}) {
  const getSlotStateConfig = (slot) => {
    switch (slot.state) {
      case 'free':
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border-emerald-200 cursor-pointer hover:shadow-xs active:scale-95',
          label: 'Available',
          badge: 'Free',
          badgeClass: 'bg-emerald-100 text-emerald-800',
        };
      case 'mine':
        return {
          bg: 'bg-primary-600 text-white border-primary-700 shadow-xs ring-2 ring-primary-400/30 cursor-default',
          label: 'Your Booking',
          badge: slot.pending ? 'Pending Approval' : 'Reserved',
          badgeClass: slot.pending ? 'bg-amber-400 text-amber-950 font-semibold' : 'bg-white/20 text-white',
        };
      case 'booked':
        return {
          bg: 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200 cursor-pointer active:scale-95',
          label: 'Occupied',
          badge: slot.pending ? 'Pending' : 'Booked',
          badgeClass: 'bg-slate-200 text-slate-700',
        };
      case 'blackout':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200 cursor-not-allowed opacity-90',
          label: 'Closed',
          badge: 'Blackout',
          badgeClass: 'bg-amber-100 text-amber-800',
        };
      case 'past':
      default:
        return {
          bg: 'bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-60',
          label: 'Past',
          badge: 'Past',
          badgeClass: 'bg-slate-100 text-slate-400',
        };
    }
  };

  const handleSlotClick = (slot) => {
    if (slot.state === 'free') {
      onSelectFreeSlot(room, slot);
    } else if (slot.state === 'booked') {
      onSelectBookedSlot(room, slot);
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        {slots.map((slot) => {
          const config = getSlotStateConfig(slot);
          const timeLabel = `${String(slot.slot).padStart(2, '0')}:00`;

          return (
            <button
              key={slot.slot}
              type="button"
              onClick={() => handleSlotClick(slot)}
              disabled={slot.state === 'past' || slot.state === 'blackout' || slot.state === 'mine'}
              className={`flex-none w-24 sm:w-28 p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between select-none ${config.bg}`}
              title={`${room.name} @ ${timeLabel} — ${config.label}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold tracking-tight">
                  {timeLabel}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${config.badgeClass}`}>
                  {config.badge}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                {slot.state === 'free' && (
                  <span className="text-emerald-700 font-medium">Click to book</span>
                )}
                {slot.state === 'mine' && (
                  <span className="font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Mine
                  </span>
                )}
                {slot.state === 'booked' && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <Users className="w-3 h-3" />
                    {slot.onWaitlist ? (
                      <span className="text-primary-600 font-semibold">On waitlist</span>
                    ) : slot.waitlistCount > 0 ? (
                      <span>{slot.waitlistCount} waiting</span>
                    ) : (
                      <span>Join waitlist</span>
                    )}
                  </div>
                )}
                {slot.state === 'blackout' && (
                  <span className="text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" /> Closed
                  </span>
                )}
                {slot.state === 'past' && (
                  <span className="text-[10px] text-slate-400">Unavailable</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
