import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Range Booking (POST /api/bookings/batch)', () => {
  let student1;
  let student2;
  let token1;
  let token2;
  let room;
  let testDate;

  beforeEach(async () => {
    testDate = addDaysIST(todayIST(), 1);

    student1 = await createTestUser({ role: 'student', email: 's1@slotsync.demo' });
    token1 = createAuthToken(student1);

    student2 = await createTestUser({ role: 'student', email: 's2@slotsync.demo' });
    token2 = createAuthToken(student2);

    room = await Room.create({
      name: 'Algorithm Lab',
      building: 'Turing Block',
      capacity: 30,
      openHour: 8,
      closeHour: 22,
      requiresApproval: false,
      isActive: true,
    });
  });

  it('successfully books 3 consecutive hours and assigns a batchId', async () => {
    const res = await request(app)
      .post('/api/bookings/batch')
      .set('Cookie', [`token=${token1}`])
      .send({
        roomId: room._id.toString(),
        date: testDate,
        slots: [14, 15, 16],
        purpose: 'Machine Learning Study Marathon',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('batchId');
    expect(res.body.bookings).toHaveLength(3);

    const bookings = await Booking.find({ batchId: res.body.batchId }).sort({ slot: 1 });
    expect(bookings).toHaveLength(3);
    expect(bookings[0].slot).toBe(14);
    expect(bookings[1].slot).toBe(15);
    expect(bookings[2].slot).toBe(16);
    expect(bookings[0].status).toBe('approved');
  });

  it('rejects non-consecutive slots with 400', async () => {
    const res = await request(app)
      .post('/api/bookings/batch')
      .set('Cookie', [`token=${token1}`])
      .send({
        roomId: room._id.toString(),
        date: testDate,
        slots: [14, 16],
        purpose: 'Non-consecutive test',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/consecutive/i);
  });

  it('rejects more than 4 slots with 400', async () => {
    const res = await request(app)
      .post('/api/bookings/batch')
      .set('Cookie', [`token=${token1}`])
      .send({
        roomId: room._id.toString(),
        date: testDate,
        slots: [12, 13, 14, 15, 16],
        purpose: 'Too many slots',
      });

    expect(res.status).toBe(400);
  });

  it('rejects when requested range exceeds daily quota (quota = 3 for student)', async () => {
    // Book 2 slots individually first
    await Booking.create({
      room: room._id,
      user: student1._id,
      date: testDate,
      slot: 9,
      purpose: 'Slot 1',
      status: 'approved',
      holdsSlot: true,
    });
    await Booking.create({
      room: room._id,
      user: student1._id,
      date: testDate,
      slot: 10,
      purpose: 'Slot 2',
      status: 'approved',
      holdsSlot: true,
    });

    // Try booking a 2-hour range (would total 4 active slots > quota 3)
    const res = await request(app)
      .post('/api/bookings/batch')
      .set('Cookie', [`token=${token1}`])
      .send({
        roomId: room._id.toString(),
        date: testDate,
        slots: [14, 15],
        purpose: 'Exceeding quota range',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/quota/i);
  });

  it('compensates and leaves ZERO new bookings if any slot fails mid-range', async () => {
    // Slot 15 is already occupied by student2
    await Booking.create({
      room: room._id,
      user: student2._id,
      date: testDate,
      slot: 15,
      purpose: 'Slot 15 occupied',
      status: 'approved',
      holdsSlot: true,
    });

    const countBefore = await Booking.countDocuments({ user: student1._id, date: testDate });

    // Student1 tries to book [14, 15, 16]
    const res = await request(app)
      .post('/api/bookings/batch')
      .set('Cookie', [`token=${token1}`])
      .send({
        roomId: room._id.toString(),
        date: testDate,
        slots: [14, 15, 16],
        purpose: 'Range with conflict on 15',
      });

    expect(res.status).toBe(409);

    // Verify compensation: slot 14 must NOT remain in database!
    const countAfter = await Booking.countDocuments({ user: student1._id, date: testDate });
    expect(countAfter).toBe(countBefore);

    const slot14Booking = await Booking.findOne({ room: room._id, date: testDate, slot: 14 });
    expect(slot14Booking).toBeNull();
  });

  it('concurrency: two users requesting overlapping ranges results in zero overlapping bookings and no partial range', async () => {
    // User 1 requests [14, 15]
    // User 2 requests [15, 16]
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings/batch')
        .set('Cookie', [`token=${token1}`])
        .send({
          roomId: room._id.toString(),
          date: testDate,
          slots: [14, 15],
          purpose: 'Range 1',
        }),
      request(app)
        .post('/api/bookings/batch')
        .set('Cookie', [`token=${token2}`])
        .send({
          roomId: room._id.toString(),
          date: testDate,
          slots: [15, 16],
          purpose: 'Range 2',
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    // Check database state
    const allBookings = await Booking.find({ room: room._id, date: testDate }).sort({ slot: 1 });
    expect(allBookings.length).toBe(2); // Exactly one range succeeded, 0 partial leftover from loser!
    expect([allBookings[0].user.toString(), allBookings[1].user.toString()]).toEqual(
      allBookings[0].user.toString() === student1._id.toString()
        ? [student1._id.toString(), student1._id.toString()]
        : [student2._id.toString(), student2._id.toString()]
    );
  });
});
