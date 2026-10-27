import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { AuditLog } from '../src/models/auditLog.model.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Admin Activity Log and Redesigned Actions (E6)', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let studentToken;
  let room;
  let testDate;

  beforeEach(async () => {
    testDate = addDaysIST(todayIST(), 2);

    adminUser = await createTestUser({ role: 'admin', email: 'admin@slotsync.demo', name: 'Admin Jane' });
    adminToken = createAuthToken(adminUser);

    studentUser = await createTestUser({ role: 'student', email: 'student@slotsync.demo', name: 'Student John' });
    studentToken = createAuthToken(studentUser);

    room = await Room.create({
      name: 'Seminar Hall B',
      building: 'Block B',
      capacity: 60,
      openHour: 8,
      closeHour: 20,
      isActive: true,
      requiresApproval: true,
    });
  });

  describe('GET /api/admin/activity access control', () => {
    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/admin/activity');
      expect(res.status).toBe(401);
    });

    it('returns 403 for student user', async () => {
      const res = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 200 with activity list for admin user', async () => {
      const res = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.activity)).toBe(true);
      expect(res.body.page).toBe(1);
    });
  });

  describe('Service Audit Hooks', () => {
    it('records audit log on room creation and deactivation', async () => {
      const createRes = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Conference Room 9',
          building: 'Tower 1',
          capacity: 15,
          openHour: 9,
          closeHour: 18,
          equipment: ['projector'],
        });
      expect(createRes.status).toBe(201);
      const newRoomId = createRes.body.room._id;

      let log = await AuditLog.findOne({ action: 'room_create', targetId: newRoomId });
      expect(log).not.toBeNull();
      expect(log.targetType).toBe('Room');
      expect(log.summary).toContain('Conference Room 9');

      // Deactivate
      const delRes = await request(app)
        .delete(`/api/rooms/${newRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);

      log = await AuditLog.findOne({ action: 'room_deactivate', targetId: newRoomId });
      expect(log).not.toBeNull();
      expect(log.summary).toContain('deactivated');
    });

    it('records audit log on blackout creation and deletion', async () => {
      const bRes = await request(app)
        .post('/api/blackouts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: testDate,
          reason: 'Campus Annual Fest',
        });
      expect(bRes.status).toBe(201);
      const blackoutId = bRes.body.blackout._id;

      let log = await AuditLog.findOne({ action: 'blackout_create', targetId: blackoutId });
      expect(log).not.toBeNull();
      expect(log.summary).toContain('Campus Annual Fest');

      // Delete
      const delRes = await request(app)
        .delete(`/api/blackouts/${blackoutId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);

      log = await AuditLog.findOne({ action: 'blackout_delete', targetId: blackoutId });
      expect(log).not.toBeNull();
    });

    it('records audit log on user role change', async () => {
      const roleRes = await request(app)
        .put(`/api/users/${studentUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'faculty' });
      expect(roleRes.status).toBe(200);

      const log = await AuditLog.findOne({ action: 'role_change', targetId: studentUser._id });
      expect(log).not.toBeNull();
      expect(log.meta.oldRole).toBe('student');
      expect(log.meta.newRole).toBe('faculty');
    });

    it('records audit log on booking approve, reject, and admin cancel', async () => {
      // 1. Create pending booking
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          roomId: room._id.toString(),
          date: testDate,
          slot: 10,
          purpose: 'Seminar session',
        });
      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.booking._id;

      // 2. Admin Approve
      const approveRes = await request(app)
        .post(`/api/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approveRes.status).toBe(200);

      let log = await AuditLog.findOne({ action: 'approve', targetId: bookingId });
      expect(log).not.toBeNull();
      expect(log.summary).toContain('approved booking');

      // 3. Admin Cancel
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(cancelRes.status).toBe(200);

      log = await AuditLog.findOne({ action: 'admin_cancel', targetId: bookingId });
      expect(log).not.toBeNull();
      expect(log.summary).toContain('cancelled');

      // 4. Another booking to reject
      const bookRes2 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          roomId: room._id.toString(),
          date: testDate,
          slot: 12,
          purpose: 'Debate rehearsal',
        });
      expect(bookRes2.status).toBe(201);
      const bookingId2 = bookRes2.body.booking._id;

      const rejectRes = await request(app)
        .post(`/api/bookings/${bookingId2}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Room undergoing maintenance' });
      expect(rejectRes.status).toBe(200);

      log = await AuditLog.findOne({ action: 'reject', targetId: bookingId2 });
      expect(log).not.toBeNull();
      expect(log.summary).toContain('Room undergoing maintenance');
    });
  });
});
