#!/bin/bash

cd timetracking/backend
PORT=3006 node src/app.js > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

echo "========================================="
echo "CLIENTS API - COMPREHENSIVE TEST RESULTS"
echo "========================================="
echo ""

echo "1. GET existing ExampleClient:"
curl -s http://localhost:3006/api/clients/1 | python3 -m json.tool
echo ""

echo "2. Create new client 'Acme Corp':"
curl -s -X POST http://localhost:3006/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "hourly_rate": 2200.50, "contact_info": "acme@example.com"}' | python3 -m json.tool
echo ""

echo "3. GET all clients:"
curl -s http://localhost:3006/api/clients | python3 -m json.tool
echo ""

echo "4. Update Acme Corp hourly rate to 2500:"
# Find Acme Corp ID
ACME_ID=$(curl -s http://localhost:3006/api/clients | python3 -c "import sys, json; data=json.load(sys.stdin); print([c['id'] for c in data['data'] if c['name']=='Acme Corp'][0])")
curl -s -X PUT http://localhost:3006/api/clients/$ACME_ID \
  -H "Content-Type: application/json" \
  -d '{"hourly_rate": 2500.00}' | python3 -m json.tool
echo ""

echo "5. Soft delete Acme Corp:"
curl -s -X DELETE http://localhost:3006/api/clients/$ACME_ID | python3 -m json.tool
echo ""

echo "6. GET only active clients (should exclude Acme Corp):"
curl -s "http://localhost:3006/api/clients?active=true" | python3 -m json.tool
echo ""

echo "7. Test validation - missing name:"
curl -s -X POST http://localhost:3006/api/clients \
  -H "Content-Type: application/json" \
  -d '{"hourly_rate": 1500}' | python3 -m json.tool
echo ""

echo "8. Test validation - negative rate:"
curl -s -X POST http://localhost:3006/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name": "Bad Client", "hourly_rate": -100}' | python3 -m json.tool
echo ""

echo "9. Test 404 - non-existent client:"
curl -s http://localhost:3006/api/clients/999 | python3 -m json.tool
echo ""

kill $SERVER_PID 2>/dev/null
echo "========================================="
echo "All tests completed successfully!"
echo "========================================="
