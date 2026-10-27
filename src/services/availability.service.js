import { Room } from '../models/room.model.js';
import { Booking } from '../models/booking.model.js';
import { Blackout } from '../models/blackout.model.js';
import mongoose from 'mongoose';
import { isValidDateString, slotStart, todayIST, addDaysIST } from '../utils/time.js';
import { env } from '../config/env.js';
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

/**
 * Suggest smart alternatives for a room slot:
 * - Type 1: Same slot, different active room (capacity >= reqCapacity, equipment superset)
 * - Type 2: Same room, nearby slot within 3 hours before/after on same date
 * - Type 3: Same room and slot, next 1 to 3 days
 */
export const suggestAlternatives = async ({
  roomId,
  date,
  slot,
  capacity,
  user,
  now = new Date(),
}) => {
  if (!isValidDateString(date) || slot === undefined || isNaN(Number(slot))) {
    throw httpError(400, 'Invalid date or slot');
  }

  const slotNum = Number(slot);
  const originalRoom = await Room.findById(roomId);
  if (!originalRoom || !originalRoom.isActive) {
    return [];
  }

  const reqCapacity = capacity ? Number(capacity) : originalRoom.capacity;
  const origEquipment = originalRoom.equipment || [];
  const origBuilding = originalRoom.building;
  const origRoomIdStr = originalRoom._id.toString();

  const userRole = user?.role || 'student';
  const userIdStr = user?._id?.toString();
  const quotaLimit = userRole === 'faculty' ? env.QUOTA_FACULTY : env.QUOTA_STUDENT;

  // Cache user active bookings per date to check quota & conflicts
  const userBookingsByDate = {};
  const getUserBookingsOnDate = async (d) => {
    if (!userIdStr) return [];
    if (!userBookingsByDate[d]) {
      userBookingsByDate[d] = await Booking.find({
        user: userIdStr,
        date: d,
        holdsSlot: true,
      }).select('room slot');
    }
    return userBookingsByDate[d];
  };

  // Cache blackouts per date
  const blackoutsByDate = {};
  const getBlackoutsOnDate = async (d) => {
    if (!blackoutsByDate[d]) {
      blackoutsByDate[d] = await Blackout.find({ date: d }).select('room');
    }
    return blackoutsByDate[d];
  };

  // Cache all room-slot bookings per date
  const roomBookingsByDate = {};
  const getRoomBookingsOnDate = async (d) => {
    if (!roomBookingsByDate[d]) {
      roomBookingsByDate[d] = await Booking.find({
        date: d,
        holdsSlot: true,
      }).select('room slot');
    }
    return roomBookingsByDate[d];
  };

  // Helper: check if a candidate slot is bookable by this user
  const isCandidateBookable = async (candRoom, candDate, candSlot) => {
    // 1. Never return the original slot
    if (candRoom._id.toString() === origRoomIdStr && candDate === date && candSlot === slotNum) {
      return false;
    }

    // 2. Room must be active
    if (!candRoom.isActive) return false;

    // 3. Operating hours check
    if (candSlot < candRoom.openHour || candSlot >= candRoom.closeHour) {
      return false;
    }

    // 4. Past slot check
    if (slotStart(candDate, candSlot) <= now) {
      return false;
    }

    // 5. Booking window (today up to MAX_ADVANCE_DAYS)
    const today = todayIST(now);
    const maxDate = addDaysIST(today, env.MAX_ADVANCE_DAYS);
    if (candDate < today || candDate > maxDate) {
      return false;
    }

    // 6. Blackout check
    const blackouts = await getBlackoutsOnDate(candDate);
    const hasBlackout = blackouts.some(
      (b) => b.room === null || b.room.toString() === candRoom._id.toString()
    );
    if (hasBlackout) return false;

    // 7. Quota check (if user is student/faculty)
    if (userRole !== 'admin') {
      const userBookings = await getUserBookingsOnDate(candDate);
      if (userBookings.length >= quotaLimit) {
        return false;
      }
    }

    // 8. User already holds a booking at this date & slot
    if (userIdStr) {
      const userBookings = await getUserBookingsOnDate(candDate);
      if (userBookings.some((b) => b.slot === candSlot)) {
        return false;
      }
    }

    // 9. Slot is occupied by any active booking
    const allBookings = await getRoomBookingsOnDate(candDate);
    const isOccupied = allBookings.some(
      (b) => b.room.toString() === candRoom._id.toString() && b.slot === candSlot
    );
    if (isOccupied) return false;

    return true;
  };

  const candidates = [];

  // --- Type 1: Same slot, another room ---
  const otherRooms = await Room.find({
    _id: { $ne: originalRoom._id },
    isActive: true,
    capacity: { $gte: reqCapacity },
  });

  for (const candRoom of otherRooms) {
    // Equipment superset rule: every equipment requirement of original room must be in candidate room
    const hasAllEquipment = origEquipment.every((eq) =>
      candRoom.equipment?.some((e) => e.toLowerCase() === eq.toLowerCase())
    );
    if (!hasAllEquipment) continue;

    const bookable = await isCandidateBookable(candRoom, date, slotNum);
    if (bookable) {
      const isSameBuilding = candRoom.building === origBuilding;
      const capacitySurplus = Math.max(0, candRoom.capacity - reqCapacity);
      // Base score 70; bonus 25 for same building; penalty for excess capacity
      const capPenalty = Math.min(25, Math.floor(capacitySurplus / 2));
      const score = 70 + (isSameBuilding ? 25 : 0) - capPenalty;

      const reason = isSameBuilding
        ? `${candRoom.name} in same building (${candRoom.capacity} seats)`
        : `${candRoom.name} in ${candRoom.building} (${candRoom.capacity} seats)`;

      candidates.push({
        type: 'same_slot',
        roomId: candRoom._id,
        roomName: candRoom.name,
        building: candRoom.building,
        capacity: candRoom.capacity,
        equipment: candRoom.equipment,
        date,
        slot: slotNum,
        reason,
        score,
        timeDistance: 0,
        sameBuilding: isSameBuilding,
        capacitySurplus,
      });
    }
  }

  // --- Type 2: Same room, nearby slot within 3 hours before/after on same date ---
  const nearbyOffsets = [-1, 1, -2, 2, -3, 3];
  for (const offset of nearbyOffsets) {
    const candSlot = slotNum + offset;
    const bookable = await isCandidateBookable(originalRoom, date, candSlot);
    if (bookable) {
      const dist = Math.abs(offset);
      const score = 85 - dist * 10;
      const dirText = offset > 0 ? 'later' : 'earlier';
      const reason = `${candSlot}:00 - ${candSlot + 1}:00 today (${dist}h ${dirText})`;

      candidates.push({
        type: 'nearby_slot',
        roomId: originalRoom._id,
        roomName: originalRoom.name,
        building: originalRoom.building,
        capacity: originalRoom.capacity,
        equipment: originalRoom.equipment,
        date,
        slot: candSlot,
        reason,
        score,
        timeDistance: dist,
        sameBuilding: true,
        capacitySurplus: 0,
      });
    }
  }

  // --- Type 3: Same room and slot, next 1 to 3 days ---
  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const candDate = addDaysIST(date, dayOffset);
    const bookable = await isCandidateBookable(originalRoom, candDate, slotNum);
    if (bookable) {
      const score = 60 - dayOffset * 5;
      const dayLabel = dayOffset === 1 ? 'tomorrow' : `in ${dayOffset} days`;
      const reason = `Same time ${dayLabel} (${candDate})`;

      candidates.push({
        type: 'next_days',
        roomId: originalRoom._id,
        roomName: originalRoom.name,
        building: originalRoom.building,
        capacity: originalRoom.capacity,
        equipment: originalRoom.equipment,
        date: candDate,
        slot: slotNum,
        reason,
        score,
        timeDistance: dayOffset * 24,
        sameBuilding: true,
        capacitySurplus: 0,
      });
    }
  }

  // Deduplicate candidates by room_date_slot
  const seen = new Set();
  const uniqueCandidates = [];
  for (const c of candidates) {
    const key = `${c.roomId.toString()}_${c.date}_${c.slot}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCandidates.push(c);
    }
  }

  // Sort by score descending; tie breakers: same building first, then smaller time distance, then smaller capacity surplus
  uniqueCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.sameBuilding !== b.sameBuilding) return a.sameBuilding ? -1 : 1;
    if (a.timeDistance !== b.timeDistance) return a.timeDistance - b.timeDistance;
    return a.capacitySurplus - b.capacitySurplus;
  });

  return uniqueCandidates.slice(0, 6).map((c) => ({
    type: c.type,
    roomId: c.roomId,
    roomName: c.roomName,
    building: c.building,
    capacity: c.capacity,
    equipment: c.equipment,
    date: c.date,
    slot: c.slot,
    reason: c.reason,
  }));
};
