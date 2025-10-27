/**
 * Direct script to update payment_type constraint
 */
const { getDatabase, closeDatabase } = require('./src/config/database');

console.log('Updating payments table schema...');

const db = getDatabase();

try {
  // Step 1: Create new payments table with updated constraint
  console.log('Step 1: Creating new payments table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(10, 2),
      payment_type TEXT CHECK(payment_type IN ('money', 'supplements', 'other')) DEFAULT 'money',
      supplements_description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ New table created');

  // Step 2: Copy data from old table to new table (if any exists)
  console.log('Step 2: Copying data...');
  db.exec(`
    INSERT INTO payments_new (id, client_id, payment_date, amount, payment_type, supplements_description, notes, created_at, updated_at)
    SELECT id, client_id, payment_date, amount,
      CASE
        WHEN payment_type = 'bank_transfer' THEN 'money'
        WHEN payment_type = 'cash' THEN 'money'
        WHEN payment_type = 'card' THEN 'money'
        ELSE payment_type
      END as payment_type,
      supplements_description, notes, created_at, updated_at
    FROM payments
  `);
  console.log('✓ Data copied');

  // Step 3: Drop old table
  console.log('Step 3: Dropping old table...');
  db.exec('DROP TABLE payments');
  console.log('✓ Old table dropped');

  // Step 4: Rename new table to original name
  console.log('Step 4: Renaming new table...');
  db.exec('ALTER TABLE payments_new RENAME TO payments');
  console.log('✓ Table renamed');

  // Step 5: Recreate indexes
  console.log('Step 5: Creating indexes...');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date)');
  console.log('✓ Indexes created');

  // Step 6: Recreate trigger
  console.log('Step 6: Creating trigger...');
  db.exec('DROP TRIGGER IF EXISTS update_payments_timestamp');
  db.exec(`
    CREATE TRIGGER update_payments_timestamp
    AFTER UPDATE ON payments
    FOR EACH ROW
    BEGIN
      UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);
  console.log('✓ Trigger created');

  console.log('\n✓ Schema update completed successfully!');

} catch (error) {
  console.error('\n✗ Schema update failed:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
