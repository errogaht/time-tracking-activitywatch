/**
 * Verification script for Payments API implementation
 * This script verifies that all components are properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('=== Payments API Implementation Verification ===\n');

const checks = [];
let passed = 0;
let failed = 0;

// Helper function to check file existence
function checkFile(filepath, description) {
  const fullPath = path.join(__dirname, filepath);
  const exists = fs.existsSync(fullPath);
  checks.push({ description, passed: exists, path: filepath });
  if (exists) passed++;
  else failed++;
  return exists;
}

// Helper function to check file contains string
function checkFileContains(filepath, searchString, description) {
  const fullPath = path.join(__dirname, filepath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const contains = content.includes(searchString);
    checks.push({ description, passed: contains, path: filepath });
    if (contains) passed++;
    else failed++;
    return contains;
  } catch (error) {
    checks.push({ description, passed: false, path: filepath, error: error.message });
    failed++;
    return false;
  }
}

console.log('Checking implementation files...\n');

// 1. Check Payment Model
checkFile('src/models/Payment.js', 'Payment model exists');
checkFileContains('src/models/Payment.js', 'findAll(filters', 'Payment.findAll() method');
checkFileContains('src/models/Payment.js', 'findById(id)', 'Payment.findById() method');
checkFileContains('src/models/Payment.js', 'findByClient(client_id)', 'Payment.findByClient() method');
checkFileContains('src/models/Payment.js', 'create(paymentData)', 'Payment.create() method');
checkFileContains('src/models/Payment.js', 'update(id, paymentData)', 'Payment.update() method');
checkFileContains('src/models/Payment.js', 'delete(id)', 'Payment.delete() method');
checkFileContains('src/models/Payment.js', 'getTotalsByClient(client_id)', 'Payment.getTotalsByClient() method');

// 2. Check Payments Controller
checkFile('src/controllers/paymentsController.js', 'Payments controller exists');
checkFileContains('src/controllers/paymentsController.js', 'getAllPayments', 'getAllPayments handler');
checkFileContains('src/controllers/paymentsController.js', 'getPaymentById', 'getPaymentById handler');
checkFileContains('src/controllers/paymentsController.js', 'createPayment', 'createPayment handler');
checkFileContains('src/controllers/paymentsController.js', 'updatePayment', 'updatePayment handler');
checkFileContains('src/controllers/paymentsController.js', 'deletePayment', 'deletePayment handler');
checkFileContains('src/controllers/paymentsController.js', 'getPaymentTotalsByClient', 'getPaymentTotalsByClient handler');

// 3. Check Validation Middleware
checkFileContains('src/middleware/validation.js', 'validatePaymentData', 'validatePaymentData middleware');
checkFileContains('src/middleware/validation.js', "payment_type must be one of: money, supplements, other", 'Payment type validation');
checkFileContains('src/middleware/validation.js', 'supplements_description is required when payment_type is "supplements"', 'Supplements validation');
checkFileContains('src/middleware/validation.js', 'amount is required when payment_type is "money"', 'Money amount validation');

// 4. Check Routes
checkFile('src/routes/payments.js', 'Payments routes file exists');
checkFileContains('src/routes/payments.js', "router.get('/', getAllPayments)", 'GET /api/payments route');
checkFileContains('src/routes/payments.js', "router.get('/:id'", 'GET /api/payments/:id route');
checkFileContains('src/routes/payments.js', "router.post('/'", 'POST /api/payments route');
checkFileContains('src/routes/payments.js', "router.put('/:id'", 'PUT /api/payments/:id route');
checkFileContains('src/routes/payments.js', "router.delete('/:id'", 'DELETE /api/payments/:id route');
checkFileContains('src/routes/payments.js', "router.get('/totals/:client_id'", 'GET /api/payments/totals/:client_id route');

// 5. Check App.js Integration
checkFileContains('src/app.js', "require('./routes/payments')", 'Payments routes imported in app.js');
checkFileContains('src/app.js', "/api/payments", 'Payments routes mounted in app.js');

// 6. Check Migration Files
checkFile('src/migrations/002_update_payment_types.sql', 'Payment types migration exists');
checkFile('update-payment-schema.js', 'Schema update script exists');

// 7. Check Test Files
checkFile('test-payments-api.js', 'Model test script exists');
checkFile('test-http-api.sh', 'HTTP API test script exists');

// Print results
console.log('\n=== Verification Results ===\n');

checks.forEach((check, index) => {
  const icon = check.passed ? '✓' : '✗';
  const status = check.passed ? 'PASS' : 'FAIL';
  console.log(`${icon} [${status}] ${check.description}`);
  if (!check.passed && check.error) {
    console.log(`    Error: ${check.error}`);
  }
});

console.log(`\n=== Summary ===`);
console.log(`Total checks: ${checks.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success rate: ${((passed / checks.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n✓ All implementation checks passed!');
  console.log('\nNext steps:');
  console.log('1. Restart the server: npm start');
  console.log('2. Test the API endpoints using curl or the test scripts');
  console.log('3. Verify HTTP endpoints with: bash test-http-api.sh');
} else {
  console.log('\n✗ Some checks failed. Please review the errors above.');
  process.exit(1);
}
