import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Blackout } from '../src/models/blackout.model.js';
import { createTestUser, createAuthToken } from './helpers.js';
import { todayIST, addDaysIST } from '../src/utils/time.js';

describe('Smart Alternatives & Release Rate (E4)', () => {
  let student;
  let studentToken;
  let origRoom;
  let testDate;

  beforeEach(async () => {
    testDate = addDaysIST(todayIST(), 2);

    student = await createTestUser({ role: 'student', email: 'student_alt@slotsync.demo' });
    studentToken = createAuthToken(student);

    origRoom = await Room.create({
      name: 'Seminar Room 101',
      building: 'Block A',
      capacity: 20,
      openHour: 8,
      closeHour: 20,
      equipment: ['projector', 'whiteboard'],
      isActive: true,
      requiresApproval: false,
    });
  });

  describe('GET /api/rooms/alternatives', () => {
    it('requires authentication', async () => {
      const res = await request(app).get(
        `/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`
      );
      expect(res.status).toBe(401);
    });

    it('never returns the original room and slot', async () => {
      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('alternatives');
      const alts = res.body.alternatives;
      const hasOriginal = alts.some(
        (a) => a.roomId.toString() === origRoom._id.toString() && a.date === testDate && a.slot === 14
      );
      expect(hasOriginal).toBe(false);
    });

    it('enforces equipment superset rule', async () => {
      // Room with subset of equipment (missing whiteboard) -> should be excluded
      await Room.create({
        name: 'Subset Room',
        building: 'Block A',
        capacity: 20,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector'],
        isActive: true,
      });

      // Room with superset of equipment (projector, whiteboard, mic) -> should be included
      const supersetRoom = await Room.create({
        name: 'Superset Room',
        building: 'Block A',
        capacity: 20,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector', 'whiteboard', 'mic'],
        isActive: true,
      });

      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      const sameSlotAlts = res.body.alternatives.filter((a) => a.type === 'same_slot');
      expect(sameSlotAlts.some((a) => a.roomId.toString() === supersetRoom._id.toString())).toBe(true);
      expect(sameSlotAlts.some((a) => a.roomName === 'Subset Room')).toBe(false);
    });

    it('ranks same building higher than different building for same slot', async () => {
      const sameBuildingRoom = await Room.create({
        name: 'Room Same Bldg',
        building: 'Block A', // Same as origRoom
        capacity: 20,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector', 'whiteboard'],
        isActive: true,
      });

      const diffBuildingRoom = await Room.create({
        name: 'Room Diff Bldg',
        building: 'Block Z', // Different building
        capacity: 20,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector', 'whiteboard'],
        isActive: true,
      });

      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      const sameSlotAlts = res.body.alternatives.filter((a) => a.type === 'same_slot');
      const idxSame = sameSlotAlts.findIndex((a) => a.roomId.toString() === sameBuildingRoom._id.toString());
      const idxDiff = sameSlotAlts.findIndex((a) => a.roomId.toString() === diffBuildingRoom._id.toString());

      expect(idxSame).toBeGreaterThanOrEqual(0);
      expect(idxDiff).toBeGreaterThanOrEqual(0);
      expect(idxSame).toBeLessThan(idxDiff);
    });

    it('ranks closer time distance higher than farther distance', async () => {
      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      const nearbyAlts = res.body.alternatives.filter((a) => a.type === 'nearby_slot');
      const dist1 = nearbyAlts.filter((a) => a.slot === 13 || a.slot === 15);
      const dist2 = nearbyAlts.filter((a) => a.slot === 12 || a.slot === 16);

      if (dist1.length > 0 && dist2.length > 0) {
        const idx1 = nearbyAlts.indexOf(dist1[0]);
        const idx2 = nearbyAlts.indexOf(dist2[0]);
        expect(idx1).toBeLessThan(idx2);
      }
    });

    it('penalizes massive capacity surplus', async () => {
      const snugRoom = await Room.create({
        name: 'Snug Room',
        building: 'Block A',
        capacity: 22,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector', 'whiteboard'],
        isActive: true,
      });

      const massiveHall = await Room.create({
        name: 'Auditorium',
        building: 'Block A',
        capacity: 100,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector', 'whiteboard'],
        isActive: true,
      });

      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14&capacity=20`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      const sameSlotAlts = res.body.alternatives.filter((a) => a.type === 'same_slot');
      const idxSnug = sameSlotAlts.findIndex((a) => a.roomId.toString() === snugRoom._id.toString());
      const idxMassive = sameSlotAlts.findIndex((a) => a.roomId.toString() === massiveHall._id.toString());

      expect(idxSnug).toBeGreaterThanOrEqual(0);
      expect(idxMassive).toBeGreaterThanOrEqual(0);
      expect(idxSnug).toBeLessThan(idxMassive);
    });

    it('excludes blackout options', async () => {
      const candidateRoom = await Room.create({
        name: 'Blackout Candidate Room',
        building: 'Block A',
        capacity: 20,
        openHour: 8,
        closeHour: 20,
        equipment: ['projector', 'whiteboard'],
        isActive: true,
      });

      await Blackout.create({
        date: testDate,
        room: candidateRoom._id,
        reason: 'Maintenance',
      });

      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      const alts = res.body.alternatives;
      expect(alts.some((a) => a.roomId.toString() === candidateRoom._id.toString())).toBe(false);
    });

    it('excludes options when user has already reached daily quota', async () => {
      for (let s = 9; s <= 11; s++) {
        await Booking.create({
          room: origRoom._id,
          user: student._id,
          date: testDate,
          slot: s,
          purpose: `Existing booking ${s}`,
          status: 'approved',
          holdsSlot: true,
          startsAt: new Date(),
          endsAt: new Date(),
        });
      }

      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      const altsOnTestDate = res.body.alternatives.filter((a) => a.date === testDate);
      expect(altsOnTestDate).toHaveLength(0);
    });

    it('handles no alternatives gracefully returning empty array', async () => {
      await Room.findByIdAndUpdate(origRoom._id, { isActive: false });

      const res = await request(app)
        .get(`/api/rooms/alternatives?roomId=${origRoom._id}&date=${testDate}&slot=14`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.alternatives).toEqual([]);
    });
  });

  describe('GET /api/analytics/room-release-rate', () => {
    it('returns null rate when sample size < 10', async () => {
      for (let i = 1; i <= 6; i++) {
        await Booking.create({
          room: origRoom._id,
          user: student._id,
          date: todayIST(),
          slot: 8 + i,
          purpose: `Booking ${i}`,
          status: i % 2 === 0 ? 'cancelled' : 'completed',
          holdsSlot: false,
          startsAt: new Date(),
          endsAt: new Date(),
        });
      }

      const res = await request(app)
        .get(`/api/analytics/room-release-rate?roomId=${origRoom._id}`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.sampleSize).toBe(6);
      expect(res.body.rate).toBeNull();
    });

    it('returns accurate percentage when sample size >= 10', async () => {
      for (let i = 1; i <= 10; i++) {
        let status = 'completed';
        if (i === 1 || i === 2) status = 'cancelled';
        if (i === 3) status = 'no_show';

        await Booking.create({
          room: origRoom._id,
          user: student._id,
          date: todayIST(),
          slot: 8 + (i % 12),
          purpose: `Booking ${i}`,
          status,
          holdsSlot: false,
          startsAt: new Date(),
          endsAt: new Date(),
        });
      }

      const res = await request(app)
        .get(`/api/analytics/room-release-rate?roomId=${origRoom._id}`)
        .set('Cookie', [`token=${studentToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.sampleSize).toBe(10);
      expect(res.body.rate).toBe(30);
    });
  });
});
