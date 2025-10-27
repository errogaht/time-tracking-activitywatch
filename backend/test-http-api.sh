#!/bin/bash

# Test Payments HTTP API
# Assumes server is running on port 3000

BASE_URL="http://localhost:3000/api"

echo "=== Testing Payments HTTP API ==="
echo

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Get all clients to find ExampleClient
echo "${BLUE}Test 1: Get all clients${NC}"
CLIENT_RESPONSE=$(curl -s "${BASE_URL}/clients")
echo "$CLIENT_RESPONSE" | python3 -m json.tool
EXAMPLE_CLIENT_ID=$(echo "$CLIENT_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print([c['id'] for c in data['data'] if c['name'] == 'ExampleClient'][0])")
echo "${GREEN}✓ ExampleClient ID: $EXAMPLE_CLIENT_ID${NC}"
echo

# Test 2: Create a money payment
echo "${BLUE}Test 2: Create a money payment (POST /api/payments)${NC}"
PAYMENT1=$(curl -s -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": $EXAMPLE_CLIENT_ID,
    \"payment_date\": \"2025-10-25\",
    \"payment_type\": \"money\",
    \"amount\": 10000.00,
    \"notes\": \"Payment for October services\"
  }")
echo "$PAYMENT1" | python3 -m json.tool
PAYMENT1_ID=$(echo "$PAYMENT1" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "${GREEN}✓ Created payment ID: $PAYMENT1_ID${NC}"
echo

# Test 3: Create a supplements payment
echo "${BLUE}Test 3: Create a supplements payment${NC}"
PAYMENT2=$(curl -s -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": $EXAMPLE_CLIENT_ID,
    \"payment_date\": \"2025-10-20\",
    \"payment_type\": \"supplements\",
    \"supplements_description\": \"Laptop and office equipment\",
    \"notes\": \"Hardware provided\"
  }")
echo "$PAYMENT2" | python3 -m json.tool
PAYMENT2_ID=$(echo "$PAYMENT2" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "${GREEN}✓ Created payment ID: $PAYMENT2_ID${NC}"
echo

# Test 4: Get all payments
echo "${BLUE}Test 4: Get all payments (GET /api/payments)${NC}"
curl -s "${BASE_URL}/payments" | python3 -m json.tool
echo

# Test 5: Get payment by ID
echo "${BLUE}Test 5: Get payment by ID (GET /api/payments/$PAYMENT1_ID)${NC}"
curl -s "${BASE_URL}/payments/$PAYMENT1_ID" | python3 -m json.tool
echo

# Test 6: Filter payments by client
echo "${BLUE}Test 6: Filter payments by client (GET /api/payments?client_id=$EXAMPLE_CLIENT_ID)${NC}"
curl -s "${BASE_URL}/payments?client_id=$EXAMPLE_CLIENT_ID" | python3 -m json.tool
echo

# Test 7: Filter payments by payment_type
echo "${BLUE}Test 7: Filter payments by type (GET /api/payments?payment_type=money)${NC}"
curl -s "${BASE_URL}/payments?payment_type=money" | python3 -m json.tool
echo

# Test 8: Filter payments by date range
echo "${BLUE}Test 8: Filter payments by date range${NC}"
curl -s "${BASE_URL}/payments?payment_date_from=2025-10-20&payment_date_to=2025-10-25" | python3 -m json.tool
echo

# Test 9: Update a payment
echo "${BLUE}Test 9: Update a payment (PUT /api/payments/$PAYMENT1_ID)${NC}"
curl -s -X PUT "${BASE_URL}/payments/$PAYMENT1_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 12000.00,
    \"notes\": \"Payment for October services - Updated\"
  }" | python3 -m json.tool
echo

# Test 10: Get payment totals by client
echo "${BLUE}Test 10: Get payment totals by client (GET /api/payments/totals/$EXAMPLE_CLIENT_ID)${NC}"
curl -s "${BASE_URL}/payments/totals/$EXAMPLE_CLIENT_ID" | python3 -m json.tool
echo

# Test 11: Delete a payment
echo "${BLUE}Test 11: Delete a payment (DELETE /api/payments/$PAYMENT2_ID)${NC}"
curl -s -X DELETE "${BASE_URL}/payments/$PAYMENT2_ID" | python3 -m json.tool
echo

# Test 12: Verify deletion
echo "${BLUE}Test 12: Verify payment was deleted${NC}"
curl -s "${BASE_URL}/payments/$PAYMENT2_ID" | python3 -m json.tool
echo

# Test 13: Validation - missing required field
echo "${BLUE}Test 13: Validation test - missing client_id (should fail)${NC}"
curl -s -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"payment_date\": \"2025-10-25\",
    \"payment_type\": \"money\",
    \"amount\": 1000.00
  }" | python3 -m json.tool
echo

# Test 14: Validation - invalid payment_type
echo "${BLUE}Test 14: Validation test - invalid payment_type (should fail)${NC}"
curl -s -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": $EXAMPLE_CLIENT_ID,
    \"payment_date\": \"2025-10-25\",
    \"payment_type\": \"invalid_type\",
    \"amount\": 1000.00
  }" | python3 -m json.tool
echo

# Test 15: Validation - money type without amount
echo "${BLUE}Test 15: Validation test - money type without amount (should fail)${NC}"
curl -s -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": $EXAMPLE_CLIENT_ID,
    \"payment_date\": \"2025-10-25\",
    \"payment_type\": \"money\"
  }" | python3 -m json.tool
echo

# Test 16: Validation - supplements without description
echo "${BLUE}Test 16: Validation test - supplements without description (should fail)${NC}"
curl -s -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": $EXAMPLE_CLIENT_ID,
    \"payment_date\": \"2025-10-25\",
    \"payment_type\": \"supplements\"
  }" | python3 -m json.tool
echo

echo "${GREEN}=== All HTTP API tests completed ===${NC}"
