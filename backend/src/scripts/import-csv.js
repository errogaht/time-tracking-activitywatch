#!/usr/bin/env node

const path = require('path');
const CsvImportService = require('../services/csvImportService');
const { getDatabase, closeDatabase } = require('../config/database');
const Client = require('../models/Client');

// Parse command line arguments
const args = process.argv.slice(2);
let clientId = 1; // Default to ExampleClient client

// Check for client_id argument
if (args.length > 0 && args[0].startsWith('--client-id=')) {
  clientId = parseInt(args[0].split('=')[1], 10);
} else if (args.length > 0 && !isNaN(parseInt(args[0], 10))) {
  clientId = parseInt(args[0], 10);
}

// Path to CSV file
const csvFilePath = 'Downloads/ExampleClient_timetracking_data.csv';

console.log('========================================');
console.log('CSV Import Tool for Time Tracking System');
console.log('========================================\n');

try {
  // Verify client exists
  const client = Client.getById(clientId);
  if (!client) {
    console.error(`Error: Client with ID ${clientId} not found.`);
    process.exit(1);
  }

  console.log(`Client: ${client.name} (ID: ${clientId})`);
  console.log(`Hourly Rate: ${client.hourly_rate} RUB`);
  console.log(`CSV File: ${csvFilePath}\n`);

  console.log('Starting import...\n');

  // Import the data
  const result = CsvImportService.importData(clientId, csvFilePath);

  console.log('========================================');
  console.log('Import Summary');
  console.log('========================================\n');

  console.log(`Time Entries Imported: ${result.timeEntriesImported}`);
  console.log(`Payments Imported: ${result.paymentsImported}\n`);

  console.log(`Total Time: ${result.totalTime.formatted}`);
  console.log(`Total Payments: ${result.totalPayments.toLocaleString('ru-RU')} RUB\n`);

  // Calculate balance
  const totalMinutes = (result.totalTime.hours * 60) + result.totalTime.minutes;
  const totalEarned = (totalMinutes / 60) * client.hourly_rate;
  const balance = result.totalPayments - totalEarned;

  console.log(`Calculated Work Value: ${totalEarned.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUB`);
  console.log(`Balance: ${balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUB`);

  if (balance > 0) {
    console.log(`(Client has paid ${balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUB in advance)`);
  } else if (balance < 0) {
    console.log(`(Client owes ${Math.abs(balance).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RUB)`);
  } else {
    console.log('(Account is balanced)');
  }

  console.log('\n========================================');
  console.log('Import completed successfully!');
  console.log('========================================\n');

} catch (error) {
  console.error('\n========================================');
  console.error('Import Failed');
  console.error('========================================\n');
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
} finally {
  closeDatabase();
}
