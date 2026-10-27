import { createBooking } from '../services/booking.service.js';
import { Booking } from '../models/booking.model.js';
import { httpError } from '../utils/httpError.js';
import { todayIST } from '../utils/time.js';

export const create = async (req, res) => {
  const { roomId, date, slot, purpose } = req.body;

  const booking = await createBooking({
    user: req.user,
    roomId,
    date,
    slot,
    purpose,
  });

  res.status(201).json({ booking });
};

export const getMyBookings = async (req, res) => {
  const scope = req.query.scope || 'upcoming';
  const now = new Date();
  const today = todayIST(now);

  let filter = { user: req.user._id };

  if (scope === 'upcoming') {
    // Upcoming includes bookings holding slots or starting in the future
    filter = {
      user: req.user._id,
      $or: [{ holdsSlot: true }, { date: { $gte: today } }],
    };
  } else if (scope === 'past') {
    filter = {
      user: req.user._id,
      holdsSlot: false,
      date: { $lte: today },
    };
  }

  const bookings = await Booking.find(filter)
    .populate('room', 'name building capacity requiresApproval')
    .sort({ date: -1, slot: -1 });

  res.status(200).json({ bookings });
};

export const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('room', 'name building capacity equipment requiresApproval openHour closeHour')
    .populate('user', 'name email role department')
    .populate('decidedBy', 'name email role')
    .populate('cancelledBy', 'name email role');

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  // Access check: only owner or admin can view details
  const isOwner = booking.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw httpError(403, 'Forbidden: You cannot view another user\'s booking');
  }

  res.status(200).json({ booking });
};
