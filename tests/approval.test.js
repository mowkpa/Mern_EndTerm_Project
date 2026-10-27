import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Approval Workflow for Restricted Rooms', () => {
  it('creates a pending booking for rooms requiring approval, and approved for open rooms', async () => {
    const restrictedRoom = await Room.create({
      name: 'High Performance Lab',
      building: 'Engineering Block',
      capacity: 30,
      requiresApproval: true,
      openHour: 8,
      closeHour: 20,
    });

    const openRoom = await Room.create({
      name: 'General Study Room 1',
      building: 'Library',
      capacity: 4,
      requiresApproval: false,
      openHour: 8,
      closeHour: 20,
    });

    const student = await createTestUser();
    const token = createAuthToken(student);
    const targetDate = addDaysIST(todayIST(), 2);

    // Book restricted room
    const resRestricted = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: restrictedRoom._id.toString(),
        date: targetDate,
        slot: 10,
        purpose: 'Deep learning research',
      });
    expect(resRestricted.status).toBe(201);
    expect(resRestricted.body.booking.status).toBe('pending');
    expect(resRestricted.body.booking.holdsSlot).toBe(true);

    // Book open room for slot 11
    const resOpen = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token}`)
      .send({
        roomId: openRoom._id.toString(),
        date: targetDate,
        slot: 11,
        purpose: 'Math study',
      });
    expect(resOpen.status).toBe(201);
    expect(resOpen.body.booking.status).toBe('approved');
    expect(resOpen.body.booking.holdsSlot).toBe(true);
  });

  it('blocks non-admin students from approving or rejecting bookings with 403', async () => {
    const room = await Room.create({
      name: 'Robotics Center',
      building: 'Engineering',
      capacity: 20,
      requiresApproval: true,
    });
    const student1 = await createTestUser({ role: 'student' });
    const student2 = await createTestUser({ role: 'student' });
    const token1 = createAuthToken(student1);
    const token2 = createAuthToken(student2);
    const targetDate = addDaysIST(todayIST(), 3);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${token1}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 14,
        purpose: 'Autonomous drone testing',
      });
    const bookingId = bookingRes.body.booking._id;

    // Student 2 attempts to approve
    const approveRes = await request(app)
      .post(`/api/bookings/${bookingId}/approve`)
      .set('Cookie', `token=${token2}`);
    expect(approveRes.status).toBe(403);

    // Student 1 attempts to approve own booking
    const approveSelfRes = await request(app)
      .post(`/api/bookings/${bookingId}/approve`)
      .set('Cookie', `token=${token1}`);
    expect(approveSelfRes.status).toBe(403);
  });

  it('allows admin to approve a pending booking, and returns 409 if approved again', async () => {
    const room = await Room.create({
      name: 'Server Room Access',
      building: 'IT',
      capacity: 5,
      requiresApproval: true,
    });
    const student = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const studentToken = createAuthToken(student);
    const adminToken = createAuthToken(admin);
    const targetDate = addDaysIST(todayIST(), 4);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${studentToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 11,
        purpose: 'Server maintenance',
      });
    const bookingId = bookingRes.body.booking._id;

    // Admin approves
    const approveRes = await request(app)
      .post(`/api/bookings/${bookingId}/approve`)
      .set('Cookie', `token=${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.booking.status).toBe('approved');

    // Admin attempts to approve again (should return 409)
    const approveAgainRes = await request(app)
      .post(`/api/bookings/${bookingId}/approve`)
      .set('Cookie', `token=${adminToken}`);
    expect(approveAgainRes.status).toBe(409);
    expect(approveAgainRes.body.message).toContain('Cannot approve booking');
  });

  it('allows admin to reject a pending booking with a reason note', async () => {
    const room = await Room.create({
      name: 'Seminar Hall',
      building: 'Auditorium',
      capacity: 100,
      requiresApproval: true,
    });
    const student = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const studentToken = createAuthToken(student);
    const adminToken = createAuthToken(admin);
    const targetDate = addDaysIST(todayIST(), 5);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${studentToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 16,
        purpose: 'Gaming tournament',
      });
    const bookingId = bookingRes.body.booking._id;

    // Admin rejects with note
    const rejectRes = await request(app)
      .post(`/api/bookings/${bookingId}/reject`)
      .set('Cookie', `token=${adminToken}`)
      .send({
        note: 'Not an academic campus event',
      });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.booking.status).toBe('rejected');
    expect(rejectRes.body.booking.decisionNote).toBe('Not an academic campus event');
    expect(rejectRes.body.booking.holdsSlot).toBe(false);

    // Verify DB state
    const dbBooking = await Booking.findById(bookingId);
    expect(dbBooking.status).toBe('rejected');
    expect(dbBooking.holdsSlot).toBe(false);
  });

  it('allows admin to inspect pending approvals queue', async () => {
    const room = await Room.create({
      name: 'Auditorium B',
      building: 'Arts',
      capacity: 80,
      requiresApproval: true,
    });
    const student = await createTestUser();
    const admin = await createTestUser({ role: 'admin' });
    const studentToken = createAuthToken(student);
    const adminToken = createAuthToken(admin);
    const targetDate = addDaysIST(todayIST(), 2);

    await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${studentToken}`)
      .send({
        roomId: room._id.toString(),
        date: targetDate,
        slot: 15,
        purpose: 'Rehearsal',
      });

    const queueRes = await request(app)
      .get('/api/admin/approvals')
      .set('Cookie', `token=${adminToken}`);

    expect(queueRes.status).toBe(200);
    expect(Array.isArray(queueRes.body.approvals)).toBe(true);
    expect(queueRes.body.approvals.some((a) => a.room.name === 'Auditorium B')).toBe(true);
  });
});
