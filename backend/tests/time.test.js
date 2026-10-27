import { describe, it, expect } from 'vitest';
import { slotStart, slotEnd, todayIST, addDaysIST, isValidDateString } from '../src/utils/time.js';

describe('Time Utilities (IST Asia/Kolkata)', () => {
  it('correctly calculates slotStart and slotEnd in IST', () => {
    const start = slotStart('2026-10-27', 10);
    const end = slotEnd('2026-10-27', 10);

    // 10:00 IST is 04:30 UTC
    expect(start.toISOString()).toBe('2026-10-27T04:30:00.000Z');
    expect(end.toISOString()).toBe('2026-10-27T05:30:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
  });

  it('correctly calculates todayIST for a given UTC instant', () => {
    // 2026-10-27 20:00 UTC is 2026-10-28 01:30 IST
    const date = new Date('2026-10-27T20:00:00.000Z');
    expect(todayIST(date)).toBe('2026-10-28');
  });

  it('correctly adds days using addDaysIST', () => {
    expect(addDaysIST('2026-10-27', 5)).toBe('2026-11-01');
    expect(addDaysIST('2026-10-27', 14)).toBe('2026-11-10');
  });

  it('validates date string formats properly', () => {
    expect(isValidDateString('2026-10-27')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false); // invalid date
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('27-10-2026')).toBe(false);
  });
});
