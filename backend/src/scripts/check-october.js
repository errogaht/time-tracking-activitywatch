#!/usr/bin/env node

const { getDatabase, closeDatabase } = require('../config/database');

const db = getDatabase();

console.log('========================================');
console.log('October 2024 Data Check');
console.log('========================================\n');

// Check October time entries
const octoberEntries = db.prepare(`
  SELECT work_date, hours, minutes, total_minutes
  FROM time_entries
  WHERE client_id = 1 AND work_date LIKE '2024-10%'
  ORDER BY work_date
`).all();

console.log('Time Entries in October 2024:');
if (octoberEntries.length === 0) {
  console.log('  No entries found');
} else {
  octoberEntries.forEach(e => {
    console.log(`  ${e.work_date}: ${e.hours}h ${e.minutes}m (${e.total_minutes} min)`);
  });
}

const octoberTotal = db.prepare(`
  SELECT COUNT(*) as count, SUM(total_minutes) as total_minutes
  FROM time_entries
  WHERE client_id = 1 AND work_date LIKE '2024-10%'
`).get();

console.log(`\nTotal: ${octoberTotal.count} entries, ${octoberTotal.total_minutes || 0} minutes\n`);

// Check October payments
const octoberPayments = db.prepare(`
  SELECT payment_date, amount, payment_type, supplements_description, notes
  FROM payments
  WHERE client_id = 1 AND payment_date LIKE '2024-10%'
  ORDER BY payment_date
`).all();

console.log('Payments in October 2024:');
if (octoberPayments.length === 0) {
  console.log('  No payments found');
} else {
  octoberPayments.forEach(p => {
    console.log(`  ${p.payment_date}: ${p.amount} RUB (${p.payment_type})`);
  });
}

console.log('\n========================================');
console.log('Expected from CSV:');
console.log('========================================');
console.log('01.10: 0h 12m');
console.log('02.10-05.10: 0h 0m (multiple entries)');
console.log('07.10: Payment of 135,582 RUB');
console.log('========================================\n');

closeDatabase();
