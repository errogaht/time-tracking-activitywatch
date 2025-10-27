const { getDatabase } = require('../config/database');

class TimeEntry {
  /**
   * Get all time entries with optional filters
   * @param {Object} filters - Optional filters { client_id, work_date, is_billed }
   * @returns {Array} Array of time entry objects
   */
  static findAll(filters = {}) {
    const db = getDatabase();
    const conditions = [];
    const values = [];

    if (filters.client_id !== undefined) {
      conditions.push('client_id = ?');
      values.push(filters.client_id);
    }

    if (filters.work_date !== undefined) {
      conditions.push('work_date = ?');
      values.push(filters.work_date);
    }

    if (filters.is_billed !== undefined) {
      conditions.push('is_billed = ?');
      values.push(filters.is_billed ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM time_entries ${whereClause} ORDER BY work_date DESC, id DESC`;

    return db.prepare(query).all(...values);
  }

  /**
   * Get time entry by ID
   * @param {number} id - Time entry ID
   * @returns {Object|null} Time entry object or null if not found
   */
  static findById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  }

  /**
   * Create a new time entry
   * @param {Object} data - Time entry data
   * @returns {Object} Created time entry object
   */
  static create(data) {
    const db = getDatabase();
    const {
      client_id,
      work_date,
      hours = 0,
      minutes = 0,
      source = 'manual',
      activitywatch_exclude_afk = 0,
      is_billed = 0,
      bill_id = null,
      notes = null
    } = data;

    // Validate that client exists
    const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
    if (!clientExists) {
      const error = new Error(`Client with ID ${client_id} does not exist`);
      error.statusCode = 400;
      throw error;
    }

    const stmt = db.prepare(`
      INSERT INTO time_entries (
        client_id, work_date, hours, minutes, source,
        activitywatch_exclude_afk, is_billed, bill_id, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      client_id, work_date, hours, minutes, source,
      activitywatch_exclude_afk ? 1 : 0,
      is_billed ? 1 : 0,
      bill_id,
      notes
    );

    return this.findById(result.lastInsertRowid);
  }

  /**
   * Update time entry
   * @param {number} id - Time entry ID
   * @param {Object} data - Updated time entry data
   * @returns {Object|null} Updated time entry object or null if not found
   */
  static update(id, data) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    // Build dynamic update query based on provided fields
    if (data.client_id !== undefined) {
      // Validate that client exists
      const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(data.client_id);
      if (!clientExists) {
        const error = new Error(`Client with ID ${data.client_id} does not exist`);
        error.statusCode = 400;
        throw error;
      }
      fields.push('client_id = ?');
      values.push(data.client_id);
    }

    if (data.work_date !== undefined) {
      fields.push('work_date = ?');
      values.push(data.work_date);
    }

    if (data.hours !== undefined) {
      fields.push('hours = ?');
      values.push(data.hours);
    }

    if (data.minutes !== undefined) {
      fields.push('minutes = ?');
      values.push(data.minutes);
    }

    if (data.source !== undefined) {
      fields.push('source = ?');
      values.push(data.source);
    }

    if (data.activitywatch_exclude_afk !== undefined) {
      fields.push('activitywatch_exclude_afk = ?');
      values.push(data.activitywatch_exclude_afk ? 1 : 0);
    }

    if (data.is_billed !== undefined) {
      fields.push('is_billed = ?');
      values.push(data.is_billed ? 1 : 0);
    }

    if (data.bill_id !== undefined) {
      fields.push('bill_id = ?');
      values.push(data.bill_id);
    }

    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE time_entries SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete time entry
   * @param {number} id - Time entry ID
   * @returns {boolean} True if deleted, false otherwise
   */
  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM time_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get unbilled time entries for a client
   * @param {number} client_id - Client ID (optional, if not provided returns all unbilled entries)
   * @returns {Array} Array of unbilled time entry objects
   */
  static findUnbilled(client_id = null) {
    const db = getDatabase();
    let query = 'SELECT * FROM time_entries WHERE is_billed = 0';
    const params = [];

    if (client_id !== null) {
      query += ' AND client_id = ?';
      params.push(client_id);
    }

    query += ' ORDER BY work_date DESC, id DESC';

    return db.prepare(query).all(...params);
  }

  /**
   * Get total hours and minutes for a client
   * @param {number} client_id - Client ID
   * @returns {Object} Object with total_hours, total_minutes, and total_entries
   */
  static getTotalsByClient(client_id) {
    const db = getDatabase();

    const result = db.prepare(`
      SELECT
        COUNT(*) as total_entries,
        COALESCE(SUM(total_minutes), 0) as total_minutes_sum
      FROM time_entries
      WHERE client_id = ?
    `).get(client_id);

    const totalMinutes = result.total_minutes_sum || 0;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return {
      client_id,
      total_entries: result.total_entries || 0,
      total_minutes: totalMinutes,
      total_hours: totalHours,
      remaining_minutes: remainingMinutes,
      formatted_time: `${totalHours}h ${remainingMinutes}m`
    };
  }

  /**
   * Get all time entries (alias for findAll)
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of time entry objects
   */
  static getAll(filters = {}) {
    return this.findAll(filters);
  }

  /**
   * Get time entry by ID (alias for findById)
   * @param {number} id - Time entry ID
   * @returns {Object|null} Time entry object or null if not found
   */
  static getById(id) {
    return this.findById(id);
  }
}

module.exports = TimeEntry;
