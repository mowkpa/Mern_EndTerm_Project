import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      unique: true,
      trim: true,
    },
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    equipment: {
      type: [String],
      default: [],
      set: (tags) => tags.map((t) => t.toLowerCase().trim()).filter(Boolean),
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    openHour: {
      type: Number,
      default: 8,
      min: 0,
      max: 23,
    },
    closeHour: {
      type: Number,
      default: 20,
      min: 1,
      max: 24,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ isActive: 1, capacity: 1 });

export const Room = mongoose.model('Room', roomSchema);
