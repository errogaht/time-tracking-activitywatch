#!/usr/bin/env node

const { getDatabase, closeDatabase } = require('../config/database');

const db = getDatabase();

console.log('========================================');
console.log('Time Entries Summary');
console.log('========================================');

const timeEntries = db.prepare('SELECT COUNT(*) as count, SUM(total_minutes) as total_minutes FROM time_entries WHERE client_id = 1').get();
console.log(`Total Entries: ${timeEntries.count}`);
console.log(`Total Minutes: ${timeEntries.total_minutes}`);
console.log(`Total Hours: ${Math.floor(timeEntries.total_minutes / 60)}h ${timeEntries.total_minutes % 60}m\n`);

console.log('========================================');
console.log('Payments Summary');
console.log('========================================');

const payments = db.prepare(`
  SELECT payment_type, COUNT(*) as count, SUM(amount) as total
  FROM payments
  WHERE client_id = 1
  GROUP BY payment_type
`).all();

payments.forEach(p => {
  console.log(`${p.payment_type}: ${p.count} payments, Total: ${p.total} RUB`);
});

const totalPayments = db.prepare('SELECT SUM(amount) as total FROM payments WHERE client_id = 1').get();
console.log(`\nTotal Payments: ${totalPayments.total} RUB\n`);

console.log('========================================');
console.log('Supplement Payments Detail');
console.log('========================================');

const supplements = db.prepare(`
  SELECT id, payment_date, amount, supplements_description
  FROM payments
  WHERE client_id = 1 AND payment_type = 'supplements'
  ORDER BY payment_date
`).all();

supplements.forEach(s => {
  console.log(`${s.payment_date}: ${s.amount} RUB - ${s.supplements_description || 'N/A'}`);
});

console.log('\n========================================');
console.log('Balance Calculation');
console.log('========================================');

const totalHours = timeEntries.total_minutes / 60;
const earned = totalHours * 1800;
console.log(`Hours Worked: ${totalHours.toFixed(2)}`);
console.log(`Earned (@ 1800 RUB/hr): ${earned.toFixed(2)} RUB`);
console.log(`Total Paid: ${totalPayments.total} RUB`);
console.log(`Balance: ${(totalPayments.total - earned).toFixed(2)} RUB`);

if (totalPayments.total > earned) {
  console.log(`(Client paid ${(totalPayments.total - earned).toFixed(2)} RUB in advance)`);
} else {
  console.log(`(Client owes ${(earned - totalPayments.total).toFixed(2)} RUB)`);
}

closeDatabase();
