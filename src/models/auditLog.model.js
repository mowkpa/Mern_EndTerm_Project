import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'approve',
        'reject',
        'admin_cancel',
        'room_create',
        'room_update',
        'room_deactivate',
        'blackout_create',
        'blackout_delete',
        'role_change',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['Booking', 'Room', 'Blackout', 'User'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
