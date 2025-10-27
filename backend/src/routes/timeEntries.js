const express = require('express');
const router = express.Router();
const {
  getAllTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getClientTotals
} = require('../controllers/timeEntriesController');
const {
  validateTimeEntryData,
  validateIdParam
} = require('../middleware/validation');

/**
 * @route   GET /api/time-entries
 * @desc    Get all time entries (optionally filter by client_id, work_date, is_billed, unbilled)
 * @query   client_id - Filter by client ID
 * @query   work_date - Filter by work date (YYYY-MM-DD)
 * @query   is_billed - Filter by billed status (true/false)
 * @query   unbilled - Get only unbilled entries (true/false)
 * @access  Public
 */
router.get('/', getAllTimeEntries);

/**
 * @route   GET /api/time-entries/totals/:id
 * @desc    Get total hours and minutes for a client
 * @params  id - Client ID
 * @access  Public
 */
router.get('/totals/:id', validateIdParam, getClientTotals);

/**
 * @route   GET /api/time-entries/:id
 * @desc    Get time entry by ID
 * @params  id - Time entry ID
 * @access  Public
 */
router.get('/:id', validateIdParam, getTimeEntryById);

/**
 * @route   POST /api/time-entries
 * @desc    Create a new time entry
 * @body    { client_id, work_date, hours?, minutes?, source?, activitywatch_exclude_afk?, is_billed?, bill_id?, notes? }
 * @access  Public
 */
router.post('/', validateTimeEntryData, createTimeEntry);

/**
 * @route   PUT /api/time-entries/:id
 * @desc    Update an existing time entry
 * @params  id - Time entry ID
 * @body    { client_id?, work_date?, hours?, minutes?, source?, activitywatch_exclude_afk?, is_billed?, bill_id?, notes? }
 * @access  Public
 */
router.put('/:id', validateIdParam, validateTimeEntryData, updateTimeEntry);

/**
 * @route   DELETE /api/time-entries/:id
 * @desc    Delete a time entry
 * @params  id - Time entry ID
 * @access  Public
 */
router.delete('/:id', validateIdParam, deleteTimeEntry);

module.exports = router;
