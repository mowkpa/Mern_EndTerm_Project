import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { todayIST, addDaysIST, slotStart } from '../src/utils/time.js';
import { checkIn, cancelBooking } from '../src/services/booking.service.js';

describe('Cancellation and Check-In Lifecycle', () => {
  it('allows owner to cancel an upcoming booking and frees the slot for another user', async () => {
    const room = await Room.create({
      name: 'Meeting Room C',
      building: 'Block C',
      capacity: 8,
      requiresApproval: false,
    });

    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const token1 = createAuthToken(user1);
    const token2 = createAuthToken(user2);
    const targetDate = addDaysIST(todayIST(), 2);
    const targetSlot = 14;

    // User 1 books the slot
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token1}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Team sync',
      });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.booking._id;

    // User 2 attempts to book the same slot -> 409 SLOT_TAKEN
    const failRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token2}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Another meeting',
      });
    expect(failRes.status).toBe(409);
    expect(failRes.body.code).toBe('SLOT_TAKEN');

    // User 1 cancels the booking
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', `token=${token1}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking.status).toBe('cancelled');
    expect(cancelRes.body.booking.holdsSlot).toBe(false);

    // Now User 2 can book the freshly freed slot!
    const rebookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token2}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Now I can book it',
      });
    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.booking.status).toBe('approved');
  });

  it('blocks non-owner from cancelling someone else\'s booking with 403', async () => {
    const room = await Room.create({
      name: 'Private Room',
      building: 'Hall',
      capacity: 4,
    });

    const owner = await createTestUser();
    const hacker = await createTestUser();
    const ownerToken = createAuthToken(owner);
    const hackerToken = createAuthToken(hacker);
    const targetDate = addDaysIST(todayIST(), 3);

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${ownerToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 10,
        purpose: 'Owner meeting',
      });
    const bookingId = bookRes.body.booking._id;

    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', `token=${hackerToken}`);
    expect(cancelRes.status).toBe(403);
  });

  it('allows admin to cancel any booking', async () => {
    const room = await Room.create({
      name: 'Conference Room 1',
      building: 'Admin Block',
      capacity: 20,
    });

    const student = await createTestUser({ role: 'student' });
    const admin = await createTestUser({ role: 'admin' });
    const studentToken = createAuthToken(student);
    const adminToken = createAuthToken(admin);
    const targetDate = addDaysIST(todayIST(), 2);

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${studentToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 15,
        purpose: 'Student club meeting',
      });
    const bookingId = bookRes.body.booking._id;

    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', `token=${adminToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking.status).toBe('cancelled');
  });

  it('validates check-in window: allows check-in within window and rejects outside', async () => {
    const room = await Room.create({
      name: 'Bio Lab',
      building: 'Science',
      capacity: 15,
    });
    const user = await createTestUser();
    const targetDate = '2026-11-20';
    const targetSlot = 10;
    const slotStartsAt = slotStart(targetDate, targetSlot); // 10:00 IST

    const booking = await Booking.create({
      room: room._id,
      user: user._id,
      date: targetDate,
      slot: targetSlot,
      purpose: 'Lab session',
      status: 'approved',
      holdsSlot: true,
      startsAt: slotStartsAt,
      endsAt: new Date(slotStartsAt.getTime() + 60 * 60 * 1000),
      checkInDeadline: new Date(slotStartsAt.getTime() + 15 * 60 * 1000), // 10:15 IST
    });

    // 1. Attempt check-in too early: 9:45 IST (15 min before start, early window is 10 min)
    const tooEarlyTime = new Date(slotStartsAt.getTime() - 15 * 60 * 1000);
    await expect(checkIn(booking._id, user, tooEarlyTime)).rejects.toThrow(
      /10 minutes before the slot begins/
    );

    // 2. Attempt check-in inside window: 9:55 IST (5 min before start)
    const validEarlyTime = new Date(slotStartsAt.getTime() - 5 * 60 * 1000);
    const checkedIn = await checkIn(booking._id, user, validEarlyTime);
    expect(checkedIn.status).toBe('checked_in');
    expect(checkedIn.checkedInAt).toBeDefined();

    // 3. Attempt check-in after already checked in -> 409
    await expect(checkIn(booking._id, user, slotStartsAt)).rejects.toThrow(/Already checked in/);
  });

  it('rejects check-in after the grace deadline has passed', async () => {
    const room = await Room.create({
      name: 'Physics Lab',
      building: 'Science',
      capacity: 15,
    });
    const user = await createTestUser();
    const targetDate = '2026-11-21';
    const targetSlot = 11;
    const slotStartsAt = slotStart(targetDate, targetSlot);

    const booking = await Booking.create({
      room: room._id,
      user: user._id,
      date: targetDate,
      slot: targetSlot,
      purpose: 'Optics experiment',
      status: 'approved',
      holdsSlot: true,
      startsAt: slotStartsAt,
      endsAt: new Date(slotStartsAt.getTime() + 60 * 60 * 1000),
      checkInDeadline: new Date(slotStartsAt.getTime() + 15 * 60 * 1000), // 11:15 IST
    });

    // Attempt check-in at 11:20 IST (after 15-minute grace period)
    const lateTime = new Date(slotStartsAt.getTime() + 20 * 60 * 1000);
    await expect(checkIn(booking._id, user, lateTime)).rejects.toThrow(
      /Check-in deadline has passed/
    );
  });
});
