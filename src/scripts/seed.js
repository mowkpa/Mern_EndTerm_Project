import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Room } from '../models/room.model.js';
import { Booking } from '../models/booking.model.js';
import { Waitlist } from '../models/waitlist.model.js';
import { Blackout } from '../models/blackout.model.js';
import { Notification } from '../models/notification.model.js';
import { todayIST, addDaysIST, slotStart, slotEnd } from '../utils/time.js';

const isProduction = env.NODE_ENV === 'production';
const hasForceFlag = process.argv.includes('--force');

if (isProduction && !hasForceFlag) {
  console.error('Refusing to seed production database without --force flag.');
  process.exit(1);
}

export const seedData = async () => {

    // Drop existing collections safely
    console.log('[Seed] Dropping existing SlotSync collections...');
    await Promise.all([
      User.deleteMany({}),
      Room.deleteMany({}),
      Booking.deleteMany({}),
      Waitlist.deleteMany({}),
      Blackout.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // Ensure partial unique indexes exist
    await Promise.all([
      User.init(),
      Room.init(),
      Booking.init(),
      Waitlist.init(),
      Blackout.init(),
      Notification.init(),
    ]);

    console.log('[Seed] Creating demo users...');
    const salt = await bcrypt.genSalt(10);
    const demoPasswordHash = await bcrypt.hash('Demo@12345', salt);

    const usersData = [
      {
        name: 'Campus Admin',
        email: 'admin@slotsync.demo',
        password: demoPasswordHash,
        role: 'admin',
        department: 'Campus Administration',
      },
      {
        name: 'Dr. Sarah Jenkins',
        email: 'faculty@slotsync.demo',
        password: demoPasswordHash,
        role: 'faculty',
        department: 'Computer Science',
      },
      {
        name: 'Alex Rivera',
        email: 'student1@slotsync.demo',
        password: demoPasswordHash,
        role: 'student',
        department: 'Computer Science',
      },
      {
        name: 'Priya Sharma',
        email: 'student2@slotsync.demo',
        password: demoPasswordHash,
        role: 'student',
        department: 'Information Technology',
      },
      {
        name: 'Marcus Chen',
        email: 'student3@slotsync.demo',
        password: demoPasswordHash,
        role: 'student',
        department: 'Electrical Engineering',
      },
      {
        name: 'Aisha Patel',
        email: 'student4@slotsync.demo',
        password: demoPasswordHash,
        role: 'student',
        department: 'Data Science',
      },
      {
        name: 'David Kim',
        email: 'student5@slotsync.demo',
        password: demoPasswordHash,
        role: 'student',
        department: 'Computer Science',
      },
    ];

    const users = await User.insertMany(usersData);
    const userMap = {};
    users.forEach((u) => {
      userMap[u.email] = u;
    });

    console.log('[Seed] Creating campus rooms...');
    const roomsData = [
      {
        name: 'Study Room A-101',
        building: 'Library 1st Floor',
        capacity: 4,
        equipment: ['whiteboard', 'ac'],
        requiresApproval: false,
        openHour: 8,
        closeHour: 20,
        description: 'Quiet study room equipped with a whiteboard and AC. Ideal for small group projects.',
      },
      {
        name: 'Study Room A-102',
        building: 'Library 1st Floor',
        capacity: 6,
        equipment: ['whiteboard', 'ac'],
        requiresApproval: false,
        openHour: 8,
        closeHour: 20,
        description: 'Medium group study room with natural lighting and ergonomic seating.',
      },
      {
        name: 'Quiet Study Room B-201',
        building: 'Science Block',
        capacity: 8,
        equipment: ['whiteboard', 'projector', 'ac'],
        requiresApproval: false,
        openHour: 8,
        closeHour: 21,
        description: 'Dedicated silent collaboration space with a digital display projector.',
      },
      {
        name: 'AI & Robotics Lab R-301',
        building: 'Engineering Block',
        capacity: 30,
        equipment: ['computers', 'projector', 'ac'],
        requiresApproval: true,
        openHour: 9,
        closeHour: 19,
        description: 'High-performance computing lab with GPU workstations and robotics testing bays. Faculty approval required.',
      },
      {
        name: 'Computer Lab C-202',
        building: 'Computing Center',
        capacity: 40,
        equipment: ['computers', 'projector', 'ac', 'whiteboard'],
        requiresApproval: true,
        openHour: 8,
        closeHour: 20,
        description: 'General campus computer laboratory. Requires department approval for group reservations.',
      },
      {
        name: 'Main Seminar Hall H-1',
        building: 'Central Auditorium',
        capacity: 100,
        equipment: ['projector', 'ac', 'whiteboard'],
        requiresApproval: true,
        openHour: 9,
        closeHour: 20,
        description: 'Tiered auditorium for guest lectures, workshops, and departmental symposiums. Admin approval required.',
      },
      {
        name: 'Meeting Room M-101',
        building: 'Admin Tower 2nd Floor',
        capacity: 10,
        equipment: ['whiteboard', 'projector', 'ac'],
        requiresApproval: false,
        openHour: 8,
        closeHour: 18,
        description: 'Conference room equipped with video conferencing setup and whiteboard.',
      },
      {
        name: 'Discussion Room M-102',
        building: 'Student Activity Center',
        capacity: 12,
        equipment: ['whiteboard'],
        requiresApproval: false,
        openHour: 8,
        closeHour: 22,
        description: 'Casual discussion space for club meetings, hackathon prep, and student organizations.',
      },
    ];

    const rooms = await Room.insertMany(roomsData);

    console.log('[Seed] Creating blackout dates...');
    const today = todayIST();
    const blackout1Date = addDaysIST(today, 7);
    const blackout2Date = addDaysIST(today, 12);

    await Blackout.create([
      {
        date: blackout1Date,
        room: null, // campus-wide
        reason: 'National Campus Holiday & Convocation',
      },
      {
        date: blackout2Date,
        room: rooms[3]._id, // Robotics lab
        reason: 'Workstation Network & Hardware Maintenance',
      },
    ]);

    console.log('[Seed] Generating historical bookings for analytics (last 30 days)...');
    const historicalBookings = [];
    const studentUsers = [
      userMap['student1@slotsync.demo'],
      userMap['student2@slotsync.demo'],
      userMap['student3@slotsync.demo'],
      userMap['student4@slotsync.demo'],
      userMap['student5@slotsync.demo'],
    ];

    // Seed 60 past bookings distributed over last 30 days
    for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
      const date = addDaysIST(today, -dayOffset);
      const bookingsOnDay = (dayOffset % 3) + 1; // 1 to 3 bookings per day

      for (let i = 0; i < bookingsOnDay; i++) {
        const room = rooms[(dayOffset + i) % rooms.length];
        const user = studentUsers[(dayOffset + i) % studentUsers.length];
        // Weight slots toward peak hours (11, 12, 14, 15, 16)
        const peakSlots = [10, 11, 12, 14, 15, 16, 17];
        const slot = peakSlots[(dayOffset + i * 2) % peakSlots.length];

        const startsAt = slotStart(date, slot);
        const endsAt = slotEnd(date, slot);

        // Realistic status distribution:
        // 70% completed, 15% no_show, 10% cancelled, 5% rejected
        const rand = (dayOffset * 7 + i * 13) % 100;
        let status = 'completed';
        if (rand < 15) {
          status = 'no_show';
        } else if (rand < 25) {
          status = 'cancelled';
        } else if (rand < 30 && room.requiresApproval) {
          status = 'rejected';
        }

        historicalBookings.push({
          room: room._id,
          user: user._id,
          date,
          slot,
          purpose: `Historical Academic Session ${dayOffset}-${i}`,
          status,
          holdsSlot: false, // historical bookings do not hold active slots
          startsAt,
          endsAt,
          checkedInAt: status === 'completed' ? startsAt : undefined,
          decisionNote: status === 'rejected' ? 'Conflict with department schedule' : undefined,
          decidedBy: room.requiresApproval ? userMap['admin@slotsync.demo']._id : undefined,
        });
      }
    }

    await Booking.insertMany(historicalBookings);

    console.log('[Seed] Creating future bookings and active waitlist demo...');
    const tomorrow = addDaysIST(today, 1);
    const dayAfter = addDaysIST(today, 2);

    // 1. Fully booked slot tomorrow with active waitlist entries for demonstration!
    const popularRoom = rooms[0]; // Study Room A-101
    const popularSlot = 14;

    const bookedSlotTomorrow = await Booking.create({
      room: popularRoom._id,
      user: userMap['student1@slotsync.demo']._id,
      date: tomorrow,
      slot: popularSlot,
      purpose: 'Algorithm Study Group',
      status: 'approved',
      holdsSlot: true,
      startsAt: slotStart(tomorrow, popularSlot),
      endsAt: slotEnd(tomorrow, popularSlot),
      checkInDeadline: new Date(slotStart(tomorrow, popularSlot).getTime() + env.GRACE_MINUTES * 60 * 1000),
    });

    // 2 people waiting in line for this slot
    await Waitlist.create([
      {
        room: popularRoom._id,
        date: tomorrow,
        slot: popularSlot,
        user: userMap['student2@slotsync.demo']._id,
        status: 'waiting',
      },
      {
        room: popularRoom._id,
        date: tomorrow,
        slot: popularSlot,
        user: userMap['student3@slotsync.demo']._id,
        status: 'waiting',
      },
    ]);

    // 2. Pending approval booking for AI Lab
    const pendingBooking = await Booking.create({
      room: rooms[3]._id, // AI Lab
      user: userMap['student4@slotsync.demo']._id,
      date: dayAfter,
      slot: 11,
      purpose: 'Autonomous Vehicle Vision Benchmark',
      status: 'pending',
      holdsSlot: true,
      startsAt: slotStart(dayAfter, 11),
      endsAt: slotEnd(dayAfter, 11),
      checkInDeadline: new Date(slotStart(dayAfter, 11).getTime() + env.GRACE_MINUTES * 60 * 1000),
    });

    // 3. Approved booking for Dr. Jenkins
    await Booking.create({
      room: rooms[5]._id, // Seminar Hall
      user: userMap['faculty@slotsync.demo']._id,
      date: dayAfter,
      slot: 15,
      purpose: 'Guest Lecture on Cloud Infrastructure',
      status: 'approved',
      holdsSlot: true,
      startsAt: slotStart(dayAfter, 15),
      endsAt: slotEnd(dayAfter, 15),
      checkInDeadline: new Date(slotStart(dayAfter, 15).getTime() + env.GRACE_MINUTES * 60 * 1000),
    });

    // 4. Sample notifications
    await Notification.create([
      {
        user: userMap['student1@slotsync.demo']._id,
        type: 'booking_approved',
        message: `Your booking for ${popularRoom.name} on ${tomorrow} (Slot ${popularSlot}:00) was approved.`,
        booking: bookedSlotTomorrow._id,
      },
      {
        user: userMap['admin@slotsync.demo']._id,
        type: 'approval_requested',
        message: `New approval request for ${rooms[3].name} by Aisha Patel.`,
        booking: pendingBooking._id,
      },
    ]);

    console.log('--------------------------------------------------');
    console.log('✅ SlotSync Demo Database successfully seeded!');
    console.log('--------------------------------------------------');
    console.log('Demo Accounts:');
    console.log('  Admin:   admin@slotsync.demo   / Demo@12345');
    console.log('  Faculty: faculty@slotsync.demo / Demo@12345');
    console.log('  Student: student1@slotsync.demo / Demo@12345');
    console.log('  Student: student2@slotsync.demo / Demo@12345');
    console.log('  Student: student3@slotsync.demo / Demo@12345');
    console.log('--------------------------------------------------');
};

export const seedDatabase = async () => {
  try {
    console.log(`[Seed] Connecting to database...`);
    await mongoose.connect(env.MONGODB_URI);
    console.log(`[Seed] Connected to ${mongoose.connection.host}`);
    await seedData();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed'))) {
  seedDatabase();
}

