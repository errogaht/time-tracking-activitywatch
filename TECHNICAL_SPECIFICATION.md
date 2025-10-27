# Technical Specification: Time Tracking System

## 1. Project Overview

Web application built with Node.js for tracking work time with hourly billing, ActivityWatch integration, and client payment management.

**Technology Stack:**
- Backend: Node.js + Express
- Database: SQLite 3
- Frontend: HTML/CSS/JavaScript (possibly React/Vue for UI)
- Integration: ActivityWatch REST API

---

## 2. Current User Workflow

1. ActivityWatch automatically tracks work time based on configured rules
2. Time is filtered by category "ExampleClient" (one of the clients)
3. User opens ActivityWatch calendar and selects a day
4. Reviews time by category ExampleClient (e.g., 2h 41min)
5. Opens Excel spreadsheet and manually enters:
   - Date
   - Hours
   - Minutes
6. Excel automatically:
   - Sums all time
   - Multiplies by rate (1800/hour)
   - Shows overall balance (earned - paid)
7. When receiving payment, adds entry to payments column

**Current Process Issues:**
- Manual data entry
- No change history
- Difficult to generate reports for periods
- No automatic synchronization with ActivityWatch

---

## 3. Database Architecture

### 3.1 Table: `clients` (Clients)

```sql
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 1800.00,
    contact_info TEXT,
    activitywatch_category TEXT,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `name` - client/project name (e.g., "ExampleClient")
- `hourly_rate` - hourly rate in currency
- `activitywatch_category` - category name in ActivityWatch for automatic import
- `is_active` - whether client is active

---

### 3.2 Table: `time_entries` (Time Entries)

```sql
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    work_date DATE NOT NULL,
    hours INTEGER NOT NULL DEFAULT 0,
    minutes INTEGER NOT NULL DEFAULT 0,
    total_minutes INTEGER GENERATED ALWAYS AS (hours * 60 + minutes) STORED,
    source TEXT CHECK(source IN ('manual', 'activitywatch')) DEFAULT 'manual',
    activitywatch_exclude_afk BOOLEAN,
    is_billed BOOLEAN DEFAULT 0,
    bill_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
);

