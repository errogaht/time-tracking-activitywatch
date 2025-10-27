# Bills API Quick Reference

## Base URL
```
http://localhost:3000/api/bills
```

## Endpoints

### 1. Get All Bills
```
GET /api/bills
```

**Query Parameters:**
- `client_id` (optional) - Filter by client ID
- `status` (optional) - Filter by status (draft, issued, paid)
- `bill_type` (optional) - Filter by type (invoice, act)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 2,
      "client_id": 4,
      "client_name": "Acme Corp",
      "bill_number": "INV-2025-002",
      "bill_type": "invoice",
      "issue_date": "2025-10-25",
      "period_from": "2025-10-23",
      "period_to": "2025-10-24",
      "total_hours": 5,
      "total_minutes": 45,
      "total_amount": 14375.00,
      "status": "issued",
      "notes": "Updated to issued status",
      "created_at": "2025-10-25T19:09:19.000Z",
      "updated_at": "2025-10-25T19:09:19.000Z"
    }
  ]
}
```

### 2. Get Bill by ID
```
GET /api/bills/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "bill_number": "INV-2025-002",
    "client": {
      "id": 4,
      "name": "Acme Corp",
      "hourly_rate": 2500.00
    },
    "time_entries": [
      {
        "id": 197,
        "work_date": "2025-10-23",
        "hours": 2,
        "minutes": 30,
        "total_minutes": 150,
        "notes": "Test entry 1 for billing"
      }
    ]
  }
}
```

### 3. Create Bill from Entries
```
POST /api/bills/from-entries
```

**Request Body:**
```json
{
  "client_id": 4,
  "time_entry_ids": [197, 198],
  "bill_type": "invoice",
  "status": "draft",
  "issue_date": "2025-10-25",
  "notes": "Q4 2025 invoice"
}
```

**Required Fields:**
- `client_id` - Integer
- `time_entry_ids` - Array of integers

**Optional Fields:**
- `bill_type` - "invoice" or "act" (default: "invoice")
- `status` - "draft", "issued", or "paid" (default: "draft")
- `issue_date` - YYYY-MM-DD format (default: today)
- `notes` - String

**Response:**
```json
{
  "success": true,
  "message": "Bill created successfully from time entries",
  "data": {
    "id": 2,
    "bill_number": "INV-2025-002",
    "total_amount": 14375.00,
    "time_entries": [...]
  }
}
```

### 4. Create Bill from Date Range
```
POST /api/bills/from-range
```

**Request Body:**
```json
{
  "client_id": 4,
  "period_from": "2025-10-01",
  "period_to": "2025-10-31",
  "bill_type": "act",
  "status": "draft",
  "notes": "October 2025 work"
}
```

**Required Fields:**
- `client_id` - Integer
- `period_from` - YYYY-MM-DD
- `period_to` - YYYY-MM-DD

**Optional Fields:** Same as "from-entries"

### 5. Update Bill
```
PUT /api/bills/:id
```

**Request Body:**
```json
{
  "status": "issued",
  "notes": "Sent to client on 2025-10-25"
}
```

**Updatable Fields:**
- `status` - "draft", "issued", "paid"
- `notes` - String
- `bill_type` - "invoice", "act"
- `issue_date` - YYYY-MM-DD
- `period_from` - YYYY-MM-DD
- `period_to` - YYYY-MM-DD
- `total_amount` - Number

### 6. Delete Bill
```
DELETE /api/bills/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Bill deleted successfully and time entries unmarked"
}
```

**Note:** Deleting a bill will unmark all associated time entries (is_billed=false, bill_id=null)

### 7. Get Bill as HTML
```
GET /api/bills/:id/html
```

**Response:** HTML document ready for printing or PDF conversion

**Usage:**
- Open in browser for preview
- Print to PDF from browser
- Use headless browser for server-side PDF generation

## Bill Types

### invoice
- Standard invoice for services
- Bill number format: `INV-YYYY-NNN`
- Example: `INV-2025-001`

### act
- Act of work performed
- Bill number format: `ACT-YYYY-NNN`
- Example: `ACT-2025-001`

## Bill Statuses

### draft
- Initial state
- Not yet sent to client
- Can be edited

### issued
- Bill has been sent to client
- Waiting for payment

### paid
- Payment received
- Final state

## Common Workflows

### 1. Generate Monthly Invoice
```bash
# Step 1: Get unbilled entries for a client
curl "http://localhost:3000/api/time-entries?client_id=4&is_billed=false"

# Step 2: Create bill from date range
curl -X POST http://localhost:3000/api/bills/from-range \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 4,
    "period_from": "2025-10-01",
    "period_to": "2025-10-31",
    "bill_type": "invoice"
  }'

# Step 3: View bill as HTML
curl http://localhost:3000/api/bills/2/html > invoice.html
# Open invoice.html in browser and print to PDF
```

### 2. Create Custom Bill
```bash
# Step 1: Get specific unbilled entries
curl "http://localhost:3000/api/time-entries?client_id=4&is_billed=false"

# Step 2: Select entries and create bill
curl -X POST http://localhost:3000/api/bills/from-entries \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 4,
    "time_entry_ids": [101, 102, 105, 108],
    "bill_type": "act",
    "notes": "Emergency support work"
  }'
```

### 3. Update Bill Status After Payment
```bash
curl -X PUT http://localhost:3000/api/bills/2 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "notes": "Payment received via bank transfer"
  }'
```

### 4. Cancel and Delete Bill
```bash
# Option 1: Mark as cancelled
curl -X PUT http://localhost:3000/api/bills/2 \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'

# Option 2: Delete (will unmark time entries)
curl -X DELETE http://localhost:3000/api/bills/2
```

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation Error",
  "message": "Invalid bill data",
  "details": [
    "client_id is required",
    "time_entry_ids must be an array"
  ]
}
```

### Not Found (404)
```json
{
  "error": "Not Found",
  "message": "Bill with ID 99 not found"
}
```

### Business Logic Error (400)
```json
{
  "error": "Error",
  "message": "Time entry 197 is already billed"
}
```

## Tips

1. **Always check unbilled entries** before creating a bill
2. **Use date range** for regular monthly/weekly billing
3. **Use specific entries** for custom or partial billing
4. **Preview HTML** before finalizing (mark as issued)
5. **Keep bills as draft** until ready to send
6. **Delete carefully** - it will unmark time entries

## Integration with Payments

When a payment is received:
```bash
# Step 1: Update bill status
curl -X PUT http://localhost:3000/api/bills/2 \
  -H "Content-Type: application/json" \
  -d '{"status": "paid"}'

# Step 2: Record payment (if using payments API)
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 4,
    "payment_date": "2025-10-25",
    "payment_type": "money",
    "amount": 14375.00,
    "notes": "Payment for invoice INV-2025-002"
  }'
```
