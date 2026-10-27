import { Room } from '../models/room.model.js';
import { httpError } from '../utils/httpError.js';
import mongoose from 'mongoose';
import { todayIST } from '../utils/time.js';
import { getAvailability } from '../services/availability.service.js';

export const getRoomAvailability = async (req, res) => {
  const result = await getAvailability({
    date: req.query.date,
    startHour: req.query.startHour,
    endHour: req.query.endHour,
    capacity: req.query.capacity,
    equipment: req.query.equipment,
    user: req.user,
  });

  res.status(200).json(result);
};

export const listRooms = async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin';
  const filter = includeInactive ? {} : { isActive: true };

  const rooms = await Room.find(filter).sort({ building: 1, name: 1 });
  res.status(200).json({ rooms });
};

export const getRoom = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    throw httpError(404, 'Room not found');
  }
  res.status(200).json({ room });
};

export const createRoom = async (req, res) => {
  const existing = await Room.findOne({ name: req.body.name });
  if (existing) {
    throw httpError(409, 'A room with this name already exists', 'ROOM_EXISTS');
  }

  const room = await Room.create(req.body);
  res.status(201).json({ room });
};

export const updateRoom = async (req, res) => {
  if (req.body.name) {
    const existing = await Room.findOne({ name: req.body.name, _id: { $ne: req.params.id } });
    if (existing) {
      throw httpError(409, 'Another room already has this name', 'ROOM_EXISTS');
    }
  }

  const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!room) {
    throw httpError(404, 'Room not found');
  }

  res.status(200).json({ room });
};

export const deleteRoom = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    throw httpError(404, 'Room not found');
  }

  // Soft delete
  room.isActive = false;
  await room.save();

  // Check if any active future bookings are affected
  let affectedBookings = 0;
  if (mongoose.models.Booking) {
    affectedBookings = await mongoose.models.Booking.countDocuments({
      room: room._id,
      holdsSlot: true,
      date: { $gte: todayIST() },
    });
  }

  res.status(200).json({
    message: 'Room deactivated successfully',
    room,
    affectedFutureBookings: affectedBookings,
  });
};
