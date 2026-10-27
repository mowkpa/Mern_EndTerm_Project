import { describe, it, expect } from 'vitest';
import { createTestUser } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Waitlist } from '../src/models/waitlist.model.js';
import {
  releaseNoShows,
  expirePending,
  completeFinished,
  reconcile,
} from '../src/services/scheduler.service.js';
import { slotStart } from '../src/utils/time.js';

describe('Scheduler Service: No-Show, Expiry and Reconcile', () => {
  it('releases missed check-ins as no_show and promotes waitlist', async () => {
    const room = await Room.create({
      name: 'No-Show Room',
      building: 'Hall',
      capacity: 10,
    });

    const user1 = await createTestUser();
    const waitlistedUser = await createTestUser();
    const targetDate = '2026-11-25';
    const targetSlot = 10;
    const startsAt = slotStart(targetDate, targetSlot); // 10:00 IST
    const deadline = new Date(startsAt.getTime() + 15 * 60 * 1000); // 10:15 IST

    // Approved booking with deadline at 10:15
    const booking = await Booking.create({
      room: room._id,
      user: user1._id,
      date: targetDate,
      slot: targetSlot,
      purpose: 'Unattended booking',
      status: 'approved',
      holdsSlot: true,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      checkInDeadline: deadline,
    });

    // Waitlisted user queued
    await Waitlist.create({
      room: room._id,
      date: targetDate,
      slot: targetSlot,
      user: waitlistedUser._id,
      status: 'waiting',
    });

    // Simulated current time: 10:16 IST (1 minute past deadline)
    const simulatedNow = new Date(deadline.getTime() + 60 * 1000);

    const count = await releaseNoShows(simulatedNow);
    expect(count).toBe(1);

    // Verify original booking is no_show and slot is freed
    const updatedOriginal = await Booking.findById(booking._id);
    expect(updatedOriginal.status).toBe('no_show');
    expect(updatedOriginal.holdsSlot).toBe(false);

    // Verify waitlisted user was promoted
    const promotedBooking = await Booking.findOne({
      room: room._id,
      date: targetDate,
      slot: targetSlot,
      user: waitlistedUser._id,
    });
    expect(promotedBooking).toBeDefined();
    expect(promotedBooking.holdsSlot).toBe(true);
    expect(promotedBooking.fromWaitlist).toBe(true);
  });

  it('expires pending bookings when slot start arrives without decision', async () => {
    const room = await Room.create({
      name: 'Pending Expire Room',
      building: 'Hall',
      capacity: 10,
      requiresApproval: true,
    });
    const user = await createTestUser();
    const targetDate = '2026-11-26';
    const targetSlot = 14;
    const startsAt = slotStart(targetDate, targetSlot);

    const pendingBooking = await Booking.create({
      room: room._id,
      user: user._id,
      date: targetDate,
      slot: targetSlot,
      purpose: 'Never approved',
      status: 'pending',
      holdsSlot: true,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
    });

    // Simulated time: exactly slot start
    const count = await expirePending(startsAt);
    expect(count).toBe(1);

    const updated = await Booking.findById(pendingBooking._id);
    expect(updated.status).toBe('expired');
    expect(updated.holdsSlot).toBe(false);
  });

  it('completes finished checked_in bookings after slot end', async () => {
    const room = await Room.create({
      name: 'Finished Room',
      building: 'Hall',
      capacity: 10,
    });
    const user = await createTestUser();
    const targetDate = '2026-11-27';
    const targetSlot = 9;
    const startsAt = slotStart(targetDate, targetSlot);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // 10:00

    const booking = await Booking.create({
      room: room._id,
      user: user._id,
      date: targetDate,
      slot: targetSlot,
      purpose: 'Session attended',
      status: 'checked_in',
      holdsSlot: true,
      startsAt,
      endsAt,
      checkedInAt: startsAt,
    });

    // Simulated time: 10:05 (past end)
    const simulatedNow = new Date(endsAt.getTime() + 5 * 60 * 1000);

    const count = await completeFinished(simulatedNow);
    expect(count).toBe(1);

    const updated = await Booking.findById(booking._id);
    expect(updated.status).toBe('completed');
    expect(updated.holdsSlot).toBe(false);
  });

  it('reconcile is completely idempotent: running it twice changes nothing on second run', async () => {
    const room = await Room.create({
      name: 'Idempotent Room',
      building: 'Hall',
      capacity: 10,
    });
    const user = await createTestUser();
    const targetDate = '2026-11-28';
    const targetSlot = 12;
    const startsAt = slotStart(targetDate, targetSlot);
    const deadline = new Date(startsAt.getTime() + 15 * 60 * 1000);

    await Booking.create({
      room: room._id,
      user: user._id,
      date: targetDate,
      slot: targetSlot,
      purpose: 'Idempotency test',
      status: 'approved',
      holdsSlot: true,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      checkInDeadline: deadline,
    });

    const simulatedNow = new Date(deadline.getTime() + 5 * 60 * 1000);

    // First reconcile run
    const result1 = await reconcile(simulatedNow);
    expect(result1.releasedNoShows).toBe(1);

    // Second reconcile run on identical time
    const result2 = await reconcile(simulatedNow);
    expect(result2.releasedNoShows).toBe(0);
    expect(result2.expiredPending).toBe(0);
    expect(result2.completedFinished).toBe(0);
    expect(result2.expiredWaitlist).toBe(0);
  });
});
