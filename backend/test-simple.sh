#!/bin/bash

# Simple test to verify the API endpoints exist

echo "Testing if Payments API endpoints are available..."
echo

# Test health endpoint first
echo "1. Testing health endpoint..."
curl -s http://localhost:3000/health
echo
echo

# Try to hit the payments endpoint
echo "2. Testing GET /api/payments endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3000/api/payments
echo

echo "3. Testing GET /api/payments/totals/1 endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3000/api/payments/totals/1
echo

echo "4. Testing POST /api/payments with valid data..."
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "payment_date": "2025-10-25",
    "payment_type": "money",
    "amount": 5000.00,
    "notes": "Test payment"
  }'
echo

echo "5. Testing validation - missing client_id..."
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payment_date": "2025-10-25",
    "payment_type": "money",
    "amount": 5000.00
  }'
echo
