# ActivityWatch Integration - Quick Start Guide

## Prerequisites

1. **ActivityWatch must be running:**
   ```bash
   # Check if ActivityWatch is running
   curl http://127.0.0.1:5600/api/0/buckets
   ```

2. **Environment variable (optional):**
   ```bash
   # In .env file
   ACTIVITYWATCH_URL=http://127.0.0.1:5600
   ```

## Usage

### 1. Using the Service Directly

```javascript
const ActivityWatchService = require('./backend/src/services/activityWatchService');

const service = new ActivityWatchService();

// Check status
const status = await service.checkStatus();
console.log(status.running); // true

// Get time for a category WITHOUT AFK exclusion
const result1 = await service.getTimeByCategory('exampleclient', '2025-10-26', false);
console.log(result1);
// { hours: 0, minutes: 11, total_seconds: 684, category: 'exampleclient', exclude_afk: false }

// Get time for a category WITH AFK exclusion
const result2 = await service.getTimeByCategory('exampleclient', '2025-10-26', true);
console.log(result2);
// { hours: 0, minutes: 3, total_seconds: 199, category: 'exampleclient', exclude_afk: true }
```

### 2. Using the API

```bash
# Check status
curl http://localhost:3000/api/activitywatch/status

# Get time WITHOUT AFK exclusion
curl "http://localhost:3000/api/activitywatch/time?category=exampleclient&date=2025-10-26&exclude_afk=false"

# Get time WITH AFK exclusion
curl "http://localhost:3000/api/activitywatch/time?category=exampleclient&date=2025-10-26&exclude_afk=true"

# Import time entry
curl -X POST http://localhost:3000/api/activitywatch/import \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "date": "2025-10-26",
    "category": "exampleclient",
    "exclude_afk": true
  }'
```

### 3. Using the UI

1. Open the Time Tracking System in your browser
2. Navigate to ActivityWatch import section
3. Enter:
   - **Category:** exampleclient (or any app/title pattern)
   - **Date:** 2025-10-26
   - **Exclude AFK Time:** ✓ (checked by default)
4. Click "Import" button
5. Time entry is created automatically

## Category Matching

The system searches in these fields (case-insensitive):

| Field | Example | Matches |
|-------|---------|---------|
| App name | "jetbrains-phpstorm" | "phpstorm", "PHPSTORM", "PhpStorm" |
| Window title | "exampleclient – helix_all_codes.txt" | "exampleclient", "ExampleClient", "EXAMPLECLIENT" |
| Category | ["Work", "Development"] | "work", "dev", "WORK" |

**Examples:**

- Category "**exampleclient**" matches:
  - App: "jetbrains-phpstorm" with title "exampleclient – ..."
  - Any window with "exampleclient" in title
  - Any app with "exampleclient" in name

- Category "**phpstorm**" matches:
  - App: "jetbrains-phpstorm"
  - Any window with "phpstorm" in title

- Category "**chrome**" matches:
  - App: "google-chrome"
  - Any window with "chrome" in title

## Time Range

- **Day starts at:** 4:00 AM Moscow time (+03:00)
- **Day ends at:** 3:59 AM next day (+03:00)

This means:
- Date "2025-10-26" includes time from:
  - **Start:** 2025-10-26 04:00:00 +03:00
  - **End:** 2025-10-27 03:59:59 +03:00

## AFK Exclusion

When "Exclude AFK Time" is enabled:

1. System fetches window events matching your category
2. System fetches AFK events for the date
3. For each window event, it checks if it overlaps with AFK periods
4. Overlapping time is subtracted from the total

**Example:**
- Window event: 10:00 - 10:15 (15 minutes on "exampleclient")
- AFK period: 10:05 - 10:10 (5 minutes away from keyboard)
- **Result:** 10 minutes of active time (15 - 5)

## Troubleshooting

### ActivityWatch not running
```bash
# Error: ActivityWatch is not running
# Solution: Start ActivityWatch application
```

### No data found
```bash
# Error: 0 hours, 0 minutes returned
# Possible causes:
# 1. Wrong date - check if ActivityWatch was running on that date
# 2. Wrong category - try a broader search term (e.g., "chrome" instead of "google-chrome")
# 3. Time outside 4am-4am range - check your timezone
```

### Socket hang up errors
```bash
# Error: socket hang up
# Solution: Already fixed! The service now uses:
# - Custom axios instance
# - Connection: close header
# - Disabled keep-alive
```

## Testing

Run the comprehensive test:

```bash
node test_final.js
```

This will test:
1. ActivityWatch status
2. Bucket detection
3. Window events fetching
4. AFK events fetching
5. Category time without AFK
6. Category time with AFK
7. Case-insensitive matching
8. AFK subtraction logic

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/activityWatchService.js` | Main service implementation |
| `backend/src/controllers/activityWatchController.js` | API controller |
| `backend/src/routes/activityWatch.js` | API routes |
| `ACTIVITYWATCH_IMPLEMENTATION.md` | Detailed implementation docs |

## Quick Reference

### Service Methods

```javascript
// Status check
await service.checkStatus()
// Returns: { running: true, message: '...', buckets: 4, url: '...' }

// Get window events
await service.getWindowEvents('2025-10-26')
// Returns: [{ id, timestamp, duration, data: { app, title } }, ...]

// Get AFK events
await service.getAfkEvents('2025-10-26')
// Returns: [{ id, timestamp, duration, data: { status: 'afk' } }, ...]

// Get time by category
await service.getTimeByCategory('exampleclient', '2025-10-26', true)
// Returns: { hours, minutes, total_seconds, category, exclude_afk }

// Subtract AFK time (helper)
service.subtractAfkTime(windowEvents, afkEvents)
// Returns: total_seconds (number)
```

### API Endpoints

```
GET  /api/activitywatch/status
GET  /api/activitywatch/buckets
GET  /api/activitywatch/categories
GET  /api/activitywatch/time?category={category}&date={date}&exclude_afk={bool}
POST /api/activitywatch/import
```

## Support

For issues or questions:
1. Check ActivityWatch is running: `curl http://127.0.0.1:5600/api/0/buckets`
2. Check server logs
3. Run test suite: `node test_final.js`
4. Review `ACTIVITYWATCH_IMPLEMENTATION.md` for detailed info
