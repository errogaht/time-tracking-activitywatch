/**
 * Apply a specific migration to the database
 */
const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase } = require('./src/config/database');

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node apply-migration.js <migration-file>');
  process.exit(1);
}

console.log(`Applying migration: ${migrationFile}`);

const db = getDatabase();

try {
  const migrationPath = path.join(__dirname, 'src', 'migrations', migrationFile);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon and execute each statement
  // Handle multi-line statements properly
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`Found ${statements.length} statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      db.exec(statements[i]);
      console.log(`✓ Statement ${i + 1} completed`);
    } catch (error) {
      console.error(`✗ Statement ${i + 1} failed: ${error.message}`);
      throw error;
    }
  }

  console.log('\n✓ Migration completed successfully!');

} catch (error) {
  console.error('\n✗ Migration failed:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
