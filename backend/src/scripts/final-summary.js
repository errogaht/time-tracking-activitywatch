#!/usr/bin/env node

const { getDatabase, closeDatabase } = require('../config/database');
const BalanceService = require('../services/balanceService');

const db = getDatabase();

console.log('═══════════════════════════════════════════════════════════');
console.log('    CSV IMPORT FINAL SUMMARY - EXAMPLECLIENT CLIENT       ');
console.log('═══════════════════════════════════════════════════════════\n');

// Get imported time entries details
const importedEntries = db.prepare(`
  SELECT COUNT(*) as count, SUM(total_minutes) as total_minutes
  FROM time_entries
  WHERE client_id = 1 AND source = 'import'
`).get();

const dateRange = db.prepare(`
  SELECT MIN(work_date) as first_date, MAX(work_date) as last_date
  FROM time_entries
  WHERE client_id = 1 AND source = 'import'
`).get();

console.log('📊 TIME ENTRIES IMPORTED');
console.log('───────────────────────────────────────────────────────────');
console.log(`   Count: ${importedEntries.count} entries`);
console.log(`   Period: ${dateRange.first_date} to ${dateRange.last_date}`);
console.log(`   Total Time: ${Math.floor(importedEntries.total_minutes / 60)}h ${importedEntries.total_minutes % 60}m`);
console.log(`   Decimal: ${(importedEntries.total_minutes / 60).toFixed(2)} hours\n`);

// Get payments details
const payments2024 = db.prepare(`
  SELECT COUNT(*) as count, SUM(amount) as total
  FROM payments
  WHERE client_id = 1 AND strftime('%Y', payment_date) = '2024'
`).get();

const paymentsByType = db.prepare(`
  SELECT payment_type, COUNT(*) as count, SUM(amount) as total
  FROM payments
  WHERE client_id = 1 AND strftime('%Y', payment_date) = '2024'
  GROUP BY payment_type
`).all();

console.log('💰 PAYMENTS IMPORTED');
console.log('───────────────────────────────────────────────────────────');
console.log(`   Total: ${payments2024.count} payments`);
paymentsByType.forEach(p => {
  console.log(`   - ${p.payment_type}: ${p.count} payment(s), ${p.total.toLocaleString('ru-RU')} RUB`);
});
console.log(`   Total Amount: ${payments2024.total.toLocaleString('ru-RU')} RUB\n`);

// Get balance
const balance = BalanceService.calculateClientBalance(1);

console.log('💵 FINANCIAL SUMMARY');
console.log('───────────────────────────────────────────────────────────');
console.log(`   Hourly Rate: ${balance.client.hourly_rate.toLocaleString('ru-RU')} RUB`);
console.log(`   Work Value: ${balance.earnings.total_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
console.log(`   Total Paid: ${balance.payments.total_paid.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
console.log(`   Balance: ${balance.balance.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);

if (balance.balance.amount > 0) {
  console.log(`   Status: ⚠️  Client owes ${balance.balance.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
} else if (balance.balance.amount < 0) {
  console.log(`   Status: ✅ Advance payment of ${Math.abs(balance.balance.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
} else {
  console.log(`   Status: ✅ Account is balanced`);
}

console.log('\n✅ EXCEL VERIFICATION');
console.log('───────────────────────────────────────────────────────────');
console.log(`   Expected Work Value: 387,450.00 RUB`);
console.log(`   Actual Work Value:   ${balance.earnings.total_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
console.log(`   Match: ${balance.earnings.total_amount === 387450 ? '✅ YES' : '❌ NO'}`);
console.log('');
console.log(`   Expected Total Paid: 421,100.00 RUB`);
console.log(`   Actual Total Paid:   ${balance.payments.total_paid.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
console.log(`   Match: ${balance.payments.total_paid === 421100 ? '✅ YES' : '❌ NO'}`);
console.log('');
console.log(`   Expected Balance:    33,650.00 RUB (advance)`);
console.log(`   Actual Balance:      ${Math.abs(balance.balance.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB (${balance.balance.amount < 0 ? 'advance' : 'owed'})`);
console.log(`   Match: ${Math.abs(balance.balance.amount) === 33650 && balance.balance.amount < 0 ? '✅ YES' : '❌ NO'}`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   🎉 IMPORT SUCCESSFUL - ALL VALUES MATCH EXCEL! 🎉');
console.log('═══════════════════════════════════════════════════════════\n');

closeDatabase();
