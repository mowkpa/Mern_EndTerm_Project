import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { User } from '../src/models/user.model.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Admin Users & Analytics API', () => {
  it('allows admin to list and search users, and update user roles', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const targetStudent = await createTestUser({
      name: 'Bob Candidate',
      email: 'bob.candidate@slotsync.demo',
      role: 'student',
    });
    const adminToken = createAuthToken(admin);

    // List users
    const listRes = await request(app)
      .get('/api/users?search=Candidate')
      .set('Cookie', `token=${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.users.some((u) => u.email === 'bob.candidate@slotsync.demo')).toBe(true);

    // Promote student to faculty
    const updateRes = await request(app)
      .patch(`/api/users/${targetStudent._id}/role`)
      .set('Cookie', `token=${adminToken}`)
      .send({ role: 'faculty' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.role).toBe('faculty');

    const updatedUser = await User.findById(targetStudent._id);
    expect(updatedUser.role).toBe('faculty');
  });

  it('prevents an admin from demoting their own account', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const adminToken = createAuthToken(admin);

    const demoteRes = await request(app)
      .patch(`/api/users/${admin._id}/role`)
      .set('Cookie', `token=${adminToken}`)
      .send({ role: 'student' });

    expect(demoteRes.status).toBe(400);
    expect(demoteRes.body.message).toContain('cannot demote their own account');
  });

  it('computes accurate analytics summary, utilization, and peak hours', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const student = await createTestUser();
    const adminToken = createAuthToken(admin);

    const room = await Room.create({
      name: 'Analytics Lab',
      building: 'Engineering',
      capacity: 25,
      openHour: 8,
      closeHour: 20,
    });

    const today = todayIST();
    const targetDate = addDaysIST(today, -2);

    // Create 1 completed booking and 1 no_show booking
    await Booking.create([
      {
        room: room._id,
        user: student._id,
        date: targetDate,
        slot: 11,
        purpose: 'Session 1',
        status: 'completed',
        holdsSlot: false,
      },
      {
        room: room._id,
        user: student._id,
        date: targetDate,
        slot: 14,
        purpose: 'Session 2',
        status: 'no_show',
        holdsSlot: false,
      },
    ]);

    // 1. Analytics Summary
    const summaryRes = await request(app)
      .get(`/api/analytics/summary?from=${targetDate}&to=${today}`)
      .set('Cookie', `token=${adminToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.totalBookings).toBeGreaterThanOrEqual(2);
    expect(summaryRes.body.usedBookings).toBeGreaterThanOrEqual(2);
    expect(summaryRes.body.noShowRate).toBeGreaterThan(0);

    // 2. Room Utilization
    const utilRes = await request(app)
      .get(`/api/analytics/utilization?from=${targetDate}&to=${today}`)
      .set('Cookie', `token=${adminToken}`);

    expect(utilRes.status).toBe(200);
    const labStats = utilRes.body.utilization.find((u) => u.roomName === 'Analytics Lab');
    expect(labStats).toBeDefined();
    expect(labStats.bookedSlots).toBe(2);

    // 3. Peak Hours
    const peakRes = await request(app)
      .get(`/api/analytics/peak-hours?from=${targetDate}&to=${today}`)
      .set('Cookie', `token=${adminToken}`);

    expect(peakRes.status).toBe(200);
    expect(Array.isArray(peakRes.body.peakHours)).toBe(true);
    const slot11 = peakRes.body.peakHours.find((h) => h.hour === 11);
    expect(slot11.bookings).toBeGreaterThanOrEqual(1);

    // 4. No-Shows breakdown
    const noShowRes = await request(app)
      .get(`/api/analytics/no-shows?from=${targetDate}&to=${today}`)
      .set('Cookie', `token=${adminToken}`);

    expect(noShowRes.status).toBe(200);
    const labNoShow = noShowRes.body.noShows.find((n) => n.roomName === 'Analytics Lab');
    expect(labNoShow.noShowCount).toBe(1);
  });
});
