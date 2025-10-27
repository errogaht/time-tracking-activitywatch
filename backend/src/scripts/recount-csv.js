#!/usr/bin/env node

const fs = require('fs');

const csvPath = 'Downloads/ExampleClient_timetracking_data.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n').map(line => line.trim()).filter(line => line);

let totalMinutes = 0;
let entryCount = 0;
let skippedZeros = 0;

console.log('========================================');
console.log('Manual CSV Entry Count');
console.log('========================================\n');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const columns = line.split(',');

  const dateStr = columns[0] ? columns[0].trim() : '';
  const hoursStr = columns[2] ? columns[2].trim() : '';
  const minutesStr = columns[3] ? columns[3].trim() : '';

  // Skip headers, months, special rows, totals
  if (!dateStr || dateStr.toLowerCase().includes('jun') || dateStr.toLowerCase().includes('jul') ||
      dateStr.toLowerCase().includes('aug') || dateStr.toLowerCase().includes('sep') ||
      dateStr.toLowerCase().includes('oct') || dateStr.toLowerCase() === 'total' ||
      dateStr.toLowerCase() === 'rate' || dateStr.toLowerCase() === 'date') {
    continue;
  }

  // Check if it's a date
  const dateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (!dateMatch) {
    continue;
  }

  const hours = hoursStr && !isNaN(parseInt(hoursStr, 10)) ? parseInt(hoursStr, 10) : 0;
  const minutes = minutesStr && !isNaN(parseInt(minutesStr, 10)) ? parseInt(minutesStr, 10) : 0;

  if (hours === 0 && minutes === 0) {
    skippedZeros++;
    console.log(`Skipped ${dateStr}: 0h 0m`);
  } else {
    totalMinutes += (hours * 60) + minutes;
    entryCount++;
    if (i <= 10 || i >= lines.length - 15) {
      console.log(`${dateStr}: ${hours}h ${minutes}m`);
    }
  }
}

console.log('\n========================================');
console.log('Summary');
console.log('========================================');
console.log(`Total Entries Counted: ${entryCount}`);
console.log(`Entries with 0h 0m (skipped): ${skippedZeros}`);
console.log(`Total Minutes: ${totalMinutes}`);
console.log(`Total Time: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`);
console.log(`Decimal Hours: ${(totalMinutes / 60).toFixed(4)}`);
console.log(`\nExpected from Excel: 215.25 hours = 12,915 minutes`);
console.log(`Difference: ${12915 - totalMinutes} minutes (${((12915 - totalMinutes) / 60).toFixed(2)} hours)`);
