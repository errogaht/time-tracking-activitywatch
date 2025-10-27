const { getDatabase } = require('../config/database');

class Payment {
  /**
   * Get all payments with optional filters
   * @param {Object} filters - Optional filters { client_id, payment_type, payment_date_from, payment_date_to }
   * @returns {Array} Array of payment objects
   */
  static findAll(filters = {}) {
    const db = getDatabase();
    let query = 'SELECT * FROM payments';
    const conditions = [];
    const values = [];

    // Apply filters
    if (filters.client_id !== undefined) {
      conditions.push('client_id = ?');
      values.push(filters.client_id);
    }

    if (filters.payment_type !== undefined) {
      conditions.push('payment_type = ?');
      values.push(filters.payment_type);
    }

    if (filters.payment_date_from !== undefined) {
      conditions.push('payment_date >= ?');
      values.push(filters.payment_date_from);
    }

    if (filters.payment_date_to !== undefined) {
      conditions.push('payment_date <= ?');
      values.push(filters.payment_date_to);
    }

    // Build WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY payment_date DESC, id DESC';

    return db.prepare(query).all(...values);
  }

  /**
   * Get payment by ID
   * @param {number} id - Payment ID
   * @returns {Object|null} Payment object or null if not found
   */
  static findById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  }

  /**
   * Get all payments for a specific client
   * @param {number} client_id - Client ID
   * @returns {Array} Array of payment objects
   */
  static findByClient(client_id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM payments WHERE client_id = ? ORDER BY payment_date DESC, id DESC').all(client_id);
  }

  /**
   * Create a new payment
   * @param {Object} paymentData - Payment data
   * @returns {Object} Created payment object
   */
  static create(paymentData) {
    const db = getDatabase();

    // Validate that client exists
    const Client = require('./Client');
    const client = Client.findById(paymentData.client_id);
    if (!client) {
      const error = new Error(`Client with ID ${paymentData.client_id} not found`);
      error.statusCode = 404;
      throw error;
    }

    const {
      client_id,
      payment_date,
      payment_type,
      amount = null,
      supplements_description = null,
      notes = null
    } = paymentData;

    const stmt = db.prepare(`
      INSERT INTO payments (client_id, payment_date, payment_type, amount, supplements_description, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      client_id,
      payment_date,
      payment_type,
      amount,
      supplements_description,
      notes
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Update payment
   * @param {number} id - Payment ID
   * @param {Object} paymentData - Updated payment data
   * @returns {Object|null} Updated payment object or null if not found
   */
  static update(id, paymentData) {
    const db = getDatabase();

    // Check if payment exists
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    // If client_id is being updated, validate the new client exists
    if (paymentData.client_id !== undefined && paymentData.client_id !== existing.client_id) {
      const Client = require('./Client');
      const client = Client.findById(paymentData.client_id);
      if (!client) {
        const error = new Error(`Client with ID ${paymentData.client_id} not found`);
        error.statusCode = 404;
        throw error;
      }
    }

    const fields = [];
    const values = [];

    // Build dynamic update query based on provided fields
    if (paymentData.client_id !== undefined) {
      fields.push('client_id = ?');
      values.push(paymentData.client_id);
    }
    if (paymentData.payment_date !== undefined) {
      fields.push('payment_date = ?');
      values.push(paymentData.payment_date);
    }
    if (paymentData.payment_type !== undefined) {
      fields.push('payment_type = ?');
      values.push(paymentData.payment_type);
    }
    if (paymentData.amount !== undefined) {
      fields.push('amount = ?');
      values.push(paymentData.amount);
    }
    if (paymentData.supplements_description !== undefined) {
      fields.push('supplements_description = ?');
      values.push(paymentData.supplements_description);
    }
    if (paymentData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(paymentData.notes);
    }

    if (fields.length === 0) {
      return existing;
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete payment
   * @param {number} id - Payment ID
   * @returns {boolean} True if deleted, false otherwise
   */
  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM payments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get total amounts by payment type for a client
   * @param {number} client_id - Client ID
   * @returns {Object} Object with totals by payment type
   */
  static getTotalsByClient(client_id) {
    const db = getDatabase();

    // Get totals grouped by payment type
    const stmt = db.prepare(`
      SELECT
        payment_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE client_id = ?
      GROUP BY payment_type
    `);

    const results = stmt.all(client_id);

    // Also get overall totals
    const overallStmt = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE client_id = ?
    `);

    const overall = overallStmt.get(client_id);

    return {
      client_id: client_id,
      by_type: results,
      overall: {
        count: overall.total_count,
        total_amount: overall.total_amount
      }
    };
  }
}

module.exports = Payment;
