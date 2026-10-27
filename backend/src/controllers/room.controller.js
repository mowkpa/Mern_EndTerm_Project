import { Room } from '../models/room.model.js';
import { httpError } from '../utils/httpError.js';
import { getAvailability, suggestAlternatives } from '../services/availability.service.js';
import { createRoomService, updateRoomService, deleteRoomService } from '../services/room.service.js';

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

export const getAlternatives = async (req, res) => {
  const { roomId, date, slot, capacity } = req.query;
  const result = await suggestAlternatives({
    roomId,
    date,
    slot: Number(slot),
    capacity: capacity ? Number(capacity) : undefined,
    user: req.user,
    now: new Date(),
  });

  res.status(200).json({ alternatives: result });
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
  const room = await createRoomService(req.body, req.user);
  res.status(201).json({ room });
};

export const updateRoom = async (req, res) => {
  const room = await updateRoomService(req.params.id, req.body, req.user);
  res.status(200).json({ room });
};

export const deleteRoom = async (req, res) => {
  const { room, affectedFutureBookings } = await deleteRoomService(req.params.id, req.user);

  res.status(200).json({
    message: 'Room deactivated successfully',
    room,
    affectedFutureBookings,
  });
};
