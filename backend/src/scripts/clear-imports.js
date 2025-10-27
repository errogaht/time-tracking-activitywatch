#!/usr/bin/env node

const { getDatabase, closeDatabase } = require('../config/database');

const db = getDatabase();

console.log('Clearing imported data (source = import, year = 2024)...\n');

const deleteEntries = db.prepare(`
  DELETE FROM time_entries
  WHERE client_id = 1 AND source = 'import'
`);

const deletePayments = db.prepare(`
  DELETE FROM payments
  WHERE client_id = 1 AND strftime('%Y', payment_date) = '2024'
`);

const entriesResult = deleteEntries.run();
const paymentsResult = deletePayments.run();

console.log(`Deleted ${entriesResult.changes} time entries`);
console.log(`Deleted ${paymentsResult.changes} payments`);
console.log('\nData cleared successfully!\n');

closeDatabase();
