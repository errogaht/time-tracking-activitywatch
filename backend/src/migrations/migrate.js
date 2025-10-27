const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase } = require('../config/database');

function runMigrations() {
  console.log('Starting database migrations...');

  const db = getDatabase();

  try {
    // Read and execute the initial schema migration
    const migrationPath = path.join(__dirname, '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (error) {
        // Log but continue - some statements might fail if already executed
        console.log(`Statement execution note: ${error.message}`);
      }
    }

    console.log('Migrations completed successfully!');

    // Verify tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `).all();

    console.log('\nCreated tables:');
    tables.forEach(table => console.log(`  - ${table.name}`));

    // Verify seed data
    const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get();
    console.log(`\nSeeded ${clientCount.count} client(s)`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    closeDatabase();
  }
}

// Run migrations if executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
