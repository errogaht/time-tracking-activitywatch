const Bill = require('../models/Bill');
const Client = require('../models/Client');

/**
 * Get all bills with optional filters
 * Query params: client_id, status, bill_type
 */
const getAllBills = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.client_id) {
      filters.client_id = parseInt(req.query.client_id);
    }

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.bill_type) {
      filters.bill_type = req.query.bill_type;
    }

    const bills = Bill.findAll(filters);

    // Enrich bills with client information
    const enrichedBills = bills.map(bill => {
      const client = Client.findById(bill.client_id);
      return {
        ...bill,
        client_name: client ? client.name : null
      };
    });

    res.json({
      success: true,
      count: enrichedBills.length,
      data: enrichedBills
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bill by ID (includes time entries)
 */
const getBillById = async (req, res, next) => {
  try {
    const id = req.validatedId || parseInt(req.params.id);
    const bill = Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Bill with ID ${id} not found`
      });
    }

    // Enrich with client information
    const client = Client.findById(bill.client_id);
    bill.client = client;

    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create bill from selected time entry IDs
 * Body: { client_id, time_entry_ids: [], bill_type?, issue_date?, status?, notes? }
 */
const createBillFromEntries = async (req, res, next) => {
  try {
    const { client_id, time_entry_ids, bill_type, issue_date, status, notes } = req.body;

    const bill = Bill.generateFromTimeEntries(client_id, time_entry_ids, {
      bill_type,
      issue_date,
      status,
      notes
    });

    // Enrich with client information
    const client = Client.findById(bill.client_id);
    bill.client = client;

    res.status(201).json({
      success: true,
      message: 'Bill created successfully from time entries',
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create bill from date range
 * Body: { client_id, period_from, period_to, bill_type?, issue_date?, status?, notes? }
 */
const createBillFromDateRange = async (req, res, next) => {
  try {
    const { client_id, period_from, period_to, bill_type, issue_date, status, notes } = req.body;

    const bill = Bill.generateFromDateRange(client_id, period_from, period_to, {
      bill_type,
      issue_date,
      status,
      notes
    });

    // Enrich with client information
    const client = Client.findById(bill.client_id);
    bill.client = client;

    res.status(201).json({
      success: true,
      message: 'Bill created successfully from date range',
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update bill (status, notes, etc.)
 */
const updateBill = async (req, res, next) => {
  try {
    const id = req.validatedId || parseInt(req.params.id);
    const updateData = req.body;

    const bill = Bill.update(id, updateData);

    if (!bill) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Bill with ID ${id} not found`
      });
    }

    // Enrich with client information
    const client = Client.findById(bill.client_id);
    bill.client = client;

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete bill (and unmark time entries)
 */
const deleteBill = async (req, res, next) => {
  try {
    const id = req.validatedId || parseInt(req.params.id);

    // Check if bill exists
    const bill = Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Bill with ID ${id} not found`
      });
    }

    const deleted = Bill.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Bill deleted successfully and time entries unmarked'
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete bill'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get bill as HTML page for viewing/printing
 */
const getBillHTML = async (req, res, next) => {
  try {
    const id = req.validatedId || parseInt(req.params.id);
    const bill = Bill.findById(id);

    if (!bill) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bill Not Found</title>
        </head>
        <body>
          <h1>Bill Not Found</h1>
          <p>Bill with ID ${id} does not exist.</p>
        </body>
        </html>
      `);
    }

    const client = Client.findById(bill.client_id);

    // Calculate total time display
    const totalTimeInMinutes = bill.total_hours * 60 + bill.total_minutes;
    const displayHours = Math.floor(totalTimeInMinutes / 60);
    const displayMinutes = totalTimeInMinutes % 60;

    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Build time entries table
    let timeEntriesHTML = '';
    if (bill.time_entries && bill.time_entries.length > 0) {
      timeEntriesHTML = bill.time_entries.map(entry => {
        const entryMinutes = entry.total_minutes;
        const entryHours = Math.floor(entryMinutes / 60);
        const entryMins = entryMinutes % 60;
        const entryAmount = (entryMinutes / 60) * client.hourly_rate;

        return `
          <tr>
            <td>${formatDate(entry.work_date)}</td>
            <td>${entryHours}h ${entryMins}m</td>
            <td>${client.hourly_rate.toFixed(2)}</td>
            <td>${entryAmount.toFixed(2)}</td>
            <td>${entry.notes || ''}</td>
          </tr>
        `;
      }).join('');
    } else {
      timeEntriesHTML = '<tr><td colspan="5" style="text-align: center;">No time entries</td></tr>';
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bill.bill_type.toUpperCase()} ${bill.bill_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #f5f5f5;
    }

    .bill-container {
      background-color: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #333;
    }

    .header-left h1 {
      font-size: 32px;
      color: #333;
      margin-bottom: 10px;
    }

    .header-left .bill-number {
      font-size: 16px;
      color: #666;
    }

    .header-right {
      text-align: right;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 3px;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .status-draft {
      background-color: #ffeaa7;
      color: #856404;
    }

    .status-issued, .status-sent {
      background-color: #74b9ff;
      color: #004085;
    }

    .status-paid {
      background-color: #55efc4;
      color: #155724;
    }

    .status-cancelled {
      background-color: #ff7675;
      color: #721c24;
    }

    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }

    .info-block h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .info-block p {
      font-size: 16px;
      margin-bottom: 5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    thead {
      background-color: #f8f9fa;
    }

    th {
      text-align: left;
      padding: 12px;
      font-size: 14px;
      font-weight: bold;
      color: #333;
      border-bottom: 2px solid #dee2e6;
    }

    td {
      padding: 12px;
      font-size: 14px;
      border-bottom: 1px solid #dee2e6;
    }

    tbody tr:hover {
      background-color: #f8f9fa;
    }

    .totals {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #333;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 16px;
    }

    .total-row.grand-total {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      padding: 15px 0;
      border-top: 2px solid #333;
      margin-top: 10px;
    }

    .notes {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-left: 4px solid #333;
    }

    .notes h3 {
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .notes p {
      font-size: 14px;
      color: #666;
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }

      .bill-container {
        box-shadow: none;
        padding: 20px;
      }

      tbody tr:hover {
        background-color: transparent;
      }

      .no-print {
        display: none;
      }
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background-color: #333;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: background-color 0.3s;
    }

    .print-button:hover {
      background-color: #555;
    }

    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>

  <div class="bill-container">
    <div class="header">
      <div class="header-left">
        <h1>${bill.bill_type === 'act' ? 'Act' : 'Invoice'}</h1>
        <div class="bill-number">${bill.bill_number}</div>
      </div>
      <div class="header-right">
        <span class="status-badge status-${bill.status}">${bill.status}</span>
        <p><strong>Issue Date:</strong> ${formatDate(bill.issue_date)}</p>
      </div>
    </div>

    <div class="info-section">
      <div class="info-block">
        <h3>Bill To</h3>
        <p><strong>${client ? client.name : 'Unknown Client'}</strong></p>
        ${client && client.contact_info ? `<p>${client.contact_info}</p>` : ''}
      </div>
      <div class="info-block">
        <h3>Period</h3>
        <p><strong>From:</strong> ${formatDate(bill.period_from)}</p>
        <p><strong>To:</strong> ${formatDate(bill.period_to)}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Rate (per hour)</th>
          <th>Amount</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${timeEntriesHTML}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Total Time:</span>
        <span><strong>${displayHours}h ${displayMinutes}m</strong></span>
      </div>
      <div class="total-row">
        <span>Hourly Rate:</span>
        <span><strong>${client ? client.hourly_rate.toFixed(2) : '0.00'}</strong></span>
      </div>
      <div class="total-row grand-total">
        <span>Total Amount:</span>
        <span>${bill.total_amount.toFixed(2)}</span>
      </div>
    </div>

    ${bill.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${bill.notes}</p>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBills,
  getBillById,
  createBillFromEntries,
  createBillFromDateRange,
  updateBill,
  deleteBill,
  getBillHTML
};
