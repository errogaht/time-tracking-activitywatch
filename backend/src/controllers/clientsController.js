const Client = require('../models/Client');
const BalanceService = require('../services/balanceService');

/**
 * Clients Controller
 * Handles all client-related HTTP requests
 */

/**
 * GET /api/clients
 * Get all clients (with optional filter for active only)
 */
const getAllClients = (req, res, next) => {
  try {
    const activeOnly = req.query.active === 'true';
    const clients = Client.findAll(activeOnly);

    res.json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:id
 * Get a single client by ID
 */
const getClientById = (req, res, next) => {
  try {
    const id = req.validatedId;
    const client = Client.findById(id);

    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Client with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/clients
 * Create a new client
 */
const createClient = (req, res, next) => {
  try {
    const clientData = {
      name: req.body.name,
      hourly_rate: Number(req.body.hourly_rate),
      contact_info: req.body.contact_info || null,
      activitywatch_category: req.body.activitywatch_category || null,
      is_active: req.body.is_active !== undefined ? req.body.is_active : 1,
      notes: req.body.notes || null
    };

    // Check if client with this name already exists
    const existingClient = Client.getByName(clientData.name);
    if (existingClient) {
      return res.status(409).json({
        error: 'Conflict',
        message: `Client with name "${clientData.name}" already exists`,
        existingClient: existingClient
      });
    }

    const newClient = Client.create(clientData);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: newClient
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A client with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * PUT /api/clients/:id
 * Update an existing client
 */
const updateClient = (req, res, next) => {
  try {
    const id = req.validatedId;

    // Check if client exists
    const existingClient = Client.findById(id);
    if (!existingClient) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Client with ID ${id} not found`
      });
    }

    // If name is being updated, check for uniqueness
    if (req.body.name && req.body.name !== existingClient.name) {
      const duplicateClient = Client.getByName(req.body.name);
      if (duplicateClient) {
        return res.status(409).json({
          error: 'Conflict',
          message: `Client with name "${req.body.name}" already exists`
        });
      }
    }

    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.hourly_rate !== undefined) updateData.hourly_rate = Number(req.body.hourly_rate);
    if (req.body.contact_info !== undefined) updateData.contact_info = req.body.contact_info;
    if (req.body.activitywatch_category !== undefined) updateData.activitywatch_category = req.body.activitywatch_category;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    const updatedClient = Client.update(id, updateData);

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClient
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A client with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/clients/:id
 * Soft delete a client (set is_active = false)
 */
const deleteClient = (req, res, next) => {
  try {
    const id = req.validatedId;

    // Check if client exists
    const existingClient = Client.findById(id);
    if (!existingClient) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Client with ID ${id} not found`
      });
    }

    // Check if already inactive
    if (existingClient.is_active === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Client is already inactive'
      });
    }

    const deleted = Client.delete(id, false); // Soft delete

    if (deleted) {
      res.json({
        success: true,
        message: 'Client deactivated successfully',
        data: {
          id: id,
          name: existingClient.name,
          is_active: false
        }
      });
    } else {
      throw new Error('Failed to deactivate client');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:id/balance
 * Get balance calculation for a client
 */
const getClientBalance = (req, res, next) => {
  try {
    const id = req.validatedId;

    const balanceData = BalanceService.calculateClientBalance(id);

    res.json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientBalance
};
