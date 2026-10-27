import {
  createBooking,
  createBatchBooking,
  approveBooking,
  rejectBooking,
  getPendingApprovals,
  cancelBooking,
  checkIn,
} from '../services/booking.service.js';
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

export const createBatch = async (req, res) => {
  const { roomId, date, slots, purpose } = req.body;

  const result = await createBatchBooking({
    user: req.user,
    roomId,
    date,
    slots,
    purpose,
  });

  res.status(201).json(result);
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

export const approve = async (req, res) => {
  const booking = await approveBooking(req.params.id, req.user);
  res.status(200).json({ message: 'Booking approved successfully', booking });
};

export const reject = async (req, res) => {
  const { note } = req.body || {};
  const booking = await rejectBooking(req.params.id, req.user, note);
  res.status(200).json({ message: 'Booking rejected', booking });
};

export const getApprovals = async (req, res) => {
  const approvals = await getPendingApprovals();
  res.status(200).json({ approvals });
};

export const cancel = async (req, res) => {
  const booking = await cancelBooking(req.params.id, req.user);
  res.status(200).json({ message: 'Booking cancelled successfully', booking });
};

export const checkInBooking = async (req, res) => {
  const booking = await checkIn(req.params.id, req.user);
  res.status(200).json({ message: 'Checked in successfully', booking });
};

export const exportIcs = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('room', 'name building')
    .populate('user', 'name email');

  if (!booking) {
    throw httpError(404, 'Booking not found');
  }

  const isOwner = booking.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw httpError(403, 'Forbidden: You can only export your own bookings');
  }

  const formatUtc = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startUtc = formatUtc(booking.startsAt);
  const endUtc = formatUtc(booking.endsAt);
  const stampUtc = formatUtc(new Date());

  const roomName = booking.room?.name || 'Room';
  const building = booking.room?.building || 'Campus';
  const summary = `${roomName}`;
  const description = `${booking.purpose || 'Campus Space Booking'}`;
  const uid = `booking-${booking._id}@slotsync`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SlotSync//Campus Room Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stampUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${summary}`,
    `LOCATION:${building}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];

  const icsContent = icsLines.join('\r\n');
  const safeRoomName = roomName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `slotsync-${safeRoomName}-${booking.date}.ics`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(icsContent);
};
