const express = require('express');
const router = express.Router();
const {
  getStatus,
  getBuckets,
  getCategories,
  getTimeData,
  importTime
} = require('../controllers/activityWatchController');

/**
 * @route   GET /api/activitywatch/status
 * @desc    Check if ActivityWatch is running and accessible
 * @access  Public
 */
router.get('/status', getStatus);

/**
 * @route   GET /api/activitywatch/buckets
 * @desc    Get list of available ActivityWatch buckets
 * @access  Public
 */
router.get('/buckets', getBuckets);

/**
 * @route   GET /api/activitywatch/categories
 * @desc    Get list of available categories from window watcher events
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   GET /api/activitywatch/time
 * @desc    Get time spent on a category for a specific date
 * @query   category - Category name (required)
 * @query   date - Date in YYYY-MM-DD format (required)
 * @query   exclude_afk - Boolean to exclude AFK time (optional, default: false)
 * @access  Public
 */
router.get('/time', getTimeData);

/**
 * @route   POST /api/activitywatch/import
 * @desc    Import time from ActivityWatch as a TimeEntry
 * @body    { client_id, date, category, exclude_afk? }
 * @access  Public
 */
router.post('/import', importTime);

module.exports = router;
