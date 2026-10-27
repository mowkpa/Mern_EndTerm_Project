import cron from 'node-cron';
import { Booking } from '../models/booking.model.js';
import { Waitlist } from '../models/waitlist.model.js';
import { transitionBooking } from './booking.service.js';
import { promoteNext } from './waitlist.service.js';
import { notify } from './notification.service.js';
import { slotEnd } from '../utils/time.js';

/**
 * Automatically marks approved bookings whose check-in deadline has elapsed as no_show,
 * releases the slot, and auto-promotes the next person on the waitlist.
 */
export const releaseNoShows = async (now = new Date()) => {
  const missedBookings = await Booking.find({
    status: 'approved',
    checkInDeadline: { $lt: now },
  }).populate('room user');

  let releasedCount = 0;
  for (const booking of missedBookings) {
    try {
      const updated = await transitionBooking(booking._id, 'approved', 'no_show');
      releasedCount++;

      await notify(
        booking.user._id,
        'no_show_released',
        `Your reservation for ${booking.room.name} on ${booking.date} (Slot ${booking.slot}:00) was released as a no-show because check-in was not completed within the grace period.`,
        booking._id
      );

      // Promote next person in line
      await promoteNext(booking.room._id, booking.date, booking.slot, now);
    } catch (err) {
      // If already transitioned concurrently, skip safely
    }
  }

  return releasedCount;
};

/**
 * Expires pending booking requests whose slot start time has arrived without admin decision.
 */
export const expirePending = async (now = new Date()) => {
  const pendingExpired = await Booking.find({
    status: 'pending',
    startsAt: { $lte: now },
  }).populate('room user');

  let expiredCount = 0;
  for (const booking of pendingExpired) {
    try {
      await transitionBooking(booking._id, 'pending', 'expired');
      expiredCount++;

      await notify(
        booking.user._id,
        'pending_expired',
        `Your booking request for ${booking.room.name} on ${booking.date} expired without an administrative decision prior to slot start.`,
        booking._id
      );
    } catch (err) {
      // Handled concurrently
    }
  }

  return expiredCount;
};

/**
 * Transitions checked-in bookings whose slot end has passed to completed.
 */
export const completeFinished = async (now = new Date()) => {
  const finishedBookings = await Booking.find({
    status: 'checked_in',
    endsAt: { $lte: now },
  });

  let completedCount = 0;
  for (const booking of finishedBookings) {
    try {
      await transitionBooking(booking._id, 'checked_in', 'completed');
      completedCount++;
    } catch (err) {
      // Handled concurrently
    }
  }

  return completedCount;
};

/**
 * Expires active waitlist entries whose slot has ended.
 */
export const expireWaitlist = async (now = new Date()) => {
  const waitingEntries = await Waitlist.find({ status: 'waiting' });
  let expiredCount = 0;

  for (const entry of waitingEntries) {
    const end = slotEnd(entry.date, entry.slot);
    if (end <= now) {
      entry.status = 'expired';
      await entry.save();
      expiredCount++;
    }
  }

  return expiredCount;
};

/**
 * Master idempotent reconciliation function.
 * Safe to call repeatedly without state corruption.
 */
export const reconcile = async (now = new Date()) => {
  const releasedNoShows = await releaseNoShows(now);
  const expiredPending = await expirePending(now);
  const completedFinished = await completeFinished(now);
  const expiredWaitlist = await expireWaitlist(now);

  return {
    releasedNoShows,
    expiredPending,
    completedFinished,
    expiredWaitlist,
    timestamp: now.toISOString(),
  };
};

/**
 * Initializes cron schedule and startup reconciliation.
 */
export const startScheduler = () => {
  // 1. Run once on startup
  reconcile()
    .then((result) => {
      console.log('[Scheduler] Startup reconcile complete:', result);
    })
    .catch((err) => {
      console.error('[Scheduler] Startup reconcile error:', err.message);
    });

  // 2. Schedule cron to run every minute (* * * * *)
  const task = cron.schedule('* * * * *', async () => {
    try {
      await reconcile();
    } catch (err) {
      console.error('[Scheduler] Cron reconcile error:', err.message);
    }
  });

  return task;
};
