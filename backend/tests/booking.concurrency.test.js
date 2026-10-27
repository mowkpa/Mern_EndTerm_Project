import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Booking Concurrency & Race-Safety', () => {
  it('handles 10 users booking the same slot simultaneously: exactly 1 succeeds, 9 get 409 SLOT_TAKEN', async () => {
    // 1. Create a test room
    const room = await Room.create({
      name: 'Popular Study Room 101',
      building: 'North Library',
      capacity: 4,
      equipment: ['whiteboard'],
      requiresApproval: false,
      openHour: 8,
      closeHour: 20,
    });

    // 2. Create 10 distinct users and generate their tokens
    const users = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        createTestUser({ name: `Student ${i}`, email: `student_race_${i}_${Date.now()}@slotsync.demo` })
      )
    );
    const tokens = users.map((u) => createAuthToken(u));

    // Choose tomorrow at 14:00 (slot 14)
    const targetDate = addDaysIST(todayIST(), 1);
    const targetSlot = 14;

    // 3. Fire 10 parallel booking requests at the exact same instant
    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post('/api/bookings')
          .set('Cookie', `token=${token}`)
          .send({
            roomId: room._id.toString(),
            date: targetDate,
            slot: targetSlot,
            purpose: 'Group Study Session',
          })
      )
    );

    // 4. Verification:
    const successes = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(9);

    // Verify all 9 conflicts returned code SLOT_TAKEN
    conflicts.forEach((res) => {
      expect(res.body.code).toBe('SLOT_TAKEN');
      expect(res.body.message).toContain('booked by someone else');
    });

    // Verify exactly one active booking exists in the database for this slot
    const activeBookings = await Booking.find({
      room: room._id,
      date: targetDate,
      slot: targetSlot,
      holdsSlot: true,
    });
    expect(activeBookings.length).toBe(1);
    expect(activeBookings[0].status).toBe('approved');
  });

  it('handles the same user firing identical requests in parallel: exactly 1 succeeds', async () => {
    const room = await Room.create({
      name: 'Seminar Room S-2',
      building: 'South Hall',
      capacity: 15,
      openHour: 8,
      closeHour: 20,
    });

    const user = await createTestUser();
    const token = createAuthToken(user);
    const targetDate = addDaysIST(todayIST(), 2);
    const targetSlot = 11;

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Cookie', `token=${token}`)
        .send({
          roomId: room._id.toString(),
          date: targetDate,
          slot: targetSlot,
          purpose: 'Project Meeting',
        }),
      request(app)
        .post('/api/bookings')
        .set('Cookie', `token=${token}`)
        .send({
          roomId: room._id.toString(),
          date: targetDate,
          slot: targetSlot,
          purpose: 'Project Meeting',
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('prevents a user from booking two different rooms for the same slot (USER_CONFLICT)', async () => {
    const room1 = await Room.create({
      name: 'Room Alpha',
      building: 'Block A',
      capacity: 5,
    });
    const room2 = await Room.create({
      name: 'Room Beta',
      building: 'Block B',
      capacity: 5,
    });

    const user = await createTestUser();
    const token = createAuthToken(user);
    const targetDate = addDaysIST(todayIST(), 3);
    const targetSlot = 15;

    // Book Room 1
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room1._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'First Session',
      });
    expect(res1.status).toBe(201);

    // Attempt to book Room 2 for the same slot
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room2._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Second Session',
      });
    expect(res2.status).toBe(409);
    expect(res2.body.code).toBe('USER_CONFLICT');
    expect(res2.body.message).toContain('already have a booking in this time slot');
  });
});
