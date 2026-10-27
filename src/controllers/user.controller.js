import { User } from '../models/user.model.js';
import { updateUserRoleService } from '../services/user.service.js';

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
  const user = await updateUserRoleService(req.params.id, req.body.role, req.user);

  res.status(200).json({
    message: `User role updated to ${req.body.role} successfully`,
    user,
  });
};
