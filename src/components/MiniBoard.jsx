import React from 'react';
import { motion } from 'motion/react';
import { Lock, Check, Clock } from 'lucide-react';

export const MiniBoard = ({ className = '' }) => {
  const sampleRooms = [
    { name: 'Study Room A-101', capacity: 4, reqApproval: false },
    { name: 'Seminar Room B-204', capacity: 50, reqApproval: true },
    { name: 'Computer Lab C-102', capacity: 30, reqApproval: false },
  ];

  const hours = ['2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'];

  // Static matrix: rows: rooms, cols: hours
  // states: 'past' | 'booked' | 'free' | 'mine' | 'pending'
  const grid = [
    ['past', 'booked', 'free', 'free', 'mine', 'free'],
    ['past', 'booked', 'pending', 'free', 'free', 'free'],
    ['past', 'free', 'booked', 'free', 'free', 'booked'],
  ];

  const renderCell = (state, key) => {
    switch (state) {
      case 'past':
        return (
          <div
            key={key}
            className="h-9 rounded-chip bg-paper/60 border border-line/40 flex items-center justify-center opacity-40 select-none"
            title="Past time"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-text-2/40" />
          </div>
        );
      case 'booked':
        return (
          <div
            key={key}
            className="h-9 rounded-chip bg-booked border border-line flex items-center justify-center text-text-2 select-none"
            title="Occupied"
          >
            <Lock className="w-3.5 h-3.5 opacity-60" />
          </div>
        );
      case 'mine':
        return (
          <div
            key={key}
            className="h-9 rounded-chip bg-mine border border-mine flex items-center justify-center text-white select-none shadow-xs"
            title="Your booking"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        );
      case 'pending':
        return (
          <div
            key={key}
            className="h-9 rounded-chip hatch-pending border border-pending/30 flex items-center justify-center text-pending select-none"
            title="Pending approval"
          >
            <Clock className="w-3.5 h-3.5" />
          </div>
        );
      case 'free':
      default:
        return (
          <div
            key={key}
            className="h-9 rounded-chip bg-free-bg border border-free/30 flex items-center justify-center text-free font-bold text-xs select-none hover:bg-free/20 transition-colors"
            title="Available"
          >
            +
          </div>
        );
    }
  };

  return (
    <div
      className={`relative bg-surface rounded-panel border border-line p-4 shadow-floating overflow-hidden select-none ${className}`}
    >
      {/* Header Row */}
      <div className="grid grid-cols-7 gap-2 pb-2.5 border-b border-line text-xs font-semibold text-text-2">
        <div className="text-left font-medium text-text-2/70">Room</div>
        {hours.map((h) => (
          <div key={h} className="text-center tabular-nums">
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="relative divide-y divide-line/60 pt-1">
        {sampleRooms.map((room, rIdx) => (
          <div key={room.name} className="grid grid-cols-7 gap-2 items-center py-2">
            <div className="pr-1 text-left">
              <div className="text-xs font-bold text-ink truncate leading-tight">
                {room.name}
              </div>
              <div className="text-[10px] text-text-2 mt-0.5">
                {room.capacity} seats {room.reqApproval && '• Req'}
              </div>
            </div>
            {grid[rIdx].map((state, cIdx) => renderCell(state, `${rIdx}-${cIdx}`))}
          </div>
        ))}

        {/* Live animated "Now" line */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: '100%', opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
          style={{ left: '42%' }}
        >
          <span className="text-[9px] font-bold px-1 py-0.2 rounded-full bg-danger text-white uppercase tracking-wider tabular-nums shadow-xs">
            Now
          </span>
          <div className="w-[2px] flex-1 bg-danger shadow-xs" />
        </motion.div>
      </div>

      {/* Mini Legend */}
      <div className="pt-3 mt-1 border-t border-line flex items-center justify-between text-[11px] text-text-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-free-bg border border-free/40" />
          Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-mine" />
          Yours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-booked border border-line" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs hatch-pending border border-pending/40" />
          Pending
        </span>
      </div>
    </div>
  );
};

export default MiniBoard;
