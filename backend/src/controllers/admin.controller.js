import { getActivityLogs } from '../services/audit.service.js';

export const getActivity = async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const result = await getActivityLogs({ page, limit });
  res.status(200).json(result);
};
