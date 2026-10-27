import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Analytics Upgrade (E7)', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let studentToken;
  let room;
  let testDate;

  beforeEach(async () => {
    testDate = todayIST();

    adminUser = await createTestUser({ role: 'admin', email: 'analytics-admin@slotsync.demo' });
    adminToken = createAuthToken(adminUser);

    studentUser = await createTestUser({ role: 'student', email: 'analytics-student@slotsync.demo' });
    studentToken = createAuthToken(studentUser);

    room = await Room.create({
      name: 'Lecture Theatre C',
      building: 'Main Block',
      capacity: 120,
      openHour: 8,
      closeHour: 20,
      isActive: true,
      requiresApproval: false,
    });

    // Create some sample bookings
    await Booking.create({
      room: room._id,
      user: studentUser._id,
      date: testDate,
      slot: 10,
      status: 'completed',
      purpose: 'Computer Science lecture',
      holdsSlot: true,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600000),
    });

    await Booking.create({
      room: room._id,
      user: studentUser._id,
      date: testDate,
      slot: 14,
      status: 'no_show',
      purpose: 'Study Group',
      holdsSlot: false,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600000),
    });
  });

  describe('GET /api/analytics/summary with deltas', () => {
    it('returns summary containing deltas object', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalBookings');
      expect(res.body).toHaveProperty('deltas');
      expect(res.body.deltas).toHaveProperty('totalBookings');
      expect(res.body.deltas).toHaveProperty('utilizationRate');
      expect(res.body.deltas).toHaveProperty('noShowRate');
    });
  });

  describe('GET /api/analytics/heatmap', () => {
    it('returns 7 x 24 hourly demand matrix', async () => {
      const res = await request(app)
        .get('/api/analytics/heatmap')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.heatmap)).toBe(true);
      expect(res.body.heatmap.length).toBe(7 * 24);

      // Verify structure of an entry
      const first = res.body.heatmap[0];
      expect(first).toHaveProperty('day');
      expect(first).toHaveProperty('hour');
      expect(first).toHaveProperty('count');
    });
  });

  describe('GET /api/analytics/insights', () => {
    it('returns rule-based insights array', async () => {
      const res = await request(app)
        .get('/api/analytics/insights')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.insights)).toBe(true);
    });
  });

  describe('GET /api/analytics/export.csv', () => {
    it('streams CSV with proper headers and rows', async () => {
      const res = await request(app)
        .get('/api/analytics/export.csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');

      // CSV contains header row
      expect(res.text).toContain('Booking ID,Date,Slot');
      // CSV contains purpose of created booking
      expect(res.text).toContain('Computer Science lecture');
    });
  });

  describe('Access Control', () => {
    it('rejects non-admin access to admin analytics routes', async () => {
      const res = await request(app)
        .get('/api/analytics/export.csv')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
