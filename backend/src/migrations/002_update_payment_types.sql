-- Migration to update payment_type check constraint
-- Change from: 'bank_transfer', 'cash', 'card', 'other'
-- To: 'money', 'supplements', 'other'

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the table

-- Step 1: Create new payments table with updated constraint
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
);

-- Step 2: Copy data from old table to new table (if any exists)
INSERT INTO payments_new (id, client_id, payment_date, amount, payment_type, supplements_description, notes, created_at, updated_at)
SELECT id, client_id, payment_date, amount,
  CASE
    WHEN payment_type = 'bank_transfer' THEN 'money'
    WHEN payment_type = 'cash' THEN 'money'
    WHEN payment_type = 'card' THEN 'money'
    ELSE payment_type
  END as payment_type,
  supplements_description, notes, created_at, updated_at
FROM payments;

-- Step 3: Drop old table
DROP TABLE payments;

-- Step 4: Rename new table to original name
ALTER TABLE payments_new RENAME TO payments;

-- Step 5: Recreate index
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Step 6: Recreate trigger
DROP TRIGGER IF EXISTS update_payments_timestamp;

CREATE TRIGGER update_payments_timestamp
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
