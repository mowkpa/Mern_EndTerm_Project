import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    status: {
      type: String,
      enum: ['waiting', 'promoted', 'cancelled', 'expired'],
      default: 'waiting',
    },
  },
  {
    timestamps: true,
  }
);

// One active waiting entry per user per room/date/slot
waitlistSchema.index(
  { room: 1, date: 1, slot: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'waiting' },
    name: 'uniq_active_user_waitlist',
  }
);

// Efficient FIFO queue ordering
waitlistSchema.index({ room: 1, date: 1, slot: 1, status: 1, createdAt: 1 });
waitlistSchema.index({ user: 1, status: 1 });

export const Waitlist = mongoose.model('Waitlist', waitlistSchema);
