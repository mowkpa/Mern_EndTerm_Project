const IST_OFFSET = '+05:30';

/**
 * Returns a Date object for the start of the given 1-hour slot in IST.
 * @param {string} date - "YYYY-MM-DD"
 * @param {number} slot - start hour 0-23
 */
export const slotStart = (date, slot) => {
  return new Date(`${date}T${String(slot).padStart(2, '0')}:00:00${IST_OFFSET}`);
};

/**
 * Returns a Date object for the end of the given 1-hour slot in IST.
 * @param {string} date - "YYYY-MM-DD"
 * @param {number} slot - start hour 0-23
 */
export const slotEnd = (date, slot) => {
  return new Date(slotStart(date, slot).getTime() + 60 * 60 * 1000);
};

/**
 * Returns today's date formatted as "YYYY-MM-DD" in Asia/Kolkata timezone.
 * @param {Date} [now=new Date()]
 */
export const todayIST = (now = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
};

/**
 * Returns the current hour in Asia/Kolkata timezone (0-23).
 * @param {Date} [now=new Date()]
 */
export const currentHourIST = (now = new Date()) => {
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  }).format(now);
  return parseInt(timeStr, 10);
};

/**
 * Adds N days to a "YYYY-MM-DD" date string in IST and returns the new "YYYY-MM-DD".
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {number} days
 */
export const addDaysIST = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Noon UTC avoids any daylight saving or boundary shifts
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

/**
 * Validates whether string is in "YYYY-MM-DD" format and represents a valid date.
 * @param {string} s
 */
export const isValidDateString = (s) => {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [year, month, day] = s.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
};
