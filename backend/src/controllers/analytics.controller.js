import {
  getAnalyticsSummary,
  getUtilizationByRoom,
  getPeakHours,
  getNoShowsBreakdown,
  getDailyTrends,
} from '../services/analytics.service.js';

export const summary = async (req, res) => {
  const result = await getAnalyticsSummary(req.query.from, req.query.to);
  res.status(200).json(result);
};

export const utilization = async (req, res) => {
  const result = await getUtilizationByRoom(req.query.from, req.query.to);
  res.status(200).json({ utilization: result });
};

export const peakHours = async (req, res) => {
  const result = await getPeakHours(req.query.from, req.query.to);
  res.status(200).json({ peakHours: result });
};

export const noShows = async (req, res) => {
  const result = await getNoShowsBreakdown(req.query.from, req.query.to);
  res.status(200).json({ noShows: result });
};

export const daily = async (req, res) => {
  const result = await getDailyTrends(req.query.from, req.query.to);
  res.status(200).json({ daily: result });
};
