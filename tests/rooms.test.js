import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { Room } from '../src/models/room.model.js';

describe('Room & Blackout Management', () => {
  it('allows student to list active rooms, but blocks them from creating rooms with 403', async () => {
    const student = await createTestUser({ role: 'student' });
    const token = createAuthToken(student);

    // List rooms works
    const listRes = await request(app)
      .get('/api/rooms')
      .set('Cookie', `token=${token}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.rooms)).toBe(true);

    // Create room blocked with 403
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Cookie', `token=${token}`)
      .send({
        name: 'Hacked Lab',
        building: 'Science',
        capacity: 10,
      });
    expect(createRes.status).toBe(403);
    expect(createRes.body.message).toContain('Forbidden');
  });

  it('allows admin to create, update, and soft-delete rooms', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = createAuthToken(admin);

    // Create room
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Cookie', `token=${token}`)
      .send({
        name: 'Robotics Lab R-101',
        building: 'Engineering Block B',
        capacity: 25,
        equipment: ['computers', 'projector', 'AC'],
        requiresApproval: true,
        openHour: 9,
        closeHour: 19,
        description: 'Advanced robotics laboratory',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.room.name).toBe('Robotics Lab R-101');
    expect(createRes.body.room.equipment).toContain('ac'); // converted to lowercase
    const roomId = createRes.body.room._id;

    // Update room
    const updateRes = await request(app)
      .put(`/api/rooms/${roomId}`)
      .set('Cookie', `token=${token}`)
      .send({
        capacity: 30,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.room.capacity).toBe(30);

    // Soft delete room
    const deleteRes = await request(app)
      .delete(`/api/rooms/${roomId}`)
      .set('Cookie', `token=${token}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.room.isActive).toBe(false);

    // Verify student cannot see inactive room in regular list
    const student = await createTestUser({ role: 'student' });
    const studentToken = createAuthToken(student);
    const studentListRes = await request(app)
      .get('/api/rooms')
      .set('Cookie', `token=${studentToken}`);
    const found = studentListRes.body.rooms.find((r) => r._id === roomId);
    expect(found).toBeUndefined();
  });

  it('allows admin to manage blackout dates and rejects non-admin with 403', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const adminToken = createAuthToken(admin);
    const student = await createTestUser({ role: 'student' });
    const studentToken = createAuthToken(student);

    // Student blocked
    const studentBlackoutRes = await request(app)
      .post('/api/blackouts')
      .set('Cookie', `token=${studentToken}`)
      .send({
        date: '2026-11-15',
        reason: 'Unauthorized Maintenance',
      });
    expect(studentBlackoutRes.status).toBe(403);

    // Admin creates blackout
    const adminBlackoutRes = await request(app)
      .post('/api/blackouts')
      .set('Cookie', `token=${adminToken}`)
      .send({
        date: '2026-11-15',
        reason: 'Diwali Campus Holiday',
      });
    expect(adminBlackoutRes.status).toBe(201);
    expect(adminBlackoutRes.body.blackout.reason).toBe('Diwali Campus Holiday');
    const blackoutId = adminBlackoutRes.body.blackout._id;

    // Admin deletes blackout
    const deleteRes = await request(app)
      .delete(`/api/blackouts/${blackoutId}`)
      .set('Cookie', `token=${adminToken}`);
    expect(deleteRes.status).toBe(200);
  });
});
