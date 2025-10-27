const TimeEntry = require('../models/TimeEntry');

/**
 * Time Entries Controller
 * Handles all time entry-related HTTP requests
 */

/**
 * GET /api/time-entries
 * Get all time entries with optional filters (client_id, work_date, is_billed)
 */
const getAllTimeEntries = (req, res, next) => {
  try {
    const filters = {};

    // Parse query parameters for filtering
    if (req.query.client_id) {
      filters.client_id = Number(req.query.client_id);
    }

    if (req.query.work_date) {
      filters.work_date = req.query.work_date;
    }

    if (req.query.is_billed !== undefined) {
      filters.is_billed = req.query.is_billed === 'true' || req.query.is_billed === '1';
    }

    // Check if requesting unbilled entries
    if (req.query.unbilled === 'true' || req.query.unbilled === '1') {
      const client_id = req.query.client_id ? Number(req.query.client_id) : null;
      const entries = TimeEntry.findUnbilled(client_id);

      return res.json({
        success: true,
        count: entries.length,
        data: entries
      });
    }

    const entries = TimeEntry.findAll(filters);

    res.json({
      success: true,
      count: entries.length,
      filters: filters,
      data: entries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/time-entries/:id
 * Get a single time entry by ID
 */
const getTimeEntryById = (req, res, next) => {
  try {
    const id = req.validatedId;
    const entry = TimeEntry.findById(id);

    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Time entry with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/time-entries
 * Create a new time entry
 */
const createTimeEntry = (req, res, next) => {
  try {
    const entryData = {
      client_id: Number(req.body.client_id),
      work_date: req.body.work_date,
      hours: Number(req.body.hours || 0),
      minutes: Number(req.body.minutes || 0),
      source: req.body.source || 'manual',
      activitywatch_exclude_afk: req.body.activitywatch_exclude_afk || false,
      is_billed: req.body.is_billed || false,
      bill_id: req.body.bill_id || null,
      notes: req.body.notes || null
    };

    const newEntry = TimeEntry.create(entryData);

    res.status(201).json({
      success: true,
      message: 'Time entry created successfully',
      data: newEntry
    });
  } catch (error) {
    // Handle foreign key constraint violation
    if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid client_id: Client does not exist'
      });
    }
    next(error);
  }
};

/**
 * PUT /api/time-entries/:id
 * Update an existing time entry
 */
const updateTimeEntry = (req, res, next) => {
  try {
    const id = req.validatedId;

    // Check if time entry exists
    const existingEntry = TimeEntry.findById(id);
    if (!existingEntry) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Time entry with ID ${id} not found`
      });
    }

    const updateData = {};

    if (req.body.client_id !== undefined) updateData.client_id = Number(req.body.client_id);
    if (req.body.work_date !== undefined) updateData.work_date = req.body.work_date;
    if (req.body.hours !== undefined) updateData.hours = Number(req.body.hours);
    if (req.body.minutes !== undefined) updateData.minutes = Number(req.body.minutes);
    if (req.body.source !== undefined) updateData.source = req.body.source;
    if (req.body.activitywatch_exclude_afk !== undefined) {
      updateData.activitywatch_exclude_afk = req.body.activitywatch_exclude_afk;
    }
    if (req.body.is_billed !== undefined) updateData.is_billed = req.body.is_billed;
    if (req.body.bill_id !== undefined) updateData.bill_id = req.body.bill_id;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    const updatedEntry = TimeEntry.update(id, updateData);

    res.json({
      success: true,
      message: 'Time entry updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    // Handle foreign key constraint violation
    if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid client_id: Client does not exist'
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/time-entries/:id
 * Delete a time entry
 */
const deleteTimeEntry = (req, res, next) => {
  try {
    const id = req.validatedId;

    // Check if time entry exists
    const existingEntry = TimeEntry.findById(id);
    if (!existingEntry) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Time entry with ID ${id} not found`
      });
    }

    const deleted = TimeEntry.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Time entry deleted successfully',
        data: {
          id: id,
          client_id: existingEntry.client_id,
          work_date: existingEntry.work_date
        }
      });
    } else {
      throw new Error('Failed to delete time entry');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/time-entries/totals/:client_id
 * Get total hours and minutes for a client
 */
const getClientTotals = (req, res, next) => {
  try {
    const clientId = req.validatedId;
    const totals = TimeEntry.getTotalsByClient(clientId);

    res.json({
      success: true,
      data: totals
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getClientTotals
};
