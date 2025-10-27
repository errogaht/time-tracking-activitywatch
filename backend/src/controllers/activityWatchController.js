const ActivityWatchService = require('../services/activityWatchService');

/**
 * ActivityWatch Controller
 * Handles all ActivityWatch integration HTTP requests
 */

/**
 * GET /api/activitywatch/status
 * Check if ActivityWatch is running and accessible
 */
const getStatus = async (req, res, next) => {
  try {
    const service = new ActivityWatchService();
    const status = await service.checkStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/activitywatch/buckets
 * Get list of available ActivityWatch buckets
 */
const getBuckets = async (req, res, next) => {
  try {
    const service = new ActivityWatchService();
    const buckets = await service.getAvailableBuckets();

    res.json({
      success: true,
      count: Object.keys(buckets).length,
      data: buckets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/activitywatch/categories
 * Get list of available categories from window watcher events
 */
const getCategories = async (req, res, next) => {
  try {
    const service = new ActivityWatchService();
    const categories = await service.getCategories();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/activitywatch/time
 * Get time spent on a category for a specific date
 * Query params:
 *   - category (required): Category name
 *   - date (required): Date in YYYY-MM-DD format
 *   - exclude_afk (optional): Boolean to exclude AFK time (default: false)
 */
const getTimeData = async (req, res, next) => {
  try {
    const { category, date, exclude_afk } = req.query;

    // Validate required parameters
    if (!category) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: category'
      });
    }

    if (!date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: date'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid date format. Expected YYYY-MM-DD'
      });
    }

    // Parse exclude_afk parameter
    const excludeAfk = exclude_afk === 'true' || exclude_afk === '1';

    const service = new ActivityWatchService();
    const timeData = await service.getTimeByCategory(category, date, excludeAfk);

    res.json({
      success: true,
      data: {
        category,
        date,
        ...timeData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/activitywatch/import
 * Import time from ActivityWatch as a TimeEntry
 * Body:
 *   - client_id (required): Client ID
 *   - date (required): Date in YYYY-MM-DD format
 *   - category (required): Category name
 *   - exclude_afk (optional): Boolean to exclude AFK time (default: false)
 */
const importTime = async (req, res, next) => {
  try {
    const { client_id, date, category, exclude_afk } = req.body;

    // Validate required parameters
    if (!client_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: client_id'
      });
    }

    if (!date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: date'
      });
    }

    if (!category) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: category'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid date format. Expected YYYY-MM-DD'
      });
    }

    // Validate client_id is a number
    const clientIdNum = Number(client_id);
    if (isNaN(clientIdNum) || clientIdNum <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid client_id. Must be a positive number'
      });
    }

    // Parse exclude_afk parameter
    const excludeAfk = exclude_afk === true || exclude_afk === 'true' || exclude_afk === '1';

    const service = new ActivityWatchService();
    const result = await service.importTimeEntry(clientIdNum, date, category, excludeAfk);

    res.status(201).json({
      success: true,
      message: 'Time entry imported successfully from ActivityWatch',
      data: result
    });
  } catch (error) {
    // Handle specific errors from TimeEntry creation
    if (error.message && error.message.includes('does not exist')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  getStatus,
  getBuckets,
  getCategories,
  getTimeData,
  importTime
};
