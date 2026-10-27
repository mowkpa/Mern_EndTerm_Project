import { AuditLog } from '../models/auditLog.model.js';

export const logAudit = async ({ actor, action, targetType, targetId, summary, meta = {} }) => {
  try {
    const actorId = actor?._id || actor;
    const entry = await AuditLog.create({
      actor: actorId,
      action,
      targetType,
      targetId,
      summary,
      meta,
    });
    return entry;
  } catch (err) {
    console.error('[AuditLog] Error recording audit log:', err.message);
    return null;
  }
};

export const getActivityLogs = async ({ page = 1, limit = 25 }) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [activity, total] = await Promise.all([
    AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(),
  ]);

  return {
    activity,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  };
};
