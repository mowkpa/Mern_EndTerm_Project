import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, TrendingUp, Calendar, Clock, MapPin } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import api from '../../api/axios';
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
  onBookAlternative,
  waitlistLoading = false,
}) => {
  if (!room || slot === null || slot === undefined) return null;

  const [alternatives, setAlternatives] = useState([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [releaseRate, setReleaseRate] = useState(null);
  const [releaseSampleSize, setReleaseSampleSize] = useState(0);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [bookingKey, setBookingKey] = useState(null);

  const timeLabel = formatSlotRange(slot);
  const dateLabel = date ? formatDateLabel(date) : 'Today';

  const waitlistCount = slotData?.waitlistCount || 0;
  const isUserOnWaitlist = slotData?.inWaitlist || false;
  const queuePos = slotData?.queuePosition || waitlistCount + 1;

  useEffect(() => {
    if (!isOpen || !room?._id || slot === null || slot === undefined) {
      setAlternatives([]);
      setReleaseRate(null);
      setReleaseSampleSize(0);
      return;
    }

    let active = true;

    const loadData = async () => {
      setAlternativesLoading(true);
      setReleaseLoading(true);

      // 1. Fetch release rate
      try {
        const res = await api.get(`/analytics/room-release-rate?roomId=${room._id}`);
        if (active) {
          setReleaseRate(res.data.rate);
          setReleaseSampleSize(res.data.sampleSize || 0);
        }
      } catch (err) {
        if (active) {
          setReleaseRate(null);
        }
      } finally {
        if (active) setReleaseLoading(false);
      }

      // 2. Fetch alternatives
      try {
        const res = await api.get('/rooms/alternatives', {
          params: {
            roomId: room._id,
            date,
            slot,
            capacity: room.capacity,
          },
        });
        if (active) {
          setAlternatives(res.data.alternatives || []);
        }
      } catch (err) {
        if (active) {
          setAlternatives([]);
        }
      } finally {
        if (active) setAlternativesLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [isOpen, room?._id, date, slot]);

  const handleBookAlt = async (alt) => {
    const key = `${alt.roomId}_${alt.date}_${alt.slot}`;
    setBookingKey(key);
    try {
      if (onBookAlternative) {
        await onBookAlternative(alt);
      }
    } finally {
      setBookingKey(null);
    }
  };

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

        {/* Release likelihood (only shown when sample >= 10 and rate !== null) */}
        {!releaseLoading && releaseRate !== null && releaseSampleSize >= 10 && (
          <div className="p-3.5 bg-paper rounded-panel border border-line flex items-start gap-3 text-xs text-text-2">
            <TrendingUp className="w-4 h-4 text-pending shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Bookings for this room are released about{' '}
              <strong className="text-ink font-semibold">{releaseRate}%</strong> of the time{' '}
              (cancellations and no-shows, last 30 days).
            </p>
          </div>
        )}

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

        {/* Smart Alternatives */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-2">
              <Sparkles className="w-3.5 h-3.5 text-mine" />
              <span>Smart Alternatives</span>
            </div>
            {alternatives.length > 0 && (
              <span className="text-xs text-text-2">
                {alternatives.length} suggestion{alternatives.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {alternativesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-panel" />
              <Skeleton className="h-16 w-full rounded-panel" />
            </div>
          ) : alternatives.length > 0 ? (
            <div className="space-y-2">
              {alternatives.map((alt) => {
                const key = `${alt.roomId}_${alt.date}_${alt.slot}`;
                const isBookingThis = bookingKey === key;
                const isNearby = alt.type === 'nearby_slot';
                const isNextDays = alt.type === 'next_days';

                return (
                  <div
                    key={key}
                    className="p-3 bg-surface rounded-panel border border-line hover:border-mine/30 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink truncate">
                          {alt.roomName}
                        </span>
                        {alt.type === 'same_slot' && (
                          <Badge variant="neutral" size="sm">Same time</Badge>
                        )}
                        {isNearby && (
                          <Badge variant="neutral" size="sm">Nearby slot</Badge>
                        )}
                        {isNextDays && (
                          <Badge variant="warning" size="sm">Later date</Badge>
                        )}
                      </div>
                      <div className="text-xs text-text-2 leading-snug">
                        {alt.reason}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleBookAlt(alt)}
                      isLoading={isBookingThis}
                      className="shrink-0"
                    >
                      Book
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-paper/60 rounded-panel border border-line/60 text-center">
              <p className="text-xs text-text-2">
                No alternative free slots currently match for this room.
              </p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default TakenSlotDrawer;
