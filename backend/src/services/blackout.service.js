import { Blackout } from '../models/blackout.model.js';
import { logAudit } from './audit.service.js';
import { httpError } from '../utils/httpError.js';
import mongoose from 'mongoose';

export const createBlackoutService = async ({ date, roomId, reason }, actor) => {
  const blackout = await Blackout.create({
    date,
    room: roomId || null,
    reason,
  });

  let affectedBookings = 0;
  if (mongoose.models.Booking) {
    const bookingQuery = {
      date,
      holdsSlot: true,
    };
    if (roomId) {
      bookingQuery.room = roomId;
    }
    affectedBookings = await mongoose.models.Booking.countDocuments(bookingQuery);
  }

  const populated = await Blackout.findById(blackout._id).populate('room', 'name building');

  if (actor) {
    const roomScope = populated?.room ? `room "${populated.room.name}"` : 'campus-wide';
    await logAudit({
      actor: actor._id,
      action: 'blackout_create',
      targetType: 'Blackout',
      targetId: blackout._id,
      summary: `${actor.name || 'Admin'} created blackout for ${date} (${roomScope}): ${reason}`,
      meta: { date, roomId: roomId || null, reason, affectedBookings },
    });
  }

  return { blackout: populated, affectedBookings };
};

export const deleteBlackoutService = async (id, actor) => {
  const blackout = await Blackout.findById(id).populate('room', 'name building');
  if (!blackout) {
    throw httpError(404, 'Blackout date not found');
  }

  await Blackout.findByIdAndDelete(id);

  if (actor) {
    const roomScope = blackout.room ? `room "${blackout.room.name}"` : 'campus-wide';
    await logAudit({
      actor: actor._id,
      action: 'blackout_delete',
      targetType: 'Blackout',
      targetId: blackout._id,
      summary: `${actor.name || 'Admin'} deleted blackout for ${blackout.date} (${roomScope})`,
      meta: { date: blackout.date, reason: blackout.reason },
    });
  }

  return blackout;
};