CREATE INDEX idx_time_entries_client_date ON time_entries(client_id, work_date);
CREATE INDEX idx_time_entries_billed ON time_entries(is_billed);
```

**Fields:**
- `work_date` - work date
- `hours`, `minutes` - time worked
- `total_minutes` - computed field for simplified calculations
- `source` - entry source (manual entry or ActivityWatch)
- `activitywatch_exclude_afk` - whether "Exclude AFK Time" filter was enabled during import
- `is_billed` - whether entry is included in bill
- `bill_id` - reference to bill (if issued)

---

### 3.3 Table: `payments` (Payments)

```sql
CREATE TABLE payments (
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

CREATE INDEX idx_payments_client_date ON payments(client_id, payment_date);
```

**Fields:**
- `amount` - payment amount in currency (NULL if supplements)
- `payment_type` - payment type:
  - `money` - cash payment
  - `supplements` - supplements/products
  - `other` - other
- `supplements_description` - supplements description (if applicable)

---

### 3.4 Table: `bills` (Bills/Invoices)

```sql
CREATE TABLE bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    bill_number TEXT UNIQUE,
    bill_type TEXT CHECK(bill_type IN ('invoice', 'act')) DEFAULT 'act',
    issue_date DATE NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    total_hours DECIMAL(10, 2),
    total_minutes INTEGER,
    total_amount DECIMAL(10, 2),
    status TEXT CHECK(status IN ('draft', 'issued', 'paid')) DEFAULT 'draft',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_bills_client ON bills(client_id);
CREATE INDEX idx_bills_status ON bills(status);
```

**Fields:**
- `bill_number` - bill/invoice number
- `bill_type` - document type (invoice or bill)
- `period_from`, `period_to` - period for which bill is issued
- `total_hours`, `total_minutes`, `total_amount` - total amounts
- `status` - status (draft, issued, paid)

---

## 4. ActivityWatch Integration

### 4.1 ActivityWatch API

**Instance URL:** `http://127.0.0.1:5600`

**Main endpoints:**
- `GET /api/0/buckets` - get list of buckets
- `GET /api/0/buckets/{bucket_id}/events` - get events
- `GET /api/0/query` - execute queries with filtering

### 4.2 Getting Data by Category

To get time for category "ExampleClient" you need to:

1. Get window bucket (usually `aw-watcher-window_<hostname>`)
2. Execute query with category filtering
3. Aggregate time by dates
4. Get two values:
   - With `Exclude AFK Time` filter
   - Without filter

**Query Example:**
```javascript
{
  "timeperiods": ["2025-10-05T00:00:00+03:00/2025-10-06T00:00:00+03:00"],
  "query": [
    "events = query_bucket(find_bucket('aw-watcher-window_'));",
    "events = filter_keyvals(events, 'category', ['ExampleClient']);",
    "RETURN = sum_durations(events);"
  ]
}
```

### 4.3 ActivityWatch Import Interface

**UI Component: "Import from ActivityWatch"**

Displays:
```
┌─────────────────────────────────────────────────────────────┐
│ Import Time from ActivityWatch                              │
├─────────────────────────────────────────────────────────────┤
│ Client: [ExampleClient ▼]                                   │
│ Date:   [2025-10-05 📅]                                     │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ActivityWatch Data:                                     │ │
│ │                                                          │ │
│ │ ○ With "Exclude AFK Time":    2h 41min                 │ │
│ │ ○ Without "Exclude AFK Time": 3h 15min                 │ │
│ │                                                          │ │
│ │ [ Refresh Data ]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ OR Enter Manually:                                           │
│ Hours: [__] Minutes: [__]                                    │
│                                                              │
│ Notes: [_________________________________________]           │
│                                                              │
│           [ Import Selected ]  [ Enter Manually ]           │
└─────────────────────────────────────────────────────────────┘
```

**Functionality:**
- Automatically loads data from ActivityWatch when date is selected
- Shows both time options (with/without AFK)
- Allows selecting one option or manual entry
- Saves data source (`activitywatch`/`manual`)
- Saves `exclude_afk` flag if imported from ActivityWatch

---

## 5. Main Functionality

### 5.1 Client Management

- ✓ Create new client
- ✓ Edit client (rate, contacts, AW category)
- ✓ View client list
- ✓ Archive client (is_active = false)

### 5.2 Time Tracking

- ✓ Add time entry:
  - Import from ActivityWatch (with AFK mode selection)
  - Manual entry
- ✓ Edit entry
- ✓ Delete entry
- ✓ View calendar with entries
- ✓ Filter by client
- ✓ Mark entries for billing

### 5.3 Balance and Reports

**Dashboard Screen:**
```
┌───────────────────────────────────────────────────────────────┐
│ Client: ExampleClient                             1800/hour   │
├───────────────────────────────────────────────────────────────┤
│ Total Time Worked:         125h 30min                         │
│ Total Amount Earned:       225,900                             │
│                                                                │
│ Total Paid:                150,000                             │
│ - Money:                   120,000                             │
│ - Supplements:             ~30,000 (estimated)                 │
│                                                                │
│ Balance:                   +75,900                             │
├───────────────────────────────────────────────────────────────┤
│ Unbilled Time:             15h 45min (28,350)                 │
│                                                                │
│ [Generate Bill] [View Details]                                │
└───────────────────────────────────────────────────────────────┘
```

**Calculations:**
- Earned = SUM(total_minutes) / 60 * hourly_rate
- Paid = SUM(payments.amount where payment_type='money')
- Balance = Earned - Paid

### 5.4 Generating Bills

**Process:**
1. Select client
2. Select period (from/to date) or individual days (checkboxes)
3. View list of time entries
4. Select needed entries
5. Generate bill:
   - Bill number
   - Issue date
   - List of work with dates
   - Total time
   - Total amount
6. Mark entries as `is_billed = true`
7. Export to PDF/print (optional)

### 5.5 Payment Management

- ✓ Add payment:
  - Cash (amount)
  - Supplements (description, approximate cost)
- ✓ View payment history
- ✓ Edit/delete payment
- ✓ Link payment to bill (optional)

---

## 6. API Endpoints (REST)

### 6.1 Clients

```
GET    /api/clients              # List clients
GET    /api/clients/:id          # Client details
POST   /api/clients              # Create client
PUT    /api/clients/:id          # Update client
DELETE /api/clients/:id          # Delete client
GET    /api/clients/:id/balance  # Client balance
```

### 6.2 Time Entries

```
GET    /api/time-entries                    # List entries (+ filters)
GET    /api/time-entries/:id                # Entry details
POST   /api/time-entries                    # Create entry
PUT    /api/time-entries/:id                # Update entry
DELETE /api/time-entries/:id                # Delete entry
GET    /api/time-entries/unbilled           # Unbilled entries
```

### 6.3 ActivityWatch Integration

```
GET    /api/activitywatch/categories        # Available categories
GET    /api/activitywatch/time              # Time by category/date
       ?category=ExampleClient
       &date=2025-10-05
       &exclude_afk=true|false
POST   /api/activitywatch/import            # Import time
```

### 6.4 Payments

```
GET    /api/payments                        # List payments
GET    /api/payments/:id                    # Payment details
POST   /api/payments                        # Create payment
PUT    /api/payments/:id                    # Update payment
DELETE /api/payments/:id                    # Delete payment
```

### 6.5 Bills

```
GET    /api/bills                           # List bills
GET    /api/bills/:id                       # Bill details
POST   /api/bills                           # Create bill
PUT    /api/bills/:id                       # Update bill
DELETE /api/bills/:id                       # Delete bill
GET    /api/bills/:id/pdf                   # Export to PDF
```

---

## 7. Excel Data Migration

**Task:** Import existing data from Excel spreadsheet.

**Process:**
1. User provides Excel file
2. Parse file (library: `xlsx` or `exceljs`)
3. Column mapping:
   - Date → `work_date`
   - Hours → `hours`
   - Minutes → `minutes`
   - Payments → create entries in `payments`
4. Import into database
5. Validation and import report

**CLI command:**
```bash
npm run import:excel -- --file=path/to/file.xlsx --client-id=1
```

---

## 8. Project Structure

```
timetracking/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # SQLite configuration
│   │   ├── models/
│   │   │   ├── Client.js
│   │   │   ├── TimeEntry.js
│   │   │   ├── Payment.js
│   │   │   └── Bill.js
│   │   ├── controllers/
│   │   │   ├── clientsController.js
│   │   │   ├── timeEntriesController.js
│   │   │   ├── paymentsController.js
│   │   │   ├── billsController.js
│   │   │   └── activityWatchController.js
│   │   ├── services/
│   │   │   ├── activityWatchService.js
│   │   │   ├── balanceService.js
│   │   │   └── excelImportService.js
│   │   ├── routes/
│   │   │   ├── clients.js
│   │   │   ├── timeEntries.js
│   │   │   ├── payments.js
│   │   │   ├── bills.js
│   │   │   └── activityWatch.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── validator.js
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql
│   │   └── app.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── TimeEntryForm.js
│   │   │   ├── ActivityWatchImport.js
│   │   │   ├── Calendar.js
│   │   │   ├── BillGenerator.js
│   │   │   └── PaymentForm.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── database/
│   └── timetracking.db            # SQLite database file
├── docs/
│   └── TECHNICAL_SPECIFICATION.md
└── README.md
```

---

## 9. Development Plan (Stages)

### Stage 1: Basic Infrastructure ✅
**Goal:** Set up project and database

- [ ] 1.1. Initialize Node.js project
- [ ] 1.2. Install dependencies (express, better-sqlite3, cors, dotenv)
- [ ] 1.3. Create project structure
- [ ] 1.4. Configure SQLite connection
- [ ] 1.5. Create migrations for all tables
- [ ] 1.6. Seed data (test client ExampleClient with rate 1800)

**Result:** Working database with initial schema

---

### Stage 2: Client and Time API ✅
**Goal:** CRUD operations for clients and time entries

- [ ] 2.1. Models (Client, TimeEntry)
- [ ] 2.2. Controllers and Routes for clients
- [ ] 2.3. Controllers and Routes for time entries
- [ ] 2.4. Input validation
- [ ] 2.5. Error handling
- [ ] 2.6. API testing (Postman/Insomnia)

**Result:** Working REST API for main entities

---

### Stage 3: ActivityWatch Integration 🔄
**Goal:** Get data from ActivityWatch

- [ ] 3.1. Research ActivityWatch API
- [ ] 3.2. Service for working with ActivityWatch
  - [ ] 3.2.1. Get list of buckets
  - [ ] 3.2.2. Query events by category
  - [ ] 3.2.3. Aggregate time by date
  - [ ] 3.2.4. Two modes: with/without Exclude AFK
- [ ] 3.3. API endpoint for getting AW data
- [ ] 3.4. API endpoint for importing time from AW
- [ ] 3.5. Testing with real ActivityWatch instance

**Result:** Automatic time loading from ActivityWatch

---

### Stage 4: Payment and Balance System ✅
**Goal:** Track payments and calculate balance

- [ ] 4.1. Payment Model
- [ ] 4.2. CRUD API for payments
- [ ] 4.3. Service for balance calculation
- [ ] 4.4. API endpoint for getting client balance
- [ ] 4.5. Support for payment types (money/supplements)

**Result:** Payment tracking and current balance

---

### Stage 5: Bill Generation 📝
**Goal:** Create bills for period

- [ ] 5.1. Bill Model
- [ ] 5.2. API for creating bill from selected entries
- [ ] 5.3. Logic for selecting entries for bill
- [ ] 5.4. Update entry status (is_billed)
- [ ] 5.5. Generate bill number
- [ ] 5.6. PDF generation (optional, later)

**Result:** Ability to generate bills for period

---

### Stage 6: Frontend (Basic UI) 🎨
**Goal:** Minimum working interface

- [ ] 6.1. Setup frontend (React/Vue or plain HTML)
- [ ] 6.2. Dashboard with balance
- [ ] 6.3. Calendar with time entries
- [ ] 6.4. ActivityWatch import form
- [ ] 6.5. Manual time entry form
- [ ] 6.6. Payments list
- [ ] 6.7. Bill generator

**Result:** Full-featured web application

---

### Stage 7: Excel Import 📊
**Goal:** Migrate existing data

- [ ] 7.1. CLI script for parsing Excel
- [ ] 7.2. Data mapping
- [ ] 7.3. Import time entries
- [ ] 7.4. Import payments
- [ ] 7.5. Validation and report

**Result:** All historical data in system

---

### Stage 8: Improvements and Polish ✨
**Goal:** Additional features

- [ ] 8.1. Export bills to PDF
- [ ] 8.2. Notifications for untracked time
- [ ] 8.3. Charts and analytics
- [ ] 8.4. Database backup
- [ ] 8.5. API documentation (Swagger)
- [ ] 8.6. Docker container

**Result:** Production-ready application

---

## 10. Clarification Questions

1. **Frontend technology:**
   - Preferences: React, Vue, Svelte or plain HTML/JS?
   - Need responsive design for mobile?

2. **Authorization:**
   - Need authorization system (login/password)?
   - Or is this a local application for single user?

3. **ActivityWatch:**
   - Is ActivityWatch instance always running locally?
   - Need error handling if AW is unavailable?

4. **Excel format:**
   - Can you provide Excel file example?
   - What columns are present?

5. **Bills/Invoices:**
   - Need template for PDF bills?
   - What information should be in bill (details, signatures)?

6. **Supplements:**
   - Need to track individual supplements?
   - Or is text description and approximate cost enough?

7. **Deployment:**
   - Where to run (locally, VPS, cloud)?
   - Need Docker for deployment?

---

## 11. Next Steps

After architecture approval:

1. ✅ Approve DB structure
2. ✅ Clarify UI requirements
3. ✅ Get Excel file example for parsing
4. 🚀 Start implementation from Stage 1

---

## 12. Technical Requirements

**Minimum dependencies (Backend):**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

**For Excel import:**
```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

**For PDF generation (optional):**
```json
{
  "dependencies": {
    "pdfkit": "^0.13.0"
  }
}
```

---

**Document Version:** 1.0
**Created:** 2025-10-25
**Status:** Awaiting approval
