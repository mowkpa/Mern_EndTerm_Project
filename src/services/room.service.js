import { Room } from '../models/room.model.js';
import { logAudit } from './audit.service.js';
import { httpError } from '../utils/httpError.js';
import mongoose from 'mongoose';
import { todayIST } from '../utils/time.js';

export const createRoomService = async (data, actor) => {
  const existing = await Room.findOne({ name: data.name });
  if (existing) {
    throw httpError(409, 'A room with this name already exists', 'ROOM_EXISTS');
  }

  const room = await Room.create(data);

  if (actor) {
    await logAudit({
      actor: actor._id,
      action: 'room_create',
      targetType: 'Room',
      targetId: room._id,
      summary: `${actor.name || 'Admin'} created new room "${room.name}" in ${room.building} (${room.capacity} seats)`,
      meta: { roomName: room.name, building: room.building, capacity: room.capacity },
    });
  }

  return room;
};

export const updateRoomService = async (id, data, actor) => {
  if (data.name) {
    const existing = await Room.findOne({ name: data.name, _id: { $ne: id } });
    if (existing) {
      throw httpError(409, 'Another room already has this name', 'ROOM_EXISTS');
    }
  }

  const room = await Room.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!room) {
    throw httpError(404, 'Room not found');
  }

  if (actor) {
    const isDeactivation = data.isActive === false;
    await logAudit({
      actor: actor._id,
      action: isDeactivation ? 'room_deactivate' : 'room_update',
      targetType: 'Room',
      targetId: room._id,
      summary: isDeactivation
        ? `${actor.name || 'Admin'} deactivated room "${room.name}"`
        : `${actor.name || 'Admin'} updated room "${room.name}" details`,
      meta: { changes: Object.keys(data) },
    });
  }

  return room;
};

export const deleteRoomService = async (id, actor) => {
  const room = await Room.findById(id);
  if (!room) {
    throw httpError(404, 'Room not found');
  }

  // Soft delete
  room.isActive = false;
  await room.save();

  let affectedBookings = 0;
  if (mongoose.models.Booking) {
    affectedBookings = await mongoose.models.Booking.countDocuments({
      room: room._id,
      holdsSlot: true,
      date: { $gte: todayIST() },
    });
  }

  if (actor) {
    await logAudit({
      actor: actor._id,
      action: 'room_deactivate',
      targetType: 'Room',
      targetId: room._id,
      summary: `${actor.name || 'Admin'} deactivated room "${room.name}"`,
      meta: { roomName: room.name, affectedBookings },
    });
  }

  return { room, affectedFutureBookings: affectedBookings };
};
