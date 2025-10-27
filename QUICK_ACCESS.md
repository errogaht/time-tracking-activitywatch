# Quick Access Guide - Time Tracking Application

## Application is Running! 🎉

### Access the UI
**Open in your browser:** http://localhost:3002

### Start/Stop Server

#### Start Server
```bash
cd timetracking
npm start
```

#### Stop Server
Press `Ctrl+C` in the terminal where the server is running

### Quick Test Commands

#### Check Server Health
```bash
curl http://localhost:3002/health
```

#### List Clients
```bash
curl http://localhost:3002/api/clients | jq
```

#### Check Balance for Client
```bash
curl http://localhost:3002/api/clients/1/balance | jq
```

### Current Status

✅ **Server**: Running on port 3002
✅ **Frontend**: Accessible at http://localhost:3002
✅ **API**: Working at http://localhost:3002/api
✅ **Database**: Connected and populated with sample data

### Sample Data Available

- **Clients**: 3 clients (ExampleClient, Acme Corp, Test Company)
- **Time Entries**: 93 entries for ExampleClient
- **Payments**: 12 payments for ExampleClient
- **Bills**: Ready to generate

### First Steps

1. Open http://localhost:3002 in your browser
2. Select "ExampleClient" from the client dropdown
3. View the balance card showing:
   - 215h 15m total time worked
   - ₽387,450 total earned
   - ₽421,100 total paid
   - Current balance displayed
4. Explore time entries, payments, and bills sections
5. Try adding a new time entry or payment
6. Generate your first bill!

### Key Features to Try

- ✅ View financial overview and balance
- ✅ Browse time entries with date filtering
- ✅ Add manual time entries
- ✅ Add payments (money/supplements)
- ✅ Generate bills from unbilled time
- ✅ View bill HTML in new tab

### Documentation Files

- **Frontend Implementation**: `timetracking/FRONTEND_IMPLEMENTATION.md`
- **Technical Specification**: `timetracking/TECHNICAL_SPECIFICATION.md`
- **Bills API Reference**: `timetracking/backend/BILLS_API_QUICK_REFERENCE.md`

### Support

If you encounter any issues:
1. Check that the server is running
2. Verify port 3002 is not blocked
3. Check browser console for errors
4. Review server logs in terminal

---

**Application Ready for Use!**
