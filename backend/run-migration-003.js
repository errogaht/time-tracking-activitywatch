const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase } = require('./src/config/database');

console.log('Running migration 003: Update bill constraints...');

const db = getDatabase();

try {
  const migrationPath = path.join(__dirname, 'src/migrations/003_update_bill_constraints.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 100) + '...');
    try {
      db.exec(statement);
      console.log('  ✓ Success');
    } catch (error) {
      console.log(`  ! ${error.message}`);
    }
  }

  console.log('\nMigration completed!');

  // Verify the schema
  const billsSchema = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type='table' AND name='bills'
  `).get();

  console.log('\nBills table schema:');
  console.log(billsSchema.sql);

} catch (error) {
  console.error('Migration failed:', error);
  throw error;
} finally {
  closeDatabase();
}
