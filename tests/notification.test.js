import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Notification } from '../src/models/notification.model.js';

describe('Notification API and Workflows', () => {
  it('lists notifications and accurate unread count', async () => {
    const user = await createTestUser();
    const token = createAuthToken(user);

    // Create 3 unread notifications and 1 read notification
    await Notification.create([
      { user: user._id, type: 'booking_approved', message: 'Booking 1 approved', isRead: false },
      { user: user._id, type: 'waitlist_promoted', message: 'Waitlist promoted', isRead: false },
      { user: user._id, type: 'no_show_released', message: 'No show released', isRead: false },
      { user: user._id, type: 'booking_rejected', message: 'Booking rejected', isRead: true },
    ]);

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBe(4);
    expect(res.body.unreadCount).toBe(3);
  });

  it('marks a single notification as read', async () => {
    const user = await createTestUser();
    const token = createAuthToken(user);

    const notification = await Notification.create({
      user: user._id,
      type: 'booking_approved',
      message: 'Single notification',
      isRead: false,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notification.isRead).toBe(true);

    const dbDoc = await Notification.findById(notification._id);
    expect(dbDoc.isRead).toBe(true);
  });

  it('marks all notifications as read', async () => {
    const user = await createTestUser();
    const token = createAuthToken(user);

    await Notification.create([
      { user: user._id, type: 'booking_approved', message: 'Msg 1', isRead: false },
      { user: user._id, type: 'booking_approved', message: 'Msg 2', isRead: false },
    ]);

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);

    const count = await Notification.countDocuments({ user: user._id, isRead: false });
    expect(count).toBe(0);
  });

  it('prevents user from modifying another user\'s notification with 403', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const token2 = createAuthToken(user2);

    const notification = await Notification.create({
      user: user1._id,
      type: 'booking_approved',
      message: 'Private message',
      isRead: false,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set('Cookie', `token=${token2}`);

    expect(res.status).toBe(403);
  });
});
