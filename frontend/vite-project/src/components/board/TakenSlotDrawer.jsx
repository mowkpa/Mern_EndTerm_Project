import React from 'react';
import { Lock, Users, Clock, Sparkles } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { formatSlotRange, formatDateLabel } from '../../utils/time';

export const TakenSlotDrawer = ({
  isOpen,
  onClose,
  room,
  date,
  slot,
  slotData,
  onJoinWaitlist,
  onLeaveWaitlist,
  waitlistLoading = false,
}) => {
  if (!room || slot === null || slot === undefined) return null;

  const timeLabel = formatSlotRange(slot);
  const dateLabel = date ? formatDateLabel(date) : 'Today';

  const waitlistCount = slotData?.waitlistCount || 0;
  const isUserOnWaitlist = slotData?.inWaitlist || false;
  const queuePos = slotData?.queuePosition || waitlistCount + 1;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={room.name}
      subtitle={`${room.building} • ${room.capacity} seats`}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {isUserOnWaitlist ? (
            <Button
              variant="danger"
              onClick={onLeaveWaitlist}
              isLoading={waitlistLoading}
            >
              Leave waitlist
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onJoinWaitlist}
              isLoading={waitlistLoading}
            >
              Join waitlist
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Occupied slot banner */}
        <div className="p-4 bg-booked rounded-panel border border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-control bg-surface border border-line flex items-center justify-center text-text-2">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">
                {dateLabel}, {timeLabel}
              </div>
              <div className="text-xs text-text-2">This slot is currently occupied.</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-chip bg-surface border border-line text-text-2">
            Occupied
          </span>
        </div>

        {/* Waitlist Position Status */}
        <div className="p-4 bg-surface rounded-panel border border-line space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-2">
              FIFO Waitlist Queue
            </span>
            <span className="text-xs font-bold text-mine tabular-nums">
              {waitlistCount} waiting
            </span>
          </div>

          {isUserOnWaitlist ? (
            <div className="p-3 bg-mine-bg/40 rounded-control border border-mine/20 text-xs text-ink space-y-1">
              <div className="font-bold text-mine">You are #{queuePos} in line.</div>
              <p className="text-text-2">
                We will automatically reserve this slot for you if the holder cancels or misses the 15-minute check-in deadline.
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-2 leading-relaxed">
              {waitlistCount === 0
                ? 'No one is currently waiting. You will be #1 in line!'
                : `There are ${waitlistCount} student${waitlistCount > 1 ? 's' : ''} ahead of you. You will join at position #${waitlistCount + 1}.`}
            </p>
          )}
        </div>

        {/* Alternatives & Release Rate Placeholder (Coming in E4) */}
        <div className="p-4 bg-paper/60 rounded-panel border border-line/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-2">
            <Sparkles className="w-3.5 h-3.5 text-mine" />
            <span>Smart Recommendations</span>
          </div>
          <p className="text-xs text-text-2/70 leading-relaxed">
            Historical release likelihood (cancellations and no-shows) and smart alternative spaces will appear here in E4.
          </p>
        </div>
      </div>
    </Drawer>
  );
};

export default TakenSlotDrawer;
