import { Waitlist } from '../models/waitlist.model.js';
import { Booking } from '../models/booking.model.js';
import { Room } from '../models/room.model.js';
import { Blackout } from '../models/blackout.model.js';
import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';
import { slotStart, slotEnd, todayIST, addDaysIST, isValidDateString } from '../utils/time.js';
import { createBooking } from './booking.service.js';
import { notify } from './notification.service.js';

export const joinWaitlist = async ({ user, roomId, date, slot, now = new Date() }) => {
  // 1. Validate date and slot parameters
  if (!isValidDateString(date) || !Number.isInteger(slot) || slot < 0 || slot > 23) {
    throw httpError(400, 'Invalid date or slot parameter');
  }

  // 2. Room exists and isActive
  const room = await Room.findById(roomId);
  if (!room || !room.isActive) {
    throw httpError(404, 'Room is not available');
  }

  // 3. Operating hours check
  if (slot < room.openHour || slot >= room.closeHour) {
    throw httpError(400, `Slot is outside operating hours (${room.openHour}:00 - ${room.closeHour}:00)`);
  }

  // 4. Past slot check
  if (slotStart(date, slot) <= now) {
    throw httpError(400, 'Cannot join waitlist for a past slot');
  }

  // 5. Booking window check
  const today = todayIST(now);
  const maxDate = addDaysIST(today, env.MAX_ADVANCE_DAYS);
  if (date < today || date > maxDate) {
    throw httpError(400, `Waitlist requests can only be made within ${env.MAX_ADVANCE_DAYS} days in advance`);
  }

  // 6. Blackout check
  const blackout = await Blackout.findOne({
    date,
    room: { $in: [room._id, null] },
  });
  if (blackout) {
    throw httpError(409, `Room is closed on this date: ${blackout.reason}`);
  }

  // 7. Slot must currently be held
  const isHeld = await Booking.exists({
    room: room._id,
    date,
    slot,
    holdsSlot: true,
  });
  if (!isHeld) {
    throw httpError(409, 'Slot is free, book it directly');
  }

  // 8. User must not already hold a booking in this slot across any room
  const userConflict = await Booking.exists({
    user: user._id,
    date,
    slot,
    holdsSlot: true,
  });
  if (userConflict) {
    throw httpError(409, 'You already hold an active booking in this time slot');
  }

  try {
    const entry = await Waitlist.create({
      room: room._id,
      date,
      slot,
      user: user._id,
      status: 'waiting',
    });

    const queuePosition = await Waitlist.countDocuments({
      room: room._id,
      date,
      slot,
      status: 'waiting',
      createdAt: { $lte: entry.createdAt },
    });

    const populated = await Waitlist.findById(entry._id).populate('room', 'name building capacity');

    return {
      entry: populated,
      queuePosition,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, 'Already on the waitlist for this slot');
    }
    throw error;
  }
};

export const leaveWaitlist = async ({ user, entryId }) => {
  const entry = await Waitlist.findById(entryId);
  if (!entry) {
    throw httpError(404, 'Waitlist entry not found');
  }

  if (entry.user.toString() !== user._id.toString()) {
    throw httpError(403, 'Forbidden: You cannot cancel another user\'s waitlist entry');
  }

  if (entry.status !== 'waiting') {
    throw httpError(409, `Waitlist entry is no longer active (status: ${entry.status})`);
  }

  entry.status = 'cancelled';
  await entry.save();

  return { message: 'Removed from waitlist successfully', entry };
};

export const getMyWaitlist = async (userId) => {
  const entries = await Waitlist.find({
    user: userId,
    status: 'waiting',
  })
    .populate('room', 'name building capacity requiresApproval openHour closeHour')
    .sort({ date: 1, slot: 1 });

  const populatedWithPositions = await Promise.all(
    entries.map(async (entry) => {
      const position = await Waitlist.countDocuments({
        room: entry.room._id,
        date: entry.date,
        slot: entry.slot,
        status: 'waiting',
        createdAt: { $lte: entry.createdAt },
      });
      return {
        ...entry.toObject(),
        queuePosition: position,
      };
    })
  );

  return populatedWithPositions;
};

export const promoteNext = async (roomId, date, slot, now = new Date()) => {
  // If slot has already ended, expire all waiting entries
  if (slotEnd(date, slot) <= now) {
    await Waitlist.updateMany(
      { room: roomId, date, slot, status: 'waiting' },
      { $set: { status: 'expired' } }
    );
    return null;
  }

  // FIFO promotion loop
  while (true) {
    const entry = await Waitlist.findOne({
      room: roomId,
      date,
      slot,
      status: 'waiting',
    })
      .sort({ createdAt: 1 })
      .populate('user');

    if (!entry) {
      return null;
    }

    try {
      const booking = await createBooking({
        user: entry.user,
        roomId,
        date,
        slot,
        purpose: 'Waitlist auto-promotion',
        fromWaitlist: true,
        now,
      });

      entry.status = 'promoted';
      await entry.save();

      // If slot has already started, give at least 10 minutes grace
      if (booking.startsAt <= now) {
        const extendedDeadline = new Date(
          Math.min(
            Math.max(booking.checkInDeadline.getTime(), now.getTime() + 10 * 60 * 1000),
            booking.endsAt.getTime()
          )
        );
        booking.checkInDeadline = extendedDeadline;
        await booking.save();
      }

      await notify(
        entry.user._id,
        'waitlist_promoted',
        `A slot opened up for ${booking.room.name} on ${booking.date} (Slot ${booking.slot}:00)! You have been booked automatically.`,
        booking._id
      );

      return booking;
    } catch (err) {
      // If validation/conflict failed (e.g. user reached quota or booked another room in the meantime),
      // expire this entry and continue FIFO to the next candidate
      if (err.status === 409 || err.status === 400) {
        if (err.code === 'SLOT_TAKEN') {
          // The slot was claimed by someone else simultaneously
          return null;
        }
        entry.status = 'expired';
        await entry.save();
        continue;
      }
      throw err;
    }
  }
};
