// Strict Asia/Kolkata timezone helpers for client-side timetable calculations

export const getTodayIST = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

export const getTomorrowIST = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

export const getAddDaysIST = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

export const getISTCurrentHour = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
};

export const getISTCurrentMinute = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    minute: 'numeric',
  });
  return parseInt(formatter.format(new Date()), 10);
};

export const formatSlotHour = (hour) => {
  const h = Number(hour);
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
};

export const formatSlotRange = (startHour, endHour = null) => {
  const s = Number(startHour);
  const e = endHour !== null ? Number(endHour) : s + 1;
  const startStr = formatSlotHour(s);
  const endStr = formatSlotHour(e);
  return `${startStr} to ${endStr}`;
};

export const formatDateLabel = (dateStr) => {
  const today = getTodayIST();
  const tomorrow = getTomorrowIST();
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(dateObj);
};
