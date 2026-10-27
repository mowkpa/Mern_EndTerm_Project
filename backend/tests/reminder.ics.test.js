import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Notification } from '../src/models/notification.model.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { sendReminders } from '../src/services/scheduler.service.js';
import { todayIST, addDaysIST, slotStart, slotEnd } from '../src/utils/time.js';

describe('Reminders and Calendar Export (E5)', () => {
  let user1;
  let user2;
  let token1;
  let token2;
  let room;
  let testDate;

  beforeEach(async () => {
    testDate = addDaysIST(todayIST(), 1);

    user1 = await createTestUser({ role: 'student', email: 'owner@slotsync.demo' });
    token1 = createAuthToken(user1);

    user2 = await createTestUser({ role: 'student', email: 'other@slotsync.demo' });
    token2 = createAuthToken(user2);

    room = await Room.create({
      name: 'Physics Lab 3',
      building: 'Newton Wing',
      capacity: 25,
      openHour: 8,
      closeHour: 20,
      isActive: true,
      requiresApproval: false,
    });
  });

  describe('Scheduler sendReminders(now)', () => {
    it('sends notification and sets reminderSentAt for booking starting in 12 minutes', async () => {
      const now = new Date();
      const startsAt = new Date(now.getTime() + 12 * 60 * 1000);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

      const booking = await Booking.create({
        room: room._id,
        user: user1._id,
        date: testDate,
        slot: 10,
        purpose: 'Quantum mechanics lab session',
        status: 'approved',
        holdsSlot: true,
        startsAt,
        endsAt,
        reminderSentAt: null,
      });

      const count = await sendReminders(now);
      expect(count).toBe(1);

      const updated = await Booking.findById(booking._id);
      expect(updated.reminderSentAt).toBeDefined();
      expect(updated.reminderSentAt).not.toBeNull();

      const notifs = await Notification.find({ user: user1._id, type: 'booking_reminder' });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].message).toContain('Physics Lab 3');
      expect(notifs[0].message).toContain('starts in 10 minutes');

      // Idempotency: Running sendReminders again with same now must NOT resend
      const secondRunCount = await sendReminders(now);
      expect(secondRunCount).toBe(0);

      const notifsAfter = await Notification.find({ user: user1._id, type: 'booking_reminder' });
      expect(notifsAfter).toHaveLength(1);
    });

    it('does not send reminder if startsAt is more than 15 minutes away', async () => {
      const now = new Date();
      const startsAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min ahead
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

      await Booking.create({
        room: room._id,
        user: user1._id,
        date: testDate,
        slot: 12,
        purpose: 'Future lab session',
        status: 'approved',
        holdsSlot: true,
        startsAt,
        endsAt,
        reminderSentAt: null,
      });

      const count = await sendReminders(now);
      expect(count).toBe(0);
    });
  });

  describe('GET /api/bookings/:id/ics', () => {
    let booking;

    beforeEach(async () => {
      booking = await Booking.create({
        room: room._id,
        user: user1._id,
        date: testDate,
        slot: 14,
        purpose: 'Thermodynamics tutorial',
        status: 'approved',
        holdsSlot: true,
        startsAt: slotStart(testDate, 14),
        endsAt: slotEnd(testDate, 14),
      });
    });

    it('requires authentication', async () => {
      const res = await request(app).get(`/api/bookings/${booking._id}/ics`);
      expect(res.status).toBe(401);
    });

    it('forbids non-owner non-admin from exporting .ics', async () => {
      const res = await request(app)
        .get(`/api/bookings/${booking._id}/ics`)
        .set('Cookie', [`token=${token2}`]);
      expect(res.status).toBe(403);
    });

    it('generates valid text/calendar format with CRLF line endings', async () => {
      const res = await request(app)
        .get(`/api/bookings/${booking._id}/ics`)
        .set('Cookie', [`token=${token1}`]);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.ics');

      const body = res.text;
      expect(body).toContain('\r\n');
      expect(body).toContain('BEGIN:VCALENDAR\r\n');
      expect(body).toContain('END:VCALENDAR\r\n');
      expect(body).toContain('BEGIN:VEVENT\r\n');
      expect(body).toContain('END:VEVENT\r\n');
      expect(body).toContain(`UID:booking-${booking._id}@slotsync\r\n`);
      expect(body).toContain('SUMMARY:Physics Lab 3\r\n');
      expect(body).toContain('LOCATION:Newton Wing\r\n');
      expect(body).toContain('DESCRIPTION:Thermodynamics tutorial\r\n');
      expect(body).toContain('DTSTART:');
      expect(body).toContain('DTEND:');
    });
  });
});
