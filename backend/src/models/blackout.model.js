import mongoose from 'mongoose';

const blackoutSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null, // null indicates the blackout applies campus-wide to all rooms
    },
    reason: {
      type: String,
      required: [true, 'Reason for blackout is required'],
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
    },
  },
  {
    timestamps: true,
  }
);

blackoutSchema.index({ date: 1, room: 1 });

export const Blackout = mongoose.model('Blackout', blackoutSchema);
