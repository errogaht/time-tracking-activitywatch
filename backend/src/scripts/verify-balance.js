#!/usr/bin/env node

const BalanceService = require('../services/balanceService');
const { closeDatabase } = require('../config/database');

const clientId = 1; // ExampleClient

console.log('========================================');
console.log('Balance Verification for ExampleClient');
console.log('========================================\n');

try {
  const balance = BalanceService.calculateClientBalance(clientId);

  console.log(`Client: ${balance.client.name}`);
  console.log(`Hourly Rate: ${balance.client.hourly_rate} RUB\n`);

  console.log('Time Worked:');
  console.log(`  Total: ${balance.time_worked.formatted_time} (${balance.time_worked.total_entries} entries)`);
  console.log(`  Total Minutes: ${balance.time_worked.total_minutes_sum}\n`);

  console.log('Earnings:');
  console.log(`  Total Value: ${balance.earnings.total_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB\n`);

  console.log('Payments Received:');
  console.log(`  Money: ${balance.payments.money.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
  console.log(`  Supplements: ${balance.payments.supplements.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
  console.log(`  Total Paid: ${balance.payments.total_paid.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB\n`);

  if (balance.payments.supplements_list.length > 0) {
    console.log('Supplements Breakdown:');
    balance.payments.supplements_list.forEach(supp => {
      console.log(`  ${supp.payment_date}: ${supp.amount.toLocaleString('ru-RU')} RUB - ${supp.description || 'N/A'}`);
    });
    console.log('');
  }

  console.log('Balance:');
  console.log(`  Amount: ${balance.balance.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);

  if (balance.balance.amount > 0) {
    console.log(`  Status: Client owes you ${balance.balance.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
  } else if (balance.balance.amount < 0) {
    console.log(`  Status: You owe client (advance payment) ${Math.abs(balance.balance.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} RUB`);
  } else {
    console.log(`  Status: Account is balanced`);
  }

  console.log('\n========================================');
  console.log('Expected Values from Excel:');
  console.log('========================================');
  console.log('Total Time: ~167h 48min');
  console.log('Work Value: 387,450 RUB');
  console.log('Total Paid: 421,100 RUB');
  console.log('Balance: 33,650 RUB (advance payment)');
  console.log('========================================\n');

} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
} finally {
  closeDatabase();
}
