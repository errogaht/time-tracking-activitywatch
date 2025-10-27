-- Initial database schema for time tracking system

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  contact_info TEXT,
  activitywatch_category TEXT,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  work_date DATE NOT NULL,
  hours INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER GENERATED ALWAYS AS (hours * 60 + minutes) STORED,
  source TEXT CHECK(source IN ('manual', 'activitywatch', 'import')) DEFAULT 'manual',
  activitywatch_exclude_afk BOOLEAN DEFAULT 0,
  is_billed BOOLEAN DEFAULT 0,
  bill_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_type TEXT CHECK(payment_type IN ('bank_transfer', 'cash', 'card', 'other')) DEFAULT 'bank_transfer',
  supplements_description TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  bill_number TEXT NOT NULL UNIQUE,
  bill_type TEXT CHECK(bill_type IN ('invoice', 'receipt', 'quote')) DEFAULT 'invoice',
  issue_date DATE NOT NULL,
  period_from DATE,
  period_to DATE,
  total_hours INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'cancelled')) DEFAULT 'draft',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_bill_id ON time_entries(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_bills_client_id ON bills(client_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_clients_timestamp
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
  UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_time_entries_timestamp
AFTER UPDATE ON time_entries
FOR EACH ROW
BEGIN
  UPDATE time_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_payments_timestamp
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_bills_timestamp
AFTER UPDATE ON bills
FOR EACH ROW
BEGIN
  UPDATE bills SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Seed data: ExampleClient
INSERT INTO clients (name, hourly_rate, activitywatch_category, is_active, notes)
VALUES ('ExampleClient', 1800.00, 'ExampleClient', 1, 'Example client for demonstration')
ON CONFLICT(name) DO NOTHING;
