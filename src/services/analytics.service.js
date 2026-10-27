import { Booking } from '../models/booking.model.js';
import { Room } from '../models/room.model.js';
import { todayIST, addDaysIST } from '../utils/time.js';

const USED_STATUSES = ['approved', 'checked_in', 'completed', 'no_show'];

const parseDateRange = (from, to) => {
  const today = todayIST();
  let startDate = from || addDaysIST(today, -30);
  let endDate = to || today;

  if (startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  // Calculate day difference
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const dayDiff = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

  // Cap at 180 days
  const cappedDays = Math.min(Math.max(1, dayDiff), 180);

  return { startDate, endDate, daysCount: cappedDays };
};

const calcPctDelta = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const getAnalyticsSummary = async (from, to) => {
  const { startDate, endDate, daysCount } = parseDateRange(from, to);

  // Compute previous period of identical length for delta calculations
  const prevEndDate = addDaysIST(startDate, -1);
  const prevStartDate = addDaysIST(prevEndDate, -(daysCount - 1));

  const [activeRooms, pendingApprovals, bookingStats, prevBookingStats] = await Promise.all([
    Room.find({ isActive: true }),
    Booking.countDocuments({ status: 'pending' }),
    Booking.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          used: {
            $sum: {
              $cond: [{ $in: ['$status', USED_STATUSES] }, 1, 0],
            },
          },
          noShow: {
            $sum: {
              $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0],
            },
          },
          attended: {
            $sum: {
              $cond: [{ $in: ['$status', ['checked_in', 'completed']] }, 1, 0],
            },
          },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          date: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          used: {
            $sum: {
              $cond: [{ $in: ['$status', USED_STATUSES] }, 1, 0],
            },
          },
          noShow: {
            $sum: {
              $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0],
            },
          },
          attended: {
            $sum: {
              $cond: [{ $in: ['$status', ['checked_in', 'completed']] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const stats = bookingStats[0] || { total: 0, used: 0, noShow: 0, attended: 0 };
  const prevStats = prevBookingStats[0] || { total: 0, used: 0, noShow: 0, attended: 0 };

  // Calculate total capacity slots across all active rooms
  let totalAvailableSlots = 0;
  activeRooms.forEach((room) => {
    const dailySlots = Math.max(0, (room.closeHour || 20) - (room.openHour || 8));
    totalAvailableSlots += dailySlots * daysCount;
  });

  const utilizationRate =
    totalAvailableSlots > 0 ? Math.min(100, (stats.used / totalAvailableSlots) * 100) : 0;

  const totalFinishedOrNoShow = stats.noShow + stats.attended;
  const noShowRate =
    totalFinishedOrNoShow > 0 ? (stats.noShow / totalFinishedOrNoShow) * 100 : 0;

  const prevFinishedOrNoShow = prevStats.noShow + prevStats.attended;
  const prevUtilizationRate =
    totalAvailableSlots > 0 ? Math.min(100, (prevStats.used / totalAvailableSlots) * 100) : 0;
  const prevNoShowRate =
    prevFinishedOrNoShow > 0 ? (prevStats.noShow / prevFinishedOrNoShow) * 100 : 0;

  const deltas = {
    totalBookings: calcPctDelta(stats.total, prevStats.total),
    usedBookings: calcPctDelta(stats.used, prevStats.used),
    utilizationRate: Number((utilizationRate - prevUtilizationRate).toFixed(1)),
    noShowRate: Number((noShowRate - prevNoShowRate).toFixed(1)),
  };

  return {
    range: { startDate, endDate, daysCount },
    previousRange: { prevStartDate, prevEndDate },
    totalBookings: stats.total,
    usedBookings: stats.used,
    activeRooms: activeRooms.length,
    pendingApprovals,
    utilizationRate: Number(utilizationRate.toFixed(1)),
    noShowRate: Number(noShowRate.toFixed(1)),
    deltas,
  };
};

export const getUtilizationByRoom = async (from, to) => {
  const { startDate, endDate, daysCount } = parseDateRange(from, to);

  const rooms = await Room.find({ isActive: true });

  const roomBookings = await Booking.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: { $in: USED_STATUSES },
      },
    },
    {
      $group: {
        _id: '$room',
        bookedSlots: { $sum: 1 },
      },
    },
  ]);

  const bookingMap = {};
  roomBookings.forEach((b) => {
    bookingMap[b._id.toString()] = b.bookedSlots;
  });

  return rooms.map((room) => {
    const dailySlots = Math.max(0, (room.closeHour || 20) - (room.openHour || 8));
    const availableSlots = dailySlots * daysCount;
    const bookedSlots = bookingMap[room._id.toString()] || 0;
    const utilizationPct =
      availableSlots > 0 ? Math.min(100, (bookedSlots / availableSlots) * 100) : 0;

    return {
      roomId: room._id,
      roomName: room.name,
      building: room.building,
      capacity: room.capacity,
      bookedSlots,
      availableSlots,
      utilizationPct: Number(utilizationPct.toFixed(1)),
    };
  });
};

export const getPeakHours = async (from, to) => {
  const { startDate, endDate } = parseDateRange(from, to);

  const results = await Booking.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: { $in: USED_STATUSES },
      },
    },
    {
      $group: {
        _id: '$slot',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const peakHourMap = {};
  results.forEach((r) => {
    peakHourMap[r._id] = r.count;
  });

  const fullHours = [];
  for (let hour = 8; hour <= 21; hour++) {
    fullHours.push({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      bookings: peakHourMap[hour] || 0,
    });
  }

  return fullHours;
};

export const getNoShowsBreakdown = async (from, to) => {
  const { startDate, endDate } = parseDateRange(from, to);

  const [rooms, noShowStats] = await Promise.all([
    Room.find({ isActive: true }),
    Booking.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: { $in: ['no_show', 'completed', 'checked_in'] },
        },
      },
      {
        $group: {
          _id: '$room',
          noShows: {
            $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  const statsMap = {};
  noShowStats.forEach((s) => {
    statsMap[s._id.toString()] = s;
  });

  return rooms.map((room) => {
    const s = statsMap[room._id.toString()] || { noShows: 0, total: 0 };
    const rate = s.total > 0 ? (s.noShows / s.total) * 100 : 0;
    return {
      roomId: room._id,
      roomName: room.name,
      building: room.building,
      noShowCount: s.noShows,
      totalCount: s.total,
      noShowRate: Number(rate.toFixed(1)),
    };
  });
};

export const getDailyTrends = async (from, to) => {
  const { startDate, endDate } = parseDateRange(from, to);

  const results = await Booking.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$date',
        totalBookings: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $in: ['$status', ['completed', 'checked_in']] }, 1, 0] },
        },
        noShows: {
          $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((r) => ({
    date: r._id,
    totalBookings: r.totalBookings,
    completed: r.completed,
    noShows: r.noShows,
  }));
};

/**
 * Calculates demand heatmap: weekday (0-6) x hour (0-23) booking counts.
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export const getDemandHeatmap = async (from, to) => {
  const { startDate, endDate } = parseDateRange(from, to);

  const bookings = await Booking.find({
    date: { $gte: startDate, $lte: endDate },
    status: { $in: USED_STATUSES },
  }).select('date slot');

  // Initialize 7 days x 24 hours grid
  const grid = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid.push({
        day: d,
        hour: h,
        count: 0,
      });
    }
  }

  const indexMap = {};
  grid.forEach((item, idx) => {
    indexMap[`${item.day}-${item.hour}`] = idx;
  });

  bookings.forEach((b) => {
    const dateObj = new Date(b.date + 'T12:00:00');
    const day = dateObj.getDay();
    const hour = b.slot;
    const key = `${day}-${hour}`;
    if (indexMap[key] !== undefined) {
      grid[indexMap[key]].count += 1;
    }
  });

  return grid;
};

/**
 * Generates rule-based insights:
 * 1. Room no-show > 25% (min 5 bookings)
 * 2. Peak hours congestion > 85%
 * 3. Low room utilization < 20%
 * 4. Pending approvals waiting > 24 hours
 */
export const getRuleBasedInsights = async (from, to) => {
  const { startDate, endDate } = parseDateRange(from, to);
  const insights = [];

  const [noShowsList, roomUtilList, peakHoursList, activeRooms, stalePendingCount] = await Promise.all([
    getNoShowsBreakdown(from, to),
    getUtilizationByRoom(from, to),
    getPeakHours(from, to),
    Room.find({ isActive: true }),
    Booking.countDocuments({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  // Rule 1: High no-show rooms
  noShowsList.forEach((r) => {
    if (r.totalCount >= 5 && r.noShowRate > 25) {
      insights.push({
        id: `noshow-${r.roomId}`,
        type: 'warning',
        title: 'High No-Show Rate',
        message: `"${r.roomName}" (${r.building}) has a ${r.noShowRate}% no-show rate (${r.noShowCount} unattended reservations). Consider enabling approval requirements.`,
        meta: { roomId: r.roomId, rate: r.noShowRate },
      });
    }
  });

  // Rule 2: Peak congestion window
  const activeRoomsCount = activeRooms.length || 1;
  peakHoursList.forEach((h) => {
    if (h.bookings > 0 && h.bookings / activeRoomsCount >= 0.85) {
      insights.push({
        id: `peak-${h.hour}`,
        type: 'info',
        title: 'Peak Demand Window',
        message: `Extremely high congestion observed at ${h.label} (${h.bookings} simultaneous reservations). Consider nudging users toward adjacent morning or late afternoon slots.`,
        meta: { hour: h.hour, bookings: h.bookings },
      });
    }
  });

  // Rule 3: Low utilization
  roomUtilList.forEach((r) => {
    if (r.availableSlots >= 20 && r.utilizationPct < 20) {
      insights.push({
        id: `lowutil-${r.roomId}`,
        type: 'neutral',
        title: 'Low Room Utilization',
        message: `"${r.roomName}" is at only ${r.utilizationPct}% utilization (${r.bookedSlots}/${r.availableSlots} available hours booked).`,
        meta: { roomId: r.roomId, utilization: r.utilizationPct },
      });
    }
  });

  // Rule 4: Stale pending approvals
  if (stalePendingCount > 0) {
    insights.push({
      id: 'stale-approvals',
      type: 'warning',
      title: 'Pending Approvals Delay',
      message: `${stalePendingCount} reservation request${stalePendingCount > 1 ? 's have' : ' has'} been awaiting administrative review for more than 24 hours.`,
      meta: { count: stalePendingCount },
    });
  }

  return insights;
};

/**
 * Streams/exports analytics bookings in CSV format with RFC 4180 compliant escaping.
 */
export const exportBookingsCsv = async (from, to) => {
  const { startDate, endDate } = parseDateRange(from, to);

  const bookings = await Booking.find({
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('room', 'name building capacity')
    .populate('user', 'name email department role')
    .sort({ date: -1, slot: 1 });

  const headers = [
    'Booking ID',
    'Date',
    'Slot',
    'Start Time',
    'End Time',
    'Room',
    'Building',
    'Requester Name',
    'Requester Email',
    'Role',
    'Department',
    'Status',
    'Purpose',
    'Created At',
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = bookings.map((b) => {
    const slotStartStr = `${String(b.slot).padStart(2, '0')}:00`;
    const slotEndStr = `${String(b.slot + 1).padStart(2, '0')}:00`;

    return [
      escapeCsv(b._id),
      escapeCsv(b.date),
      escapeCsv(b.slot),
      escapeCsv(slotStartStr),
      escapeCsv(slotEndStr),
      escapeCsv(b.room?.name || 'Unknown Room'),
      escapeCsv(b.room?.building || ''),
      escapeCsv(b.user?.name || 'Unknown User'),
      escapeCsv(b.user?.email || ''),
      escapeCsv(b.user?.role || ''),
      escapeCsv(b.user?.department || ''),
      escapeCsv(b.status),
      escapeCsv(b.purpose || ''),
      escapeCsv(b.createdAt ? new Date(b.createdAt).toISOString() : ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
};

/**
 * Calculates historical release rate for a room over past 30 days:
 * Computed as (cancelled + no_show) / total bookings.
 * Returns { rate: number | null, sampleSize: number }.
 * If total < 10, rate is null.
 */
export const getRoomReleaseRate = async (roomId, now = new Date()) => {
  const today = todayIST(now);
  const thirtyDaysAgo = addDaysIST(today, -30);

  const bookings = await Booking.find({
    room: roomId,
    date: { $gte: thirtyDaysAgo, $lte: today },
  }).select('status');

  const total = bookings.length;
  if (total < 10) {
    return { rate: null, sampleSize: total };
  }

  const releasedCount = bookings.filter((b) => b.status === 'cancelled' || b.status === 'no_show').length;
  const rate = Math.round((releasedCount / total) * 100);
  return { rate, sampleSize: total };
};
