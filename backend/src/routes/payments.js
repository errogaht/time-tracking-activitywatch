const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentTotalsByClient
} = require('../controllers/paymentsController');
const {
  validatePaymentData,
  validateIdParam
} = require('../middleware/validation');

/**
 * @route   GET /api/payments/totals/:client_id
 * @desc    Get payment totals by payment type for a specific client
 * @params  client_id - Client ID
 * @access  Public
 *
 * Note: This route must be defined before /:id to avoid conflicts
 */
router.get('/totals/:client_id', validateIdParam, getPaymentTotalsByClient);

/**
 * @route   GET /api/payments
 * @desc    Get all payments with optional filters
 * @query   client_id - Filter by client ID
 * @query   payment_type - Filter by payment type (money, supplements, other)
 * @query   payment_date_from - Filter payments from this date (YYYY-MM-DD)
 * @query   payment_date_to - Filter payments until this date (YYYY-MM-DD)
 * @access  Public
 */
router.get('/', getAllPayments);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @params  id - Payment ID
 * @access  Public
 */
router.get('/:id', validateIdParam, getPaymentById);

/**
 * @route   POST /api/payments
 * @desc    Create a new payment
 * @body    { client_id, payment_date, payment_type, amount?, supplements_description?, notes? }
 * @access  Public
 */
router.post('/', validatePaymentData, createPayment);

/**
 * @route   PUT /api/payments/:id
 * @desc    Update an existing payment
 * @params  id - Payment ID
 * @body    { client_id?, payment_date?, payment_type?, amount?, supplements_description?, notes? }
 * @access  Public
 */
router.put('/:id', validateIdParam, validatePaymentData, updatePayment);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Delete a payment
 * @params  id - Payment ID
 * @access  Public
 */
router.delete('/:id', validateIdParam, deletePayment);

module.exports = router;
