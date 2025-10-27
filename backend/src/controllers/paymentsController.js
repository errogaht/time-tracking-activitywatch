const Payment = require('../models/Payment');

/**
 * Payments Controller
 * Handles all payment-related HTTP requests
 */

/**
 * GET /api/payments
 * Get all payments with optional filters
 */
const getAllPayments = (req, res, next) => {
  try {
    const filters = {};

    // Parse query parameters for filters
    if (req.query.client_id) {
      filters.client_id = Number(req.query.client_id);
    }

    if (req.query.payment_type) {
      filters.payment_type = req.query.payment_type;
    }

    if (req.query.payment_date_from) {
      filters.payment_date_from = req.query.payment_date_from;
    }

    if (req.query.payment_date_to) {
      filters.payment_date_to = req.query.payment_date_to;
    }

    const payments = Payment.findAll(filters);

    res.json({
      success: true,
      count: payments.length,
      filters: filters,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/:id
 * Get a single payment by ID
 */
const getPaymentById = (req, res, next) => {
  try {
    const id = req.validatedId;
    const payment = Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Payment with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments
 * Create a new payment
 */
const createPayment = (req, res, next) => {
  try {
    const paymentData = {
      client_id: Number(req.body.client_id),
      payment_date: req.body.payment_date,
      payment_type: req.body.payment_type,
      amount: req.body.amount !== undefined && req.body.amount !== null ? Number(req.body.amount) : null,
      supplements_description: req.body.supplements_description || null,
      notes: req.body.notes || null
    };

    const newPayment = Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: newPayment
    });
  } catch (error) {
    // Handle client not found error
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * PUT /api/payments/:id
 * Update an existing payment
 */
const updatePayment = (req, res, next) => {
  try {
    const id = req.validatedId;

    // Check if payment exists
    const existingPayment = Payment.findById(id);
    if (!existingPayment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Payment with ID ${id} not found`
      });
    }

    const updateData = {};

    if (req.body.client_id !== undefined) {
      updateData.client_id = Number(req.body.client_id);
    }
    if (req.body.payment_date !== undefined) {
      updateData.payment_date = req.body.payment_date;
    }
    if (req.body.payment_type !== undefined) {
      updateData.payment_type = req.body.payment_type;
    }
    if (req.body.amount !== undefined) {
      updateData.amount = req.body.amount !== null ? Number(req.body.amount) : null;
    }
    if (req.body.supplements_description !== undefined) {
      updateData.supplements_description = req.body.supplements_description;
    }
    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    const updatedPayment = Payment.update(id, updateData);

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedPayment
    });
  } catch (error) {
    // Handle client not found error
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/payments/:id
 * Delete a payment
 */
const deletePayment = (req, res, next) => {
  try {
    const id = req.validatedId;

    // Check if payment exists
    const existingPayment = Payment.findById(id);
    if (!existingPayment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Payment with ID ${id} not found`
      });
    }

    const deleted = Payment.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Payment deleted successfully',
        data: {
          id: id,
          deleted: true
        }
      });
    } else {
      throw new Error('Failed to delete payment');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/totals/:client_id
 * Get payment totals by payment type for a specific client
 */
const getPaymentTotalsByClient = (req, res, next) => {
  try {
    const client_id = req.validatedId;

    // Verify client exists
    const Client = require('../models/Client');
    const client = Client.findById(client_id);

    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Client with ID ${client_id} not found`
      });
    }

    const totals = Payment.getTotalsByClient(client_id);

    res.json({
      success: true,
      client: {
        id: client.id,
        name: client.name
      },
      data: totals
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentTotalsByClient
};
