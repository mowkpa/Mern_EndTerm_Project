import {
  getAnalyticsSummary,
  getUtilizationByRoom,
  getPeakHours,
  getNoShowsBreakdown,
  getDailyTrends,
  getRoomReleaseRate,
} from '../services/analytics.service.js';
import { httpError } from '../utils/httpError.js';

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

export const roomReleaseRate = async (req, res) => {
  const { roomId } = req.query;
  if (!roomId) {
    throw httpError(400, 'roomId is required');
  }
  const result = await getRoomReleaseRate(roomId);
  res.status(200).json(result);
};
