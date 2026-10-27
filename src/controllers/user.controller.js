import { User } from '../models/user.model.js';
import { httpError } from '../utils/httpError.js';

export const listUsers = async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    users,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
};

export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  const targetUserId = req.params.id;

  if (!['student', 'faculty', 'admin'].includes(role)) {
    throw httpError(400, 'Invalid role. Must be student, faculty, or admin');
  }

  // An admin cannot demote themselves (security invariant)
  if (req.user._id.toString() === targetUserId && role !== 'admin') {
    throw httpError(400, 'Administrators cannot demote their own account');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw httpError(404, 'User not found');
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    message: `User role updated to ${role} successfully`,
    user,
  });
};
