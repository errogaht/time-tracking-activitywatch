#!/usr/bin/env node

const { getDatabase, closeDatabase } = require('../config/database');

const db = getDatabase();

console.log('========================================');
console.log('Imported Data Summary (source = import)');
console.log('========================================\n');

// Check imported time entries
const importedEntries = db.prepare(`
  SELECT COUNT(*) as count, SUM(total_minutes) as total_minutes
  FROM time_entries
  WHERE client_id = 1 AND source = 'import'
`).get();

console.log('Time Entries (Imported):');
console.log(`  Total Entries: ${importedEntries.count}`);
console.log(`  Total Minutes: ${importedEntries.total_minutes}`);
console.log(`  Total Hours: ${Math.floor(importedEntries.total_minutes / 60)}h ${importedEntries.total_minutes % 60}m\n`);

// Check date range of imported entries
const dateRange = db.prepare(`
  SELECT MIN(work_date) as first_date, MAX(work_date) as last_date
  FROM time_entries
  WHERE client_id = 1 AND source = 'import'
`).get();

console.log(`  Date Range: ${dateRange.first_date} to ${dateRange.last_date}\n`);

// Check all payments (imported are from 2024)
const payments2024 = db.prepare(`
  SELECT COUNT(*) as count, SUM(amount) as total
  FROM payments
  WHERE client_id = 1 AND strftime('%Y', payment_date) = '2024'
`).get();

console.log('Payments (2024 - Imported):');
console.log(`  Total Payments: ${payments2024.count}`);
console.log(`  Total Amount: ${payments2024.total} RUB\n`);

// Break down by type
const paymentsByType = db.prepare(`
  SELECT payment_type, COUNT(*) as count, SUM(amount) as total
  FROM payments
  WHERE client_id = 1 AND strftime('%Y', payment_date) = '2024'
  GROUP BY payment_type
`).all();

console.log('  Breakdown by Type:');
paymentsByType.forEach(p => {
  console.log(`    ${p.payment_type}: ${p.count} payments, ${p.total} RUB`);
});

// Show supplement details from 2024
const supplements2024 = db.prepare(`
  SELECT payment_date, amount, supplements_description, notes
  FROM payments
  WHERE client_id = 1 AND payment_type = 'supplements' AND strftime('%Y', payment_date) = '2024'
  ORDER BY payment_date
`).all();

if (supplements2024.length > 0) {
  console.log('\n  Supplement Details:');
  supplements2024.forEach(s => {
    console.log(`    ${s.payment_date}: ${s.amount} RUB - ${s.supplements_description || s.notes || 'N/A'}`);
  });
}

console.log('\n========================================');
console.log('Balance Calculation (Imported Data)');
console.log('========================================');

const totalHours = importedEntries.total_minutes / 60;
const earned = totalHours * 1800;
console.log(`Hours Worked: ${totalHours.toFixed(4)} (${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m)`);
console.log(`Earned (@ 1800 RUB/hr): ${earned.toFixed(2)} RUB`);
console.log(`Total Paid: ${payments2024.total} RUB`);
console.log(`Balance: ${(payments2024.total - earned).toFixed(2)} RUB`);

if (payments2024.total > earned) {
  console.log(`  (Client paid ${(payments2024.total - earned).toFixed(2)} RUB in advance)`);
} else {
  console.log(`  (Client owes ${(earned - payments2024.total).toFixed(2)} RUB)`);
}

console.log('\n========================================');
console.log('Expected Values from Excel');
console.log('========================================');
console.log('Total Time: 167h 48min (= 10,068 minutes)');
console.log('Work Value: 387,450 RUB');
console.log('Total Paid: 421,100 RUB');
console.log('Balance: 33,650 RUB (advance payment)');
console.log('========================================\n');

// Show discrepancy analysis
console.log('Discrepancy Analysis:');
const expectedMinutes = 167 * 60 + 48;
const minuteDiff = importedEntries.total_minutes - expectedMinutes;
console.log(`  Time difference: ${minuteDiff} minutes (${(minuteDiff / 60).toFixed(2)} hours)`);

const expectedEarned = 387450;
const earnedDiff = earned - expectedEarned;
console.log(`  Earned difference: ${earnedDiff.toFixed(2)} RUB`);

const expectedPaid = 421100;
const paidDiff = payments2024.total - expectedPaid;
console.log(`  Paid difference: ${paidDiff.toFixed(2)} RUB`);

const expectedBalance = 33650;
const balanceDiff = (payments2024.total - earned) - expectedBalance;
console.log(`  Balance difference: ${balanceDiff.toFixed(2)} RUB\n`);

closeDatabase();
