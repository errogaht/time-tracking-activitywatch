const express = require('express');
const router = express.Router();
const {
  getAllBills,
  getBillById,
  createBillFromEntries,
  createBillFromDateRange,
  updateBill,
  deleteBill,
  getBillHTML
} = require('../controllers/billsController');
const {
  validateIdParam,
  validateBillFromEntries,
  validateBillFromRange,
  validateBillUpdate
} = require('../middleware/validation');

/**
 * @route   GET /api/bills
 * @desc    Get all bills with optional filters
 * @query   client_id, status, bill_type
 * @access  Public
 */
router.get('/', getAllBills);

/**
 * @route   GET /api/bills/:id
 * @desc    Get bill by ID (includes time entries)
 * @access  Public
 */
router.get('/:id', validateIdParam, getBillById);

/**
 * @route   GET /api/bills/:id/html
 * @desc    Get bill as HTML page for viewing/printing
 * @access  Public
 */
router.get('/:id/html', validateIdParam, getBillHTML);

/**
 * @route   POST /api/bills/from-entries
 * @desc    Create bill from selected time entry IDs
 * @body    { client_id, time_entry_ids: [], bill_type?, issue_date?, status?, notes? }
 * @access  Public
 */
router.post('/from-entries', validateBillFromEntries, createBillFromEntries);

/**
 * @route   POST /api/bills/from-range
 * @desc    Create bill from date range
 * @body    { client_id, period_from, period_to, bill_type?, issue_date?, status?, notes? }
 * @access  Public
 */
router.post('/from-range', validateBillFromRange, createBillFromDateRange);

/**
 * @route   PUT /api/bills/:id
 * @desc    Update bill (status, notes, etc.)
 * @access  Public
 */
router.put('/:id', validateIdParam, validateBillUpdate, updateBill);

/**
 * @route   DELETE /api/bills/:id
 * @desc    Delete bill (and unmark time entries)
 * @access  Public
 */
router.delete('/:id', validateIdParam, deleteBill);

module.exports = router;
