const express = require('express');
const router = express.Router();
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientBalance
} = require('../controllers/clientsController');
const {
  validateClientData,
  validateIdParam
} = require('../middleware/validation');

/**
 * @route   GET /api/clients
 * @desc    Get all clients (optionally filter by active status)
 * @query   active=true - Filter for active clients only
 * @access  Public
 */
router.get('/', getAllClients);

/**
 * @route   GET /api/clients/:id/balance
 * @desc    Get balance calculation for a client
 * @params  id - Client ID
 * @access  Public
 */
router.get('/:id/balance', validateIdParam, getClientBalance);

/**
 * @route   GET /api/clients/:id
 * @desc    Get client by ID
 * @params  id - Client ID
 * @access  Public
 */
router.get('/:id', validateIdParam, getClientById);

/**
 * @route   POST /api/clients
 * @desc    Create a new client
 * @body    { name, hourly_rate, contact_info?, activitywatch_category?, is_active?, notes? }
 * @access  Public
 */
router.post('/', validateClientData, createClient);

/**
 * @route   PUT /api/clients/:id
 * @desc    Update an existing client
 * @params  id - Client ID
 * @body    { name?, hourly_rate?, contact_info?, activitywatch_category?, is_active?, notes? }
 * @access  Public
 */
router.put('/:id', validateIdParam, validateClientData, updateClient);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Soft delete a client (set is_active = false)
 * @params  id - Client ID
 * @access  Public
 */
router.delete('/:id', validateIdParam, deleteClient);

module.exports = router;
