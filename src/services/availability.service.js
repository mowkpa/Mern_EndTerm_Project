import { Room } from '../models/room.model.js';
import { Booking } from '../models/booking.model.js';
import { Blackout } from '../models/blackout.model.js';
import mongoose from 'mongoose';
import { isValidDateString, slotStart } from '../utils/time.js';
import { httpError } from '../utils/httpError.js';

let lastReconcileTime = 0;

export const getAvailability = async ({
  date,
  startHour,
  endHour,
  capacity,
  equipment,
  user,
  now = new Date(),
}) => {
  if (!isValidDateString(date)) {
    throw httpError(400, 'Invalid date format. Expected YYYY-MM-DD');
  }

  // Lazy reconcile hook (throttled to once every 20 seconds for Render free tier support)
  const currentTime = Date.now();
  if (currentTime - lastReconcileTime > 20000) {
    lastReconcileTime = currentTime;
    // We import dynamically if scheduler service is available
    import('./scheduler.service.js')
      .then((m) => m.reconcile && m.reconcile(now))
      .catch(() => {});
  }

  // Build room search query
  const roomFilter = { isActive: true };
  if (capacity && !isNaN(Number(capacity))) {
    roomFilter.capacity = { $gte: Number(capacity) };
  }
  if (equipment) {
    const tags = Array.isArray(equipment)
      ? equipment
      : String(equipment)
          .split(',')
          .map((t) => t.toLowerCase().trim())
          .filter(Boolean);
    if (tags.length > 0) {
      roomFilter.equipment = { $all: tags };
    }
  }

  const rooms = await Room.find(roomFilter).sort({ building: 1, name: 1 });
  const roomIds = rooms.map((r) => r._id);

  // 1. Fetch active bookings for these rooms on this date
  const bookings = await Booking.find({
    room: { $in: roomIds },
    date,
    holdsSlot: true,
  }).select('room user slot status');

  // 2. Fetch blackouts for this date
  const blackouts = await Blackout.find({
    date,
    $or: [{ room: { $in: roomIds } }, { room: null }],
  });

  // 3. Fetch waitlist entries if model exists
  let waitlistEntries = [];
  if (mongoose.models.Waitlist) {
    waitlistEntries = await mongoose.models.Waitlist.find({
      room: { $in: roomIds },
      date,
      status: 'waiting',
    }).select('room slot user');
  }

  const userIdStr = user?._id?.toString();

  const results = rooms.map((room) => {
    const roomBookings = bookings.filter((b) => b.room.toString() === room._id.toString());
    const roomBlackout = blackouts.find(
      (bo) => bo.room === null || bo.room.toString() === room._id.toString()
    );
    const roomWaitlist = waitlistEntries.filter((w) => w.room.toString() === room._id.toString());

    const minSlot = Math.max(room.openHour, startHour !== undefined ? Number(startHour) : 0);
    const maxSlot = Math.min(room.closeHour, endHour !== undefined ? Number(endHour) : 24);

    const slots = [];
    for (let slot = minSlot; slot < maxSlot; slot++) {
      const isBlackout = !!roomBlackout;
      const isPast = slotStart(date, slot) <= now;
      const booking = roomBookings.find((b) => b.slot === slot);

      let state = 'free';
      let pending = false;

      if (isBlackout) {
        state = 'blackout';
      } else if (isPast) {
        state = 'past';
      } else if (booking) {
        pending = booking.status === 'pending';
        if (userIdStr && booking.user.toString() === userIdStr) {
          state = 'mine';
        } else {
          state = 'booked';
        }
      }

      const slotWaitlist = roomWaitlist.filter((w) => w.slot === slot);
      const onWaitlist = userIdStr ? slotWaitlist.some((w) => w.user.toString() === userIdStr) : false;

      slots.push({
        slot,
        state,
        pending,
        waitlistCount: slotWaitlist.length,
        onWaitlist,
      });
    }

    return {
      _id: room._id,
      name: room.name,
      building: room.building,
      capacity: room.capacity,
      equipment: room.equipment,
      requiresApproval: room.requiresApproval,
      openHour: room.openHour,
      closeHour: room.closeHour,
      description: room.description,
      slots,
    };
  });

  return {
    date,
    rooms: results,
  };
};
