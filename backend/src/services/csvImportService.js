const fs = require('fs');
const { getDatabase } = require('../config/database');
const TimeEntry = require('../models/TimeEntry');
const Payment = require('../models/Payment');

class CsvImportService {
  /**
   * Parse CSV file and return structured data
   * @param {string} filePath - Path to CSV file
   * @returns {Object} Parsed data with timeEntries and payments arrays
   */
  static parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    const timeEntries = [];
    const payments = [];

    let currentMonth = 6; // Start with June
    let currentYear = 2024;

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(',');

      // Extract column values
      const dateStr = columns[0] ? columns[0].trim() : '';
      const hoursStr = columns[2] ? columns[2].trim() : '';
      const minutesStr = columns[3] ? columns[3].trim() : '';
      const paymentStr = columns[4] ? columns[4].trim() : '';
      const noteStr = columns[5] ? columns[5].trim() : '';

      // Skip empty rows and totals rows
      if (!dateStr || dateStr.toLowerCase() === 'всего' || dateStr.toLowerCase() === 'ставка') {
        continue;
      }

      // Check if this is a month header (e.g., "июнь")
      const monthNames = {
        'июнь': 6,
        'июль': 7,
        'август': 8,
        'сентябрь': 9,
        'октябрь': 10,
        'ноябрь': 11
      };

      const lowerDateStr = dateStr.toLowerCase();
      if (monthNames[lowerDateStr]) {
        currentMonth = monthNames[lowerDateStr];

        // Check if month row has hours (like "июнь,,24")
        // These are additional hours that should be added as an entry for the first day of that month
        const hours = hoursStr && !isNaN(parseInt(hoursStr, 10)) ? parseInt(hoursStr, 10) : 0;
        const minutes = minutesStr && !isNaN(parseInt(minutesStr, 10)) ? parseInt(minutesStr, 10) : 0;

        if (hours > 0 || minutes > 0) {
          // Add time entry for first day of this month
          const workDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
          timeEntries.push({
            date: workDate,
            hours: hours,
            minutes: minutes
          });
        }

        continue;
      }

      // Skip special rows like "эво" (these are handled as payments below)
      if (dateStr.toLowerCase() === 'эво') {
        // This is an initial payment row
        if (paymentStr && !isNaN(parseFloat(paymentStr))) {
          payments.push({
            date: '2024-06-01', // Assign to start of June
            amount: parseFloat(paymentStr),
            type: 'money',
            description: 'Initial payment (эво)'
          });
        }
        continue;
      }

      // Parse date (format: DD.MM)
      const dateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})$/);
      if (!dateMatch) {
        continue; // Skip if date format doesn't match
      }

      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);

      // Update current month and year context
      if (month < currentMonth) {
        // Month rolled over to next year (though in this data it doesn't)
        currentMonth = month;
      } else {
        currentMonth = month;
      }

      // Format date as YYYY-MM-DD
      const workDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Parse hours and minutes
      const hours = hoursStr && !isNaN(parseInt(hoursStr, 10)) ? parseInt(hoursStr, 10) : 0;
      const minutes = minutesStr && !isNaN(parseInt(minutesStr, 10)) ? parseInt(minutesStr, 10) : 0;

      // Add time entry if there are hours or minutes
      if (hours > 0 || minutes > 0) {
        timeEntries.push({
          date: workDate,
          hours: hours,
          minutes: minutes
        });
      }

      // Parse payment
      if (paymentStr && !isNaN(parseFloat(paymentStr))) {
        const amount = parseFloat(paymentStr);
        let paymentType = 'money';
        let description = null;

        // Check notes for supplement indicators
        if (noteStr) {
          if (noteStr.toLowerCase().includes('преп') ||
              noteStr.toLowerCase().includes('nad+')) {
            paymentType = 'supplements';
            description = noteStr;
          }
        }

        payments.push({
          date: workDate,
          amount: amount,
          type: paymentType,
          description: description
        });
      }
    }

    return {
      timeEntries,
      payments
    };
  }

  /**
   * Import data for a client
   * @param {number} clientId - Client ID
   * @param {string} filePath - Path to CSV file
   * @returns {Object} Import summary with counts and totals
   */
  static importData(clientId, filePath) {
    const db = getDatabase();

    // Parse the CSV
    const { timeEntries, payments } = this.parseCSV(filePath);

    let timeEntriesImported = 0;
    let paymentsImported = 0;
    let totalMinutes = 0;
    let totalPaymentAmount = 0;

    // Use a transaction for data integrity
    const importTransaction = db.transaction(() => {
      // Import time entries
      for (const entry of timeEntries) {
        try {
          TimeEntry.create({
            client_id: clientId,
            work_date: entry.date,
            hours: entry.hours,
            minutes: entry.minutes,
            source: 'import',
            notes: 'Imported from CSV'
          });
          timeEntriesImported++;
          totalMinutes += (entry.hours * 60) + entry.minutes;
        } catch (error) {
          console.error(`Error importing time entry for ${entry.date}:`, error.message);
        }
      }

      // Import payments
      for (const payment of payments) {
        try {
          Payment.create({
            client_id: clientId,
            payment_date: payment.date,
            payment_type: payment.type,
            amount: payment.amount,
            supplements_description: payment.type === 'supplements' ? payment.description : null,
            notes: payment.description && payment.type !== 'supplements' ? payment.description : null
          });
          paymentsImported++;
          totalPaymentAmount += payment.amount;
        } catch (error) {
          console.error(`Error importing payment for ${payment.date}:`, error.message);
        }
      }
    });

    // Execute the transaction
    importTransaction();

    // Calculate summary
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return {
      timeEntriesImported,
      paymentsImported,
      totalTime: {
        hours: totalHours,
        minutes: remainingMinutes,
        formatted: `${totalHours}h ${remainingMinutes}m`
      },
      totalPayments: totalPaymentAmount,
      parsedData: {
        timeEntriesCount: timeEntries.length,
        paymentsCount: payments.length
      }
    };
  }
}

module.exports = CsvImportService;
