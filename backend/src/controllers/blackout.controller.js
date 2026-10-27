import { Blackout } from '../models/blackout.model.js';
import { todayIST } from '../utils/time.js';
import { createBlackoutService, deleteBlackoutService } from '../services/blackout.service.js';

export const listBlackouts = async (req, res) => {
  const blackouts = await Blackout.find({
    date: { $gte: todayIST() },
  })
    .populate('room', 'name building')
    .sort({ date: 1 });

  res.status(200).json({ blackouts });
};

export const createBlackout = async (req, res) => {
  const { blackout, affectedBookings } = await createBlackoutService(req.body, req.user);

  res.status(201).json({
    blackout,
    affectedBookings,
    message: `Blackout created. ${affectedBookings} existing booking(s) fall on this date.`,
  });
};

export const deleteBlackout = async (req, res) => {
  await deleteBlackoutService(req.params.id, req.user);
  res.status(200).json({ message: 'Blackout deleted successfully' });
};
