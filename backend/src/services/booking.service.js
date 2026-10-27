import { Booking, ACTIVE_STATUSES } from '../models/booking.model.js';
import { Room } from '../models/room.model.js';
import { Blackout } from '../models/blackout.model.js';
import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';
import { slotStart, slotEnd, todayIST, addDaysIST, isValidDateString } from '../utils/time.js';
import { notify, notifyAdmins } from './notification.service.js';
import { getIO } from '../socket.js';

export const TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled', 'expired'],
  approved: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
  expired: [],
  no_show: [],
};

/**
 * Atomically transitions a booking from one of `from` statuses to `to` status.
 */
export const transitionBooking = async (id, from, to, extra = {}) => {
  const allowedFrom = Array.isArray(from) ? from : [from];
  const holdsSlot = ACTIVE_STATUSES.includes(to);

  const updated = await Booking.findOneAndUpdate(
    {
      _id: id,
      status: { $in: allowedFrom },
    },
    {
      $set: {
        status: to,
        holdsSlot,
        ...extra,
      },
    },
    { new: true }
  ).populate('room user', 'name email role building');

  if (!updated) {
    throw httpError(409, 'Booking is no longer in a valid state for this action');
  }

  // Real-time broadcast
  const io = getIO();
  if (io) {
    io.to(`date:${updated.date}`).emit('availability:changed', {
      roomId: updated.room._id || updated.room,
      date: updated.date,
      slot: updated.slot,
    });
  }

  return updated;
};

/**
 * Approve a pending booking (Admin only)
 */
export const approveBooking = async (id, admin, now = new Date()) => {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  if (booking.status !== 'pending') {
    throw httpError(409, `Cannot approve booking with status "${booking.status}"`);
  }

  if (booking.startsAt <= now) {
    throw httpError(409, 'Cannot approve a booking whose time slot has already started');
  }

  const updated = await transitionBooking(id, 'pending', 'approved', {
    decidedBy: admin._id,
    decisionNote: '',
  });

  await notify(
    updated.user._id,
    'booking_approved',
    `Your booking for ${updated.room.name} on ${updated.date} (Slot ${updated.slot}:00) was approved.`,
    updated._id
  );
  await notifyAdmins('approval_decided', `Booking ${updated._id} approved by ${admin.name}`, updated._id);

  return updated;
};

/**
 * Reject a pending booking (Admin only)
 */
export const rejectBooking = async (id, admin, note = '', now = new Date()) => {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  if (booking.status !== 'pending') {
    throw httpError(409, `Cannot reject booking with status "${booking.status}"`);
  }

  const updated = await transitionBooking(id, 'pending', 'rejected', {
    decidedBy: admin._id,
    decisionNote: note,
  });

  await notify(
    updated.user._id,
    'booking_rejected',
    `Your booking request for ${updated.room.name} was rejected.${note ? ' Note: ' + note : ''}`,
    updated._id
  );
  await notifyAdmins('approval_decided', `Booking ${updated._id} rejected by ${admin.name}`, updated._id);

  // Trigger waitlist promotion if any waitlisted user is queued
  import('./waitlist.service.js')
    .then((m) => m.promoteNext && m.promoteNext(updated.room._id, updated.date, updated.slot, now))
    .catch(() => {});

  return updated;
};

/**
 * Get all pending bookings for admin review
 */
export const getPendingApprovals = async () => {
  return Booking.find({ status: 'pending' })
    .populate('room', 'name building capacity equipment requiresApproval openHour closeHour')
    .populate('user', 'name email role department')
    .sort({ date: 1, slot: 1, createdAt: 1 });
};

/**
 * Validates and creates a booking.
 */
export const createBooking = async ({
  user,
  roomId,
  date,
  slot,
  purpose,
  fromWaitlist = false,
  now = new Date(),
}) => {
  // 1. Validate date format and slot number
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
  const startsAt = slotStart(date, slot);
  if (startsAt <= now) {
    throw httpError(400, 'Cannot book a past slot');
  }

  // 5. Booking window check (todayIST up to MAX_ADVANCE_DAYS)
  const today = todayIST(now);
  const maxDate = addDaysIST(today, env.MAX_ADVANCE_DAYS);
  if (date < today || date > maxDate) {
    throw httpError(400, `Bookings can only be made up to ${env.MAX_ADVANCE_DAYS} days in advance`);
  }

  // 6. Blackout dates check
  const blackout = await Blackout.findOne({
    date,
    room: { $in: [room._id, null] },
  });
  if (blackout) {
    throw httpError(409, `Room is closed on this date: ${blackout.reason}`);
  }

  // 7. Daily quota check (students & faculty only; admin has no quota)
  const userRole = user.role || 'student';
  if (userRole !== 'admin') {
    const quotaLimit = userRole === 'faculty' ? env.QUOTA_FACULTY : env.QUOTA_STUDENT;
    const activeCount = await Booking.countDocuments({
      user: user._id,
      date,
      holdsSlot: true,
    });

    if (activeCount >= quotaLimit) {
      throw httpError(409, `Daily booking quota of ${quotaLimit} active slots reached for ${date}`);
    }
  }

  // 8. Booking state setup
  const endsAt = slotEnd(date, slot);
  const checkInDeadline = new Date(startsAt.getTime() + env.GRACE_MINUTES * 60 * 1000);
  const status = room.requiresApproval ? 'pending' : 'approved';

  try {
    const booking = await Booking.create({
      room: room._id,
      user: user._id,
      date,
      slot,
      purpose,
      status,
      holdsSlot: true,
      checkInDeadline,
      startsAt,
      endsAt,
      fromWaitlist,
    });

    // Populate for response
    const populated = await Booking.findById(booking._id).populate('room user', 'name email role building');

    // Realtime broadcast
    const io = getIO();
    if (io) {
      io.to(`date:${date}`).emit('availability:changed', {
        roomId: room._id,
        date,
        slot,
      });
    }

    if (status === 'pending') {
      await notifyAdmins('approval_requested', `New approval request for ${room.name} by ${user.name}`, booking._id);
    }

    return populated;
  } catch (error) {
    if (error.code === 11000) {
      const pattern = error.keyPattern || {};
      const msg = error.message || '';

      if (pattern.room || msg.includes('uniq_active_room_slot')) {
        throw httpError(409, 'This slot was just booked by someone else', 'SLOT_TAKEN');
      }

      if (pattern.user || msg.includes('uniq_active_user_slot')) {
        throw httpError(409, 'You already have a booking in this time slot', 'USER_CONFLICT');
      }

      throw httpError(409, 'Slot is no longer available', 'SLOT_TAKEN');
    }
    throw error;
  }
};
