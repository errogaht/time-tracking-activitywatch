const axios = require('axios');
const os = require('os');
const TimeEntry = require('../models/TimeEntry');

/**
 * ActivityWatch Service
 * Handles integration with ActivityWatch time tracking application
 * ActivityWatch API Documentation: https://docs.activitywatch.net/en/latest/api.html
 */

class ActivityWatchService {
  constructor() {
    this.baseUrl = process.env.ACTIVITYWATCH_URL || 'http://127.0.0.1:5600';
    this.hostname = os.hostname();
    this.bucketsCache = null;
    this.cacheTime = null;
    this.cacheTimeout = 60000; // Cache buckets for 60 seconds

    // Create axios instance with proper configuration to avoid socket hang up
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      // Disable keep-alive to prevent socket hang up issues
      httpAgent: new (require('http').Agent)({ keepAlive: false }),
      headers: {
        'Connection': 'close'
      }
    });
  }

  /**
   * Get list of available ActivityWatch buckets (with caching)
   * @returns {Promise<Array>} Array of bucket objects
   */
  async getAvailableBuckets() {
    try {
      // Return cached buckets if still valid
      if (this.bucketsCache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheTimeout)) {
        return this.bucketsCache;
      }

      const response = await this.axiosInstance.get('/api/0/buckets');

      // Update cache
      this.bucketsCache = response.data;
      this.cacheTime = Date.now();

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to get ActivityWatch buckets');
    }
  }

  /**
   * Get the window watcher bucket for current hostname
   * @returns {Promise<string|null>} Bucket ID or null if not found
   */
  async getWindowBucket() {
    const buckets = await this.getAvailableBuckets();
    const bucketKey = `aw-watcher-window_${this.hostname}`;

    if (buckets && buckets[bucketKey]) {
      return bucketKey;
    }

    // Try to find any window watcher bucket
    const windowBuckets = Object.keys(buckets).filter(key => key.startsWith('aw-watcher-window'));
    return windowBuckets.length > 0 ? windowBuckets[0] : null;
  }

  /**
   * Get the AFK watcher bucket for current hostname
   * @returns {Promise<string|null>} Bucket ID or null if not found
   */
  async getAfkBucket() {
    const buckets = await this.getAvailableBuckets();
    const bucketKey = `aw-watcher-afk_${this.hostname}`;

    if (buckets && buckets[bucketKey]) {
      return bucketKey;
    }

    // Try to find any AFK watcher bucket
    const afkBuckets = Object.keys(buckets).filter(key => key.startsWith('aw-watcher-afk'));
    return afkBuckets.length > 0 ? afkBuckets[0] : null;
  }

  /**
   * Get regex pattern for a category from ActivityWatch settings
   * @param {string} categoryName - Category name (e.g., "ExampleClient")
   * @returns {Promise<RegExp>} Regex pattern for filtering events
   */
  async getCategoryRegex(categoryName) {
    try {
      const response = await this.axiosInstance.get('/api/0/settings');
      const settings = response.data;

      // Find category by name
      const categoryClass = settings.classes?.find(cls =>
        cls.name && cls.name.includes(categoryName)
      );

      if (categoryClass && categoryClass.rule && categoryClass.rule.type === 'regex') {
        const regexPattern = categoryClass.rule.regex;
        const ignoreCase = categoryClass.rule.ignore_case !== false; // default true
        return new RegExp(regexPattern, ignoreCase ? 'i' : '');
      }

      // Fallback: create simple case-insensitive regex from category name
      // Normalize: remove hyphens, underscores, spaces and make flexible
      const normalized = categoryName.toLowerCase().replace(/[-_\s]/g, '');
      return new RegExp(normalized, 'i');
    } catch (error) {
      // Fallback on error: use simple case-insensitive regex
      console.warn(`Failed to get category regex for "${categoryName}", using fallback:`, error.message);
      const normalized = categoryName.toLowerCase().replace(/[-_\s]/g, '');
      return new RegExp(normalized, 'i');
    }
  }

  /**
   * Get list of available categories from window watcher events
   * Note: This returns both app names and title patterns that can be used for filtering
   * @returns {Promise<Object>} Object with apps and categories arrays
   */
  async getCategories() {
    try {
      const windowBucket = await this.getWindowBucket();
      if (!windowBucket) {
        throw new Error('No window watcher bucket found');
      }

      // Query to get recent events to extract apps and categories
      // Use last 7 days to get a good sample without overwhelming the query
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const timeperiod = `${startDate.toISOString()}/${new Date().toISOString()}`;

      const response = await this.axiosInstance.post(
        '/api/0/query',
        {
          timeperiods: [timeperiod],
          query: [
            `events = query_bucket("${windowBucket}");`,
            `RETURN = events;`
          ]
        }
      );

      if (response.data && response.data.length > 0) {
        const events = response.data[0];
        const apps = new Set();
        const categories = new Set();

        // Extract unique apps and categories
        events.forEach(event => {
          if (event.data) {
            if (event.data.app) {
              apps.add(event.data.app);
            }
            if (event.data.category && Array.isArray(event.data.category)) {
              event.data.category.forEach(cat => categories.add(cat));
            }
          }
        });

        return {
          apps: Array.from(apps).sort(),
          categories: Array.from(categories).sort(),
          note: "Categories may be empty if not configured in ActivityWatch. Use app names or title patterns for filtering."
        };
      }

      return {
        apps: [],
        categories: [],
        note: "No data found"
      };
    } catch (error) {
      this._handleError(error, 'Failed to get categories');
    }
  }

  /**
   * Get window events for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of window events
   */
  async getWindowEvents(date) {
    try {
      const windowBucket = await this.getWindowBucket();
      if (!windowBucket) {
        throw new Error('No window watcher bucket found');
      }

      // Build time range: day starts at 4am Moscow time (+03:00)
      const [year, month, day] = date.split('-');
      const startTime = `${year}-${month}-${day}T04:00:00+03:00`;

      // Next day at 4am
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextYear = nextDate.getFullYear();
      const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextDay = String(nextDate.getDate()).padStart(2, '0');
      const endTime = `${nextYear}-${nextMonth}-${nextDay}T04:00:00+03:00`;

      const response = await this.axiosInstance.get(
        `/api/0/buckets/${windowBucket}/events`,
        {
          params: {
            start: startTime,
            end: endTime,
            limit: -1
          }
        }
      );

      return response.data || [];
    } catch (error) {
      this._handleError(error, 'Failed to get window events');
    }
  }

  /**
   * Get AFK events for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of AFK events
   */
  async getAfkEvents(date) {
    try {
      const afkBucket = await this.getAfkBucket();
      if (!afkBucket) {
        throw new Error('No AFK watcher bucket found');
      }

      // Build time range: day starts at 4am Moscow time (+03:00)
      const [year, month, day] = date.split('-');
      const startTime = `${year}-${month}-${day}T04:00:00+03:00`;

      // Next day at 4am
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextYear = nextDate.getFullYear();
      const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextDay = String(nextDate.getDate()).padStart(2, '0');
      const endTime = `${nextYear}-${nextMonth}-${nextDay}T04:00:00+03:00`;

      const response = await this.axiosInstance.get(
        `/api/0/buckets/${afkBucket}/events`,
        {
          params: {
            start: startTime,
            end: endTime,
            limit: -1
          }
        }
      );

      return response.data || [];
    } catch (error) {
      this._handleError(error, 'Failed to get AFK events');
    }
  }

  /**
   * Subtract AFK time from window events
   * @param {Array} windowEvents - Array of window events
   * @param {Array} afkEvents - Array of AFK events
   * @returns {number} Total active duration in seconds
   */
  subtractAfkTime(windowEvents, afkEvents) {
    let totalActiveDuration = 0;

    // Filter only AFK periods (status: "afk")
    const afkPeriods = afkEvents.filter(event =>
      event.data && event.data.status === 'afk'
    );

    for (const windowEvent of windowEvents) {
      const eventStart = new Date(windowEvent.timestamp).getTime();
      const eventEnd = eventStart + (windowEvent.duration * 1000);
      let activeDuration = windowEvent.duration;

      // Check for overlaps with AFK periods
      for (const afkEvent of afkPeriods) {
        const afkStart = new Date(afkEvent.timestamp).getTime();
        const afkEnd = afkStart + (afkEvent.duration * 1000);

        // Calculate intersection
        const intersectionStart = Math.max(eventStart, afkStart);
        const intersectionEnd = Math.min(eventEnd, afkEnd);

        if (intersectionStart < intersectionEnd) {
          // There is an overlap
          const overlapDuration = (intersectionEnd - intersectionStart) / 1000;
          activeDuration -= overlapDuration;
        }
      }

      // Add the active duration (can't be negative)
      totalActiveDuration += Math.max(0, activeDuration);
    }

    return Math.round(totalActiveDuration);
  }

  /**
   * Get time spent on a specific category for a given date
   * @param {string} category - Category name, app name, or title pattern (e.g., "ExampleClient", "phpstorm", "exampleclient")
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {boolean} exclude_afk - Whether to exclude AFK time (default: false)
   * @returns {Promise<Object>} Object with hours, minutes, total_seconds, category, exclude_afk
   */
  async getTimeByCategory(category, date, exclude_afk = false) {
    try {
      // Get window events
      const windowEvents = await this.getWindowEvents(date);

      // Get category regex from ActivityWatch settings
      const categoryRegex = await this.getCategoryRegex(category);

      // Filter events by category using regex pattern
      const filteredEvents = windowEvents.filter(event => {
        if (!event.data) return false;

        // Check app field
        if (event.data.app && categoryRegex.test(event.data.app)) {
          return true;
        }

        // Check title field
        if (event.data.title && categoryRegex.test(event.data.title)) {
          return true;
        }

        // Check category field (if exists and is array)
        if (event.data.category && Array.isArray(event.data.category)) {
          return event.data.category.some(cat => categoryRegex.test(cat));
        }

        return false;
      });

      let totalSeconds = 0;

      if (exclude_afk) {
        // Get AFK events and subtract overlapping periods
        const afkEvents = await this.getAfkEvents(date);
        totalSeconds = this.subtractAfkTime(filteredEvents, afkEvents);
      } else {
        // Just sum up all durations
        totalSeconds = filteredEvents.reduce((sum, event) => sum + event.duration, 0);
        totalSeconds = Math.round(totalSeconds);
      }

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return {
        hours,
        minutes,
        total_seconds: totalSeconds,
        category,
        exclude_afk
      };
    } catch (error) {
      this._handleError(error, `Failed to get time for category "${category}"`);
    }
  }

  /**
   * Import time entry from ActivityWatch directly into the database
   * @param {number} client_id - Client ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} category - Category name
   * @param {boolean} exclude_afk - Whether AFK time was excluded
   * @returns {Promise<Object>} Created TimeEntry object
   */
  async importTimeEntry(client_id, date, category, exclude_afk = false) {
    try {
      // Get time data from ActivityWatch
      const timeData = await this.getTimeByCategory(category, date, exclude_afk);

      // Create time entry
      const entryData = {
        client_id: Number(client_id),
        work_date: date,
        hours: timeData.hours,
        minutes: timeData.minutes,
        source: 'activitywatch',
        activitywatch_exclude_afk: exclude_afk,
        is_billed: false,
        bill_id: null,
        notes: `Imported from ActivityWatch - Category: ${category}`
      };

      const newEntry = TimeEntry.create(entryData);

      return {
        success: true,
        timeEntry: newEntry,
        activityWatchData: timeData
      };
    } catch (error) {
      this._handleError(error, 'Failed to import time entry from ActivityWatch');
    }
  }

  /**
   * Check if ActivityWatch is running and accessible
   * @returns {Promise<Object>} Status object with running flag and message
   */
  async checkStatus() {
    try {
      const response = await this.axiosInstance.get('/api/0/buckets');

      return {
        running: true,
        message: 'ActivityWatch is running and accessible',
        buckets: Object.keys(response.data).length,
        url: this.baseUrl
      };
    } catch (error) {
      return {
        running: false,
        message: error.code === 'ECONNREFUSED'
          ? 'ActivityWatch is not running or not accessible'
          : `Error connecting to ActivityWatch: ${error.message}`,
        url: this.baseUrl,
        error: error.message
      };
    }
  }

  /**
   * Handle errors consistently
   * @private
   */
  _handleError(error, message) {
    if (error.code === 'ECONNREFUSED') {
      const err = new Error(`ActivityWatch is not running. Please start ActivityWatch at ${this.baseUrl}`);
      err.statusCode = 503;
      err.name = 'ServiceUnavailable';
      throw err;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      const err = new Error('ActivityWatch request timed out. The service might be overloaded.');
      err.statusCode = 504;
      err.name = 'GatewayTimeout';
      throw err;
    } else if (error.response) {
      // ActivityWatch API returned an error
      const err = new Error(`${message}: ${error.response.data?.message || error.message}`);
      err.statusCode = error.response.status;
      throw err;
    } else {
      // Other errors
      const err = new Error(`${message}: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }
  }
}

module.exports = ActivityWatchService;
