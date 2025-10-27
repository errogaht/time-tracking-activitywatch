const { getDatabase } = require('../config/database');

class Client {
  /**
   * Get all clients
   * @param {boolean} activeOnly - Filter for active clients only
   * @returns {Array} Array of client objects
   */
  static getAll(activeOnly = false) {
    const db = getDatabase();
    const query = activeOnly
      ? 'SELECT * FROM clients WHERE is_active = 1 ORDER BY name'
      : 'SELECT * FROM clients ORDER BY name';
    return db.prepare(query).all();
  }

  /**
   * Get client by ID
   * @param {number} id - Client ID
   * @returns {Object|null} Client object or null if not found
   */
  static getById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  }

  /**
   * Get client by name
   * @param {string} name - Client name
   * @returns {Object|null} Client object or null if not found
   */
  static getByName(name) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM clients WHERE name = ?').get(name);
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @returns {Object} Created client object
   */
  static create(clientData) {
    const db = getDatabase();
    const {
      name,
      hourly_rate,
      contact_info = null,
      activitywatch_category = null,
      is_active = 1,
      notes = null
    } = clientData;

    const stmt = db.prepare(`
      INSERT INTO clients (name, hourly_rate, contact_info, activitywatch_category, is_active, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, hourly_rate, contact_info, activitywatch_category, is_active, notes);
    return this.getById(result.lastInsertRowid);
  }

  /**
   * Update client
   * @param {number} id - Client ID
   * @param {Object} clientData - Updated client data
   * @returns {Object|null} Updated client object or null if not found
   */
  static update(id, clientData) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    // Build dynamic update query based on provided fields
    if (clientData.name !== undefined) {
      fields.push('name = ?');
      values.push(clientData.name);
    }
    if (clientData.hourly_rate !== undefined) {
      fields.push('hourly_rate = ?');
      values.push(clientData.hourly_rate);
    }
    if (clientData.contact_info !== undefined) {
      fields.push('contact_info = ?');
      values.push(clientData.contact_info);
    }
    if (clientData.activitywatch_category !== undefined) {
      fields.push('activitywatch_category = ?');
      values.push(clientData.activitywatch_category);
    }
    if (clientData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(clientData.is_active);
    }
    if (clientData.notes !== undefined) {
      fields.push('notes = ?');
      values.push(clientData.notes);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  }

  /**
   * Delete client (soft delete - set is_active to false)
   * @param {number} id - Client ID
   * @param {boolean} hard - If true, performs hard delete
   * @returns {boolean} True if deleted, false otherwise
   */
  static delete(id, hard = false) {
    const db = getDatabase();

    if (hard) {
      const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } else {
      const stmt = db.prepare('UPDATE clients SET is_active = 0 WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    }
  }

  // Alias methods for API consistency
  /**
   * Alias for getAll() - Get all clients
   * @param {boolean} activeOnly - Filter for active clients only
   * @returns {Array} Array of client objects
   */
  static findAll(activeOnly = false) {
    return this.getAll(activeOnly);
  }

  /**
   * Alias for getById() - Get client by ID
   * @param {number} id - Client ID
   * @returns {Object|null} Client object or null if not found
   */
  static findById(id) {
    return this.getById(id);
  }

  /**
   * Get only active clients
   * @returns {Array} Array of active client objects
   */
  static findActive() {
    return this.getAll(true);
  }
}

module.exports = Client;
