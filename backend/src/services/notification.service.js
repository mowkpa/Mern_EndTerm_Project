import mongoose from 'mongoose';
import { getIO } from '../socket.js';

export const notify = async (userId, type, message, bookingId = null) => {
  try {
    let notification = null;
    if (mongoose.models.Notification) {
      notification = await mongoose.models.Notification.create({
        user: userId,
        type,
        message,
        booking: bookingId,
      });
    }

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification || { type, message, bookingId });
    }
    return notification;
  } catch (error) {
    console.error('[Notification Error]', error.message);
  }
};

export const notifyAdmins = async (type, message, bookingId = null) => {
  try {
    const io = getIO();
    if (io) {
      io.to('admins').emit('approvals:changed', { type, message, bookingId });
    }
  } catch (error) {
    console.error('[Notify Admins Error]', error.message);
  }
};
