import mongoose from 'mongoose';

export const ACTIVE_STATUSES = ['pending', 'approved', 'checked_in'];

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    slot: {
      type: Number,
      required: [true, 'Slot start hour is required (0-23)'],
      min: 0,
      max: 23,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
      minlength: [3, 'Purpose must be at least 3 characters'],
      maxlength: [200, 'Purpose cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'checked_in',
        'completed',
        'rejected',
        'cancelled',
        'expired',
        'no_show',
      ],
      required: true,
    },
    holdsSlot: {
      type: Boolean,
      default: false,
    },
    checkInDeadline: {
      type: Date,
    },
    checkedInAt: {
      type: Date,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decisionNote: {
      type: String,
      trim: true,
      default: '',
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    fromWaitlist: {
      type: Boolean,
      default: false,
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Safety hook: ensures holdsSlot is strictly in sync with status
bookingSchema.pre('save', function (next) {
  this.holdsSlot = ACTIVE_STATUSES.includes(this.status);
  next();
});

// CRITICAL UNIQUE CONSTRAINTS (Race-safe concurrency enforcement)
// 1. No two active bookings can hold the same room, date, and slot
bookingSchema.index(
  { room: 1, date: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { holdsSlot: true },
    name: 'uniq_active_room_slot',
  }
);

// 2. A user cannot hold more than one booking in the same date and slot across all rooms
bookingSchema.index(
  { user: 1, date: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { holdsSlot: true },
    name: 'uniq_active_user_slot',
  }
);

// Query optimization indexes
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ status: 1, checkInDeadline: 1 });
bookingSchema.index({ room: 1, date: 1 });
bookingSchema.index({ startsAt: 1, endsAt: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
