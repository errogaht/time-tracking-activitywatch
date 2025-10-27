const { getDatabase } = require('../config/database');
const TimeEntry = require('./TimeEntry');
const Client = require('./Client');

class Bill {
  /**
   * Get all bills with optional filters
   * @param {Object} filters - Optional filters { client_id, status, bill_type }
   * @returns {Array} Array of bill objects
   */
  static findAll(filters = {}) {
    const db = getDatabase();
    const conditions = [];
    const values = [];

    if (filters.client_id !== undefined) {
      conditions.push('client_id = ?');
      values.push(filters.client_id);
    }

    if (filters.status !== undefined) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (filters.bill_type !== undefined) {
      conditions.push('bill_type = ?');
      values.push(filters.bill_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM bills ${whereClause} ORDER BY issue_date DESC, id DESC`;

    return db.prepare(query).all(...values);
  }

  /**
   * Get bill by ID with associated time entries
   * @param {number} id - Bill ID
   * @returns {Object|null} Bill object with time_entries array or null if not found
   */
  static findById(id) {
    const db = getDatabase();
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);

    if (!bill) {
      return null;
    }

    // Get associated time entries
    const timeEntries = this.getTimeEntries(id);
    bill.time_entries = timeEntries;

    return bill;
  }

  /**
   * Create a new bill
   * @param {Object} data - Bill data
   * @returns {Object} Created bill object
   */
  static create(data) {
    const db = getDatabase();
    const {
      client_id,
      bill_number,
      bill_type = 'invoice',
      issue_date,
      period_from = null,
      period_to = null,
      total_hours = 0,
      total_minutes = 0,
      total_amount,
      status = 'draft',
      notes = null
    } = data;

    // Validate that client exists
    const client = Client.findById(client_id);
    if (!client) {
      const error = new Error(`Client with ID ${client_id} does not exist`);
      error.statusCode = 400;
      throw error;
    }

    const stmt = db.prepare(`
      INSERT INTO bills (
        client_id, bill_number, bill_type, issue_date, period_from, period_to,
        total_hours, total_minutes, total_amount, status, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      client_id, bill_number, bill_type, issue_date, period_from, period_to,
      total_hours, total_minutes, total_amount, status, notes
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Update bill
   * @param {number} id - Bill ID
   * @param {Object} data - Updated bill data
   * @returns {Object|null} Updated bill object or null if not found
   */
  static update(id, data) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    // Build dynamic update query based on provided fields
    if (data.bill_number !== undefined) {
      fields.push('bill_number = ?');
      values.push(data.bill_number);
    }

    if (data.bill_type !== undefined) {
      fields.push('bill_type = ?');
      values.push(data.bill_type);
    }

    if (data.issue_date !== undefined) {
      fields.push('issue_date = ?');
      values.push(data.issue_date);
    }

    if (data.period_from !== undefined) {
      fields.push('period_from = ?');
      values.push(data.period_from);
    }

    if (data.period_to !== undefined) {
      fields.push('period_to = ?');
      values.push(data.period_to);
    }

    if (data.total_hours !== undefined) {
      fields.push('total_hours = ?');
      values.push(data.total_hours);
    }

    if (data.total_minutes !== undefined) {
      fields.push('total_minutes = ?');
      values.push(data.total_minutes);
    }

    if (data.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(data.total_amount);
    }

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE bills SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete bill and unmark associated time entries
   * @param {number} id - Bill ID
   * @returns {boolean} True if deleted, false otherwise
   */
  static delete(id) {
    const db = getDatabase();

    // First, unmark all time entries associated with this bill
    db.prepare(`
      UPDATE time_entries
      SET is_billed = 0, bill_id = NULL
      WHERE bill_id = ?
    `).run(id);

    // Then delete the bill
    const stmt = db.prepare('DELETE FROM bills WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Generate bill from selected time entries
   * @param {number} client_id - Client ID
   * @param {Array} time_entry_ids - Array of time entry IDs
   * @param {Object} bill_data - Additional bill data (bill_type, issue_date, notes)
   * @returns {Object} Created bill with time entries
   */
  static generateFromTimeEntries(client_id, time_entry_ids, bill_data = {}) {
    const db = getDatabase();

    // Validate client exists
    const client = Client.findById(client_id);
    if (!client) {
      const error = new Error(`Client with ID ${client_id} does not exist`);
      error.statusCode = 400;
      throw error;
    }

    // Fetch the time entries
    const timeEntries = time_entry_ids.map(id => {
      const entry = TimeEntry.findById(id);
      if (!entry) {
        const error = new Error(`Time entry with ID ${id} does not exist`);
        error.statusCode = 400;
        throw error;
      }
      if (entry.client_id !== client_id) {
        const error = new Error(`Time entry ${id} does not belong to client ${client_id}`);
        error.statusCode = 400;
        throw error;
      }
      if (entry.is_billed) {
        const error = new Error(`Time entry ${id} is already billed`);
        error.statusCode = 400;
        throw error;
      }
      return entry;
    });

    if (timeEntries.length === 0) {
      const error = new Error('No valid time entries provided');
      error.statusCode = 400;
      throw error;
    }

    // Calculate totals
    let totalMinutes = 0;
    let minDate = null;
    let maxDate = null;

    timeEntries.forEach(entry => {
      totalMinutes += entry.total_minutes;
      if (!minDate || entry.work_date < minDate) {
        minDate = entry.work_date;
      }
      if (!maxDate || entry.work_date > maxDate) {
        maxDate = entry.work_date;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalAmount = (totalMinutes / 60) * client.hourly_rate;

    // Generate bill number
    const billNumber = this.generateBillNumber(bill_data.bill_type || 'invoice');

    // Create the bill record
    const billDataToCreate = {
      client_id,
      bill_number: billNumber,
      bill_type: bill_data.bill_type || 'invoice',
      issue_date: bill_data.issue_date || new Date().toISOString().split('T')[0],
      period_from: minDate,
      period_to: maxDate,
      total_hours: totalHours,
      total_minutes: remainingMinutes,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      status: bill_data.status || 'draft',
      notes: bill_data.notes || null
    };

    const bill = this.create(billDataToCreate);

    // Mark time entries as billed
    const updateStmt = db.prepare(`
      UPDATE time_entries
      SET is_billed = 1, bill_id = ?
      WHERE id = ?
    `);

    timeEntries.forEach(entry => {
      updateStmt.run(bill.id, entry.id);
    });

    // Return the created bill with entries
    return this.findById(bill.id);
  }

  /**
   * Generate bill from date range
   * @param {number} client_id - Client ID
   * @param {string} date_from - Start date (YYYY-MM-DD)
   * @param {string} date_to - End date (YYYY-MM-DD)
   * @param {Object} bill_data - Additional bill data (bill_type, issue_date, notes)
   * @returns {Object} Created bill with time entries
   */
  static generateFromDateRange(client_id, date_from, date_to, bill_data = {}) {
    const db = getDatabase();

    // Validate client exists
    const client = Client.findById(client_id);
    if (!client) {
      const error = new Error(`Client with ID ${client_id} does not exist`);
      error.statusCode = 400;
      throw error;
    }

    // Get unbilled time entries in the date range
    const timeEntries = db.prepare(`
      SELECT * FROM time_entries
      WHERE client_id = ?
        AND work_date >= ?
        AND work_date <= ?
        AND is_billed = 0
      ORDER BY work_date ASC
    `).all(client_id, date_from, date_to);

    if (timeEntries.length === 0) {
      const error = new Error(`No unbilled time entries found for client ${client_id} in the date range ${date_from} to ${date_to}`);
      error.statusCode = 400;
      throw error;
    }

    // Extract IDs and use generateFromTimeEntries
    const timeEntryIds = timeEntries.map(entry => entry.id);

    return this.generateFromTimeEntries(client_id, timeEntryIds, bill_data);
  }

  /**
   * Get all time entries for a bill
   * @param {number} bill_id - Bill ID
   * @returns {Array} Array of time entry objects
   */
  static getTimeEntries(bill_id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM time_entries
      WHERE bill_id = ?
      ORDER BY work_date ASC
    `).all(bill_id);
  }

  /**
   * Generate bill number
   * @param {string} bill_type - Type of bill ('invoice' or 'act')
   * @returns {string} Generated bill number (e.g., "INV-2024-001", "ACT-2024-001")
   */
  static generateBillNumber(bill_type = 'invoice') {
    const db = getDatabase();
    const year = new Date().getFullYear();
    const prefix = bill_type === 'act' ? 'ACT' : 'INV';

    // Get the count of bills of this type created this year
    const count = db.prepare(`
      SELECT COUNT(*) as count
      FROM bills
      WHERE bill_number LIKE ?
        AND strftime('%Y', issue_date) = ?
    `).get(`${prefix}-${year}-%`, year.toString());

    const nextNumber = (count.count + 1).toString().padStart(3, '0');
    return `${prefix}-${year}-${nextNumber}`;
  }

  /**
   * Alias for findAll() - Get all bills
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of bill objects
   */
  static getAll(filters = {}) {
    return this.findAll(filters);
  }

  /**
   * Alias for findById() - Get bill by ID
   * @param {number} id - Bill ID
   * @returns {Object|null} Bill object or null if not found
   */
  static getById(id) {
    return this.findById(id);
  }
}

module.exports = Bill;
