import { User } from '../models/user.model.js';
import { logAudit } from './audit.service.js';
import { httpError } from '../utils/httpError.js';

export const updateUserRoleService = async (targetUserId, role, actor) => {
  if (!['student', 'faculty', 'admin'].includes(role)) {
    throw httpError(400, 'Invalid role. Must be student, faculty, or admin');
  }

  // An admin cannot demote their own account
  if (actor?._id && actor._id.toString() === targetUserId && role !== 'admin') {
    throw httpError(400, 'Administrators cannot demote their own account');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw httpError(404, 'User not found');
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  if (actor) {
    await logAudit({
      actor: actor._id,
      action: 'role_change',
      targetType: 'User',
      targetId: user._id,
      summary: `${actor.name || 'Admin'} changed role of ${user.name} from ${oldRole} to ${role}`,
      meta: { oldRole, newRole: role, userName: user.name, userEmail: user.email },
    });
  }

  return user;
};
