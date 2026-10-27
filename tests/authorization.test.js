import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Global Authorization & Access Control Rules', () => {
  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const endpoints = [
      { method: 'get', url: '/api/auth/me' },
      { method: 'get', url: '/api/rooms' },
      { method: 'get', url: '/api/rooms/availability?date=2026-11-20' },
      { method: 'post', url: '/api/bookings' },
      { method: 'get', url: '/api/bookings/mine' },
      { method: 'post', url: '/api/waitlist' },
      { method: 'get', url: '/api/notifications' },
      { method: 'get', url: '/api/admin/approvals' },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.url);
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    }
  });

  it('rejects student and faculty requests to admin endpoints with 403', async () => {
    const student = await createTestUser({ role: 'student' });
    const faculty = await createTestUser({ role: 'faculty' });
    const studentToken = createAuthToken(student);
    const facultyToken = createAuthToken(faculty);

    const testTokens = [studentToken, facultyToken];

    for (const token of testTokens) {
      // 1. Create Room (admin only)
      const roomRes = await request(app)
        .post('/api/rooms')
        .set('Cookie', `token=${token}`)
        .send({ name: 'Unauthorized Room', building: 'B', capacity: 10 });
      expect(roomRes.status).toBe(403);

      // 2. Create Blackout (admin only)
      const blackoutRes = await request(app)
        .post('/api/blackouts')
        .set('Cookie', `token=${token}`)
        .send({ date: '2026-11-20', reason: 'Unauthorized' });
      expect(blackoutRes.status).toBe(403);

      // 3. Admin Approvals Queue (admin only)
      const approvalsRes = await request(app)
        .get('/api/admin/approvals')
        .set('Cookie', `token=${token}`);
      expect(approvalsRes.status).toBe(403);
    }
  });

  it('prevents a user from accessing or modifying another user\'s booking', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const token1 = createAuthToken(user1);
    const token2 = createAuthToken(user2);

    const room = await Room.create({
      name: 'Auth Room',
      building: 'B',
      capacity: 5,
    });

    const targetDate = addDaysIST(todayIST(), 3);

    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token1}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 14,
        purpose: 'Confidential project',
      });
    const bookingId = bookRes.body.booking._id;

    // User 2 cannot view details
    const viewRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Cookie', `token=${token2}`);
    expect(viewRes.status).toBe(403);

    // User 2 cannot cancel
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', `token=${token2}`);
    expect(cancelRes.status).toBe(403);

    // User 2 cannot check in
    const checkInRes = await request(app)
      .post(`/api/bookings/${bookingId}/check-in`)
      .set('Cookie', `token=${token2}`);
    expect(checkInRes.status).toBe(403);
  });
});
