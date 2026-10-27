import { joinWaitlist, leaveWaitlist, getMyWaitlist } from '../services/waitlist.service.js';

export const join = async (req, res) => {
  const { roomId, date, slot } = req.body;
  const result = await joinWaitlist({
    user: req.user,
    roomId,
    date,
    slot,
  });

  res.status(201).json(result);
};

export const leave = async (req, res) => {
  const result = await leaveWaitlist({
    user: req.user,
    entryId: req.params.id,
  });

  res.status(200).json(result);
};

export const mine = async (req, res) => {
  const entries = await getMyWaitlist(req.user._id);
  res.status(200).json({ entries });
};
