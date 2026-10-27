import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Blackout } from '../src/models/blackout.model.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Booking Business Rules & Validation', () => {
  it('rejects booking a past slot with 400', async () => {
    const room = await Room.create({
      name: 'Rules Room 1',
      building: 'Main',
      capacity: 10,
      openHour: 8,
      closeHour: 20,
    });
    const user = await createTestUser();
    const token = createAuthToken(user);

    // Date in the past
    const pastDate = addDaysIST(todayIST(), -1);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: pastDate,
        slot: 10,
        purpose: 'Past booking',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('past');
  });

  it('rejects booking outside room operating hours with 400', async () => {
    const room = await Room.create({
      name: 'Hours Restricted Room',
      building: 'Main',
      capacity: 10,
      openHour: 9,
      closeHour: 17,
    });
    const user = await createTestUser();
    const token = createAuthToken(user);
    const targetDate = addDaysIST(todayIST(), 2);

    // Slot 8 is before openHour 9
    const resEarly = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 8,
        purpose: 'Early slot',
      });
    expect(resEarly.status).toBe(400);
    expect(resEarly.body.message).toContain('operating hours');

    // Slot 17 is at/after closeHour 17
    const resLate = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 17,
        purpose: 'Late slot',
      });
    expect(resLate.status).toBe(400);
    expect(resLate.body.message).toContain('operating hours');
  });

  it('rejects booking beyond the 14-day advance window with 400', async () => {
    const room = await Room.create({
      name: 'Window Test Room',
      building: 'Main',
      capacity: 10,
    });
    const user = await createTestUser();
    const token = createAuthToken(user);

    // 15 days ahead is beyond 14 days
    const distantDate = addDaysIST(todayIST(), 15);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: distantDate,
        slot: 10,
        purpose: 'Distant booking',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('advance');
  });

  it('rejects booking on blackout dates with 409', async () => {
    const room = await Room.create({
      name: 'Blackout Room',
      building: 'Main',
      capacity: 10,
    });
    const user = await createTestUser();
    const token = createAuthToken(user);
    const blackoutDate = addDaysIST(todayIST(), 5);

    await Blackout.create({
      date: blackoutDate,
      room: null, // campus-wide
      reason: 'National Holiday',
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: blackoutDate,
        slot: 11,
        purpose: 'Holiday booking',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('National Holiday');
  });

  it('enforces student daily quota of 3 bookings per day', async () => {
    const room = await Room.create({
      name: 'Quota Lab',
      building: 'Main',
      capacity: 10,
      openHour: 8,
      closeHour: 20,
    });
    const student = await createTestUser({ role: 'student' });
    const token = createAuthToken(student);
    const targetDate = addDaysIST(todayIST(), 4);

    // Create 3 bookings in separate slots
    for (let slot = 9; slot <= 11; slot++) {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `token=${token}`)
        .send({
          roomId: room._id.toString(),
          date: targetDate,
          slot,
          purpose: `Booking slot ${slot}`,
        });
      expect(res.status).toBe(201);
    }

    // 4th booking should be rejected with 409 quota exceeded
    const res4 = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 12,
        purpose: '4th slot attempt',
      });

    expect(res4.status).toBe(409);
    expect(res4.body.message).toContain('quota of 3 active slots reached');
  });

  it('allows faculty higher quota (6 active slots per day)', async () => {
    const room = await Room.create({
      name: 'Faculty Lab',
      building: 'Main',
      capacity: 10,
      openHour: 8,
      closeHour: 20,
    });
    const faculty = await createTestUser({ role: 'faculty' });
    const token = createAuthToken(faculty);
    const targetDate = addDaysIST(todayIST(), 6);

    // Faculty creates 4 bookings (which would fail for student)
    for (let slot = 9; slot <= 12; slot++) {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', `token=${token}`)
        .send({
          roomId: room._id.toString(),
          date: targetDate,
          slot,
          purpose: `Faculty slot ${slot}`,
        });
      expect(res.status).toBe(201);
    }
  });
});
