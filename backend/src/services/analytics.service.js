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

export const getAnalyticsSummary = async (from, to) => {
  const { startDate, endDate, daysCount } = parseDateRange(from, to);

  const [activeRooms, pendingApprovals, bookingStats] = await Promise.all([
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
  ]);

  const stats = bookingStats[0] || { total: 0, used: 0, noShow: 0, attended: 0 };

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

  return {
    range: { startDate, endDate, daysCount },
    totalBookings: stats.total,
    usedBookings: stats.used,
    activeRooms: activeRooms.length,
    pendingApprovals,
    utilizationRate: Number(utilizationRate.toFixed(1)),
    noShowRate: Number(noShowRate.toFixed(1)),
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
