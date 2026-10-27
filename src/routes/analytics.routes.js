import express from 'express';
import {
  summary,
  utilization,
  peakHours,
  noShows,
  daily,
  heatmap,
  insights,
  exportCsv,
  roomReleaseRate,
} from '../controllers/analytics.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Authenticated endpoint (students & faculty can view room release rate)
router.get('/room-release-rate', protect, asyncHandler(roomReleaseRate));

// Admin-only analytics endpoints below
router.use(protect, requireRole('admin'));

router.get('/summary', asyncHandler(summary));
router.get('/utilization', asyncHandler(utilization));
router.get('/peak-hours', asyncHandler(peakHours));
router.get('/no-shows', asyncHandler(noShows));
router.get('/daily', asyncHandler(daily));
router.get('/heatmap', asyncHandler(heatmap));
router.get('/insights', asyncHandler(insights));
router.get('/export.csv', asyncHandler(exportCsv));

export default router;
