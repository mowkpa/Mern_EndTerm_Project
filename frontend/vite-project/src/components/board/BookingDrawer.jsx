import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatSlotRange, formatDateLabel } from '../../utils/time';

export const BookingDrawer = ({
  isOpen,
  onClose,
  room,
  date,
  slot,
  selectedSlots = [], // for range booking
  onSubmit,
  isLoading,
  error,
  errorCode,
  onSwitchToTakenDrawer,
}) => {
  const { user } = useSelector((state) => state.auth);
  const [purpose, setPurpose] = useState('Group study');

  useEffect(() => {
    if (isOpen) {
      setPurpose('Group study');
    }
  }, [isOpen]);

  const purposePresets = ['Group study', 'Project meeting', 'Class coursework', 'Club event'];

  const slotsToBook = selectedSlots.length > 0 ? selectedSlots : [slot];
  const startSlot = slotsToBook[0];
  const endSlot = slotsToBook[slotsToBook.length - 1] + 1;
  const timeLabel = formatSlotRange(startSlot, endSlot);
  const dateLabel = date ? formatDateLabel(date) : 'Today';

  const userQuota = user?.role === 'faculty' ? 6 : user?.role === 'admin' ? 'Unlimited' : 3;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!purpose.trim() || purpose.trim().length < 3) return;
    onSubmit?.(purpose.trim(), slotsToBook);
  };

  if (!room) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={room.name}
      subtitle={`${room.building} • ${room.capacity} seats`}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!purpose.trim() || purpose.trim().length < 3}
          >
            {room.requiresApproval ? 'Request approval' : `Book ${timeLabel}`}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Slot details card */}
        <div className="p-3.5 bg-paper rounded-panel border border-line space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
            Selected Reservation Window
          </span>
          <div className="text-sm font-bold text-ink">
            {dateLabel}, {timeLabel}{' '}
            {slotsToBook.length > 1 && (
              <span className="text-xs font-normal text-mine">
                ({slotsToBook.length} consecutive hours)
              </span>
            )}
          </div>
        </div>

        {/* Purpose with quick chips */}
        <div className="space-y-2">
          <Input
            label="Booking Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Distributed Systems Lab Project"
            helperText="Provide 3 to 200 characters explaining your room usage."
            required
            autoFocus
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {purposePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPurpose(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-chip border transition-colors ${
                  purpose === preset
                    ? 'bg-mine-bg text-mine border-mine font-semibold'
                    : 'bg-surface text-text-2 border-line hover:bg-paper'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Quota reminder */}
        <div className="p-3 bg-paper/60 rounded-control border border-line text-xs text-text-2 flex items-center justify-between">
          <span>Daily quota limit ({user?.role}):</span>
          <span className="font-bold text-ink tabular-nums">
            {typeof userQuota === 'number' ? `${userQuota} slots/day` : userQuota}
          </span>
        </div>

        {/* Restricted room notice */}
        {room.requiresApproval && (
          <div className="p-3 bg-pending-bg/50 rounded-control border border-pending/30 flex items-start gap-2.5 text-xs text-ink">
            <ShieldAlert className="w-4 h-4 text-pending shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-pending">Approval needed: </span>
              Your reservation request will be held and routed to campus administration for review.
            </div>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="p-3 bg-danger-bg rounded-control border border-danger/30 text-xs text-danger space-y-2">
            <p className="font-semibold">{error}</p>
            {errorCode === 'SLOT_TAKEN' && onSwitchToTakenDrawer && (
              <button
                type="button"
                onClick={onSwitchToTakenDrawer}
                className="text-xs font-bold underline hover:no-underline text-danger block"
              >
                Slot was just taken. View waitlist options →
              </button>
            )}
          </div>
        )}
      </form>
    </Drawer>
  );
};

export default BookingDrawer;
