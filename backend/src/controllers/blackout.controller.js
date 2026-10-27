import { Blackout } from '../models/blackout.model.js';
import { httpError } from '../utils/httpError.js';
import mongoose from 'mongoose';
import { todayIST } from '../utils/time.js';

export const listBlackouts = async (req, res) => {
  const blackouts = await Blackout.find({
    date: { $gte: todayIST() },
  })
    .populate('room', 'name building')
    .sort({ date: 1 });

  res.status(200).json({ blackouts });
};

export const createBlackout = async (req, res) => {
  const { date, roomId, reason } = req.body;

  const blackout = await Blackout.create({
    date,
    room: roomId || null,
    reason,
  });

  // Calculate affected bookings count without auto-cancelling (per SPEC)
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

  res.status(201).json({
    blackout: populated,
    affectedBookings,
    message: `Blackout created. ${affectedBookings} existing booking(s) fall on this date.`,
  });
};

export const deleteBlackout = async (req, res) => {
  const blackout = await Blackout.findByIdAndDelete(req.params.id);
  if (!blackout) {
    throw httpError(404, 'Blackout date not found');
  }

  res.status(200).json({ message: 'Blackout deleted successfully' });
};
