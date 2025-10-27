# Time Tracking System

A comprehensive time tracking and billing system with ActivityWatch integration.

## Project Structure

```
timetracking/
├── backend/
│   └── src/
│       ├── config/          # Database and configuration files
│       ├── models/          # Database models (to be implemented)
│       ├── controllers/     # Request handlers (to be implemented)
│       ├── services/        # Business logic (to be implemented)
│       ├── routes/          # API routes (to be implemented)
│       ├── middleware/      # Custom middleware (to be implemented)
│       ├── migrations/      # Database migrations
│       └── app.js           # Express application
├── database/                # SQLite database files
├── .env                     # Environment variables
└── package.json             # Project dependencies
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run database migrations:
   ```bash
   npm run migrate
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on http://localhost:3000 (or the port specified in .env)

## Database Schema

### Tables

- **clients**: Client information and billing rates
- **time_entries**: Time tracking records with ActivityWatch integration
- **payments**: Payment tracking
- **bills**: Invoice/bill management

### Key Features

- Foreign key constraints enabled
- Automatic timestamp updates via triggers
- Generated column for total_minutes (hours * 60 + minutes)
- Indexes for optimized queries
- WAL mode for better concurrency

## Environment Variables

Edit `.env` file to configure:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `DATABASE_PATH`: SQLite database file path

## Initial Data

The database is seeded with sample clients:
- **Acme Corp**: hourly_rate=2500, active
- **Test Client**: hourly_rate=2500, activitywatch_category="TEST"

## Available Scripts

- `npm start`: Start the Express server
- `npm run dev`: Start the server in development mode
- `npm run migrate`: Run database migrations

## API Endpoints

- `GET /health`: Health check endpoint

(Additional API endpoints will be implemented in routes/)

## Next Steps

- Implement API routes for CRUD operations
- Create service layer for business logic
- Add ActivityWatch integration
- Implement billing calculations
- Add authentication/authorization
