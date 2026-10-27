import { Notification } from '../models/notification.model.js';
import { httpError } from '../utils/httpError.js';

export const listNotifications = async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('booking', 'date slot purpose status room'),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.status(200).json({ notifications, unreadCount });
};

export const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({ message: 'All notifications marked as read' });
};

export const markAsRead = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw httpError(404, 'Notification not found');
  }

  if (notification.user.toString() !== req.user._id.toString()) {
    throw httpError(403, 'Forbidden: You cannot modify another user\'s notification');
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ message: 'Notification marked as read', notification });
};
