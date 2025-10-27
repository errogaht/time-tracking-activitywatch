const { getDatabase, closeDatabase } = require('../config/database');
const Client = require('../models/Client');

console.log('=== Time Tracking System - Setup Verification ===\n');

try {
  const db = getDatabase();

  // Check database connection
  console.log('✓ Database connection established');

  // List all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`✓ Found ${tables.length} tables:`);
  tables.forEach(table => console.log(`  - ${table.name}`));

  // Check clients
  const clients = Client.getAll();
  console.log(`\n✓ Found ${clients.length} client(s):`);
  clients.forEach(client => {
    console.log(`  - ${client.name}`);
    console.log(`    Hourly Rate: ${client.hourly_rate}`);
    console.log(`    ActivityWatch Category: ${client.activitywatch_category || 'N/A'}`);
    console.log(`    Active: ${client.is_active ? 'Yes' : 'No'}`);
  });

  // Count records in each table
  console.log('\n=== Record Counts ===');
  const counts = {
    clients: db.prepare('SELECT COUNT(*) as count FROM clients').get(),
    time_entries: db.prepare('SELECT COUNT(*) as count FROM time_entries').get(),
    payments: db.prepare('SELECT COUNT(*) as count FROM payments').get(),
    bills: db.prepare('SELECT COUNT(*) as count FROM bills').get()
  };

  Object.entries(counts).forEach(([table, result]) => {
    console.log(`${table}: ${result.count}`);
  });

  console.log('\n✓ Setup verification completed successfully!');

} catch (error) {
  console.error('✗ Verification failed:', error.message);
  process.exit(1);
} finally {
  closeDatabase();
}
