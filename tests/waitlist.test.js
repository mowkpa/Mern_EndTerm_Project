import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Waitlist } from '../src/models/waitlist.model.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Waitlist & Auto-Promotion Engine', () => {
  it('cannot join waitlist if slot is free', async () => {
    const room = await Room.create({
      name: 'Free Room',
      building: 'Library',
      capacity: 5,
    });
    const user = await createTestUser();
    const token = createAuthToken(user);
    const targetDate = addDaysIST(todayIST(), 2);

    const res = await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 10,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Slot is free, book it directly');
  });

  it('cannot join waitlist twice for the same slot', async () => {
    const room = await Room.create({
      name: 'Booked Room 1',
      building: 'Library',
      capacity: 5,
    });
    const holder = await createTestUser();
    const waitlistedUser = await createTestUser();
    const holderToken = createAuthToken(holder);
    const waitlistToken = createAuthToken(waitlistedUser);
    const targetDate = addDaysIST(todayIST(), 3);

    // Holder books slot
    await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${holderToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 11,
        purpose: 'Study',
      });

    // User joins waitlist first time
    const res1 = await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${waitlistToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 11,
      });
    expect(res1.status).toBe(201);
    expect(res1.body.queuePosition).toBe(1);

    // User attempts to join waitlist second time
    const res2 = await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${waitlistToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 11,
      });
    expect(res2.status).toBe(409);
    expect(res2.body.message).toContain('Already on the waitlist');
  });

  it('promotes the earliest waitlisted user FIFO upon cancellation', async () => {
    const room = await Room.create({
      name: 'Seminar Room FIFO',
      building: 'Hall',
      capacity: 10,
    });

    const holder = await createTestUser();
    const student1 = await createTestUser();
    const student2 = await createTestUser();

    const holderToken = createAuthToken(holder);
    const student1Token = createAuthToken(student1);
    const student2Token = createAuthToken(student2);

    const targetDate = addDaysIST(todayIST(), 4);
    const targetSlot = 12;

    // Holder books slot
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${holderToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Holder original booking',
      });
    const bookingId = bookRes.body.booking._id;

    // Student 1 joins waitlist (First)
    await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${student1Token}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
      });

    // Student 2 joins waitlist (Second)
    await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${student2Token}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
      });

    // Holder cancels
    await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', `token=${holderToken}`);

    // Wait a brief tick for async promotion
    await new Promise((r) => setTimeout(r, 100));

    // Verify Student 1 was promoted
    const student1Booking = await Booking.findOne({
      user: student1._id,
      room: room._id,
      date: targetDate,
      slot: targetSlot,
      holdsSlot: true,
    });
    expect(student1Booking).toBeDefined();
    expect(student1Booking.fromWaitlist).toBe(true);
    expect(student1Booking.status).toBe('approved');

    // Verify Student 1 waitlist entry is 'promoted'
    const student1Entry = await Waitlist.findOne({ user: student1._id, room: room._id, date: targetDate, slot: targetSlot });
    expect(student1Entry.status).toBe('promoted');

    // Verify Student 2 is still 'waiting'
    const student2Entry = await Waitlist.findOne({ user: student2._id, room: room._id, date: targetDate, slot: targetSlot });
    expect(student2Entry.status).toBe('waiting');
  });

  it('skips an ineligible user over quota and promotes the next waiting user', async () => {
    const room = await Room.create({
      name: 'Quota Skip Lab',
      building: 'Hall',
      capacity: 10,
    });

    const holder = await createTestUser();
    const overQuotaStudent = await createTestUser({ role: 'student' });
    const eligibleStudent = await createTestUser({ role: 'student' });

    const holderToken = createAuthToken(holder);
    const overQuotaToken = createAuthToken(overQuotaStudent);
    const eligibleToken = createAuthToken(eligibleStudent);

    const targetDate = addDaysIST(todayIST(), 5);
    const targetSlot = 16;

    // Holder books slot 16
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${holderToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Original slot',
      });
    const bookingId = bookRes.body.booking._id;

    // Over-quota student joins waitlist first
    await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${overQuotaToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
      });

    // Eligible student joins waitlist second
    await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${eligibleToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: targetSlot,
      });

    // In the meantime, over-quota student fills their 3 daily slots elsewhere
    for (let slot = 9; slot <= 11; slot++) {
      await Booking.create({
        room: room._id,
        user: overQuotaStudent._id,
        date: targetDate,
        slot,
        purpose: `Filling quota slot ${slot}`,
        status: 'approved',
        holdsSlot: true,
      });
    }

    // Holder cancels slot 16
    await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', `token=${holderToken}`);

    await new Promise((r) => setTimeout(r, 100));

    // Over-quota student waitlist entry must be marked 'expired'
    const overQuotaEntry = await Waitlist.findOne({ user: overQuotaStudent._id, date: targetDate, slot: targetSlot });
    expect(overQuotaEntry.status).toBe('expired');

    // Eligible student must be promoted to the slot!
    const eligibleBooking = await Booking.findOne({
      user: eligibleStudent._id,
      room: room._id,
      date: targetDate,
      slot: targetSlot,
      holdsSlot: true,
    });
    expect(eligibleBooking).toBeDefined();
    expect(eligibleBooking.fromWaitlist).toBe(true);

    const eligibleEntry = await Waitlist.findOne({ user: eligibleStudent._id, date: targetDate, slot: targetSlot });
    expect(eligibleEntry.status).toBe('promoted');
  });

  it('promotes into a restricted room producing a pending booking', async () => {
    const restrictedRoom = await Room.create({
      name: 'Supercomputer Lab',
      building: 'Computing',
      capacity: 10,
      requiresApproval: true,
    });

    const admin = await createTestUser({ role: 'admin' });
    const student1 = await createTestUser();
    const student2 = await createTestUser();

    const adminToken = createAuthToken(admin);
    const student1Token = createAuthToken(student1);
    const student2Token = createAuthToken(student2);

    const targetDate = addDaysIST(todayIST(), 6);
    const targetSlot = 13;

    // Student 1 books restricted room -> pending
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${student1Token}`)
      .send({
        roomId: restrictedRoom._id.toString(),
        date: targetDate,
        slot: targetSlot,
        purpose: 'Supercomputer research',
      });
    const bookingId = bookRes.body.booking._id;

    // Student 2 joins waitlist
    await request(app)
      .post('/api/waitlist')
      .set('Cookie', `token=${student2Token}`)
      .send({
        roomId: restrictedRoom._id.toString(),
        date: targetDate,
        slot: targetSlot,
      });

    // Admin rejects Student 1's request
    await request(app)
      .post(`/api/bookings/${bookingId}/reject`)
      .set('Cookie', `token=${adminToken}`)
      .send({ note: 'Not approved' });

    await new Promise((r) => setTimeout(r, 100));

    // Student 2 is auto-promoted into the restricted room, which requires approval (pending)!
    const student2Booking = await Booking.findOne({
      user: student2._id,
      room: restrictedRoom._id,
      date: targetDate,
      slot: targetSlot,
      holdsSlot: true,
    });
    expect(student2Booking).toBeDefined();
    expect(student2Booking.status).toBe('pending');
    expect(student2Booking.fromWaitlist).toBe(true);
  });
});
