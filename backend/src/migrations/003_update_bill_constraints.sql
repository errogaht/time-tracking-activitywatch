-- Update bills table constraints to support 'act' bill type and new status values
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly
-- We need to recreate the table with new constraints

-- Create backup of bills table
CREATE TABLE IF NOT EXISTS bills_backup AS SELECT * FROM bills;

-- Drop the old table
DROP TABLE IF EXISTS bills;

-- Recreate bills table with updated constraints
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  bill_number TEXT NOT NULL UNIQUE,
  bill_type TEXT CHECK(bill_type IN ('invoice', 'act', 'receipt', 'quote')) DEFAULT 'invoice',
  issue_date DATE NOT NULL,
  period_from DATE,
  period_to DATE,
  total_hours INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK(status IN ('draft', 'issued', 'paid', 'sent', 'cancelled')) DEFAULT 'draft',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Restore data from backup
INSERT INTO bills SELECT * FROM bills_backup;

-- Drop backup table
DROP TABLE bills_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_bills_client_id ON bills(client_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Recreate trigger
DROP TRIGGER IF EXISTS update_bills_timestamp;
CREATE TRIGGER update_bills_timestamp
AFTER UPDATE ON bills
FOR EACH ROW
BEGIN
  UPDATE bills SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
