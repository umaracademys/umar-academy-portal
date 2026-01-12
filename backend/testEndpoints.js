/**
 * Test script to verify all assignment and ticket endpoints are working
 * 
 * Usage: 
 *   node backend/testEndpoints.js
 * 
 * Make sure to set MONGODB_URI and JWT_SECRET in .env or as environment variables
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test user (you can modify this to use a real user from your database)
const TEST_USER = {
  userId: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  name: 'Test Admin'
};

// Generate test token
function generateTestToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Test endpoint
async function testEndpoint(method, path, token, body = null) {
  try {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Assignment and Ticket Endpoints\n');
  console.log('='.repeat(60));
  
  // Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
  
  // Generate test token
  const token = generateTestToken(TEST_USER);
  console.log('🔑 Generated test token\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test Assignment Endpoints
  console.log('📋 Testing Assignment Endpoints:');
  console.log('-'.repeat(60));
  
  // 1. GET /api/assignments
  console.log('\n1. GET /api/assignments');
  const assignmentsGet = await testEndpoint('GET', '/assignments', token);
  if (assignmentsGet.success) {
    console.log('   ✅ PASSED - Status:', assignmentsGet.status);
    console.log('   📊 Found', Array.isArray(assignmentsGet.data) ? assignmentsGet.data.length : 0, 'assignments');
    results.passed++;
  } else {
    console.log('   ❌ FAILED - Status:', assignmentsGet.status);
    console.log('   Error:', assignmentsGet.error || assignmentsGet.data?.error);
    results.failed++;
    results.errors.push('GET /api/assignments: ' + (assignmentsGet.error || assignmentsGet.data?.error));
  }
  
  // 2. GET /api/assignments/me (for students)
  console.log('\n2. GET /api/assignments/me');
  const assignmentsMe = await testEndpoint('GET', '/assignments/me', token);
  if (assignmentsMe.success || assignmentsMe.status === 403) {
    console.log('   ✅ PASSED - Status:', assignmentsMe.status, '(403 expected for non-student)');
    results.passed++;
  } else {
    console.log('   ❌ FAILED - Status:', assignmentsMe.status);
    console.log('   Error:', assignmentsMe.error || assignmentsMe.data?.error);
    results.failed++;
    results.errors.push('GET /api/assignments/me: ' + (assignmentsMe.error || assignmentsMe.data?.error));
  }
  
  // 3. POST /api/assignments (create - will need valid data)
  console.log('\n3. POST /api/assignments');
  console.log('   ⚠️  SKIPPED - Requires valid studentId and assignment data');
  console.log('   💡 To test: Create a test assignment with valid studentId');
  
  // 4. PUT /api/assignments/:id (update - will need valid assignment ID)
  console.log('\n4. PUT /api/assignments/:id');
  console.log('   ⚠️  SKIPPED - Requires valid assignment ID');
  console.log('   💡 To test: Update an existing assignment');
  
  // Test Ticket Endpoints
  console.log('\n\n🎫 Testing Ticket Endpoints:');
  console.log('-'.repeat(60));
  
  // 5. GET /api/tickets
  console.log('\n5. GET /api/tickets');
  const ticketsGet = await testEndpoint('GET', '/tickets', token);
  if (ticketsGet.success) {
    console.log('   ✅ PASSED - Status:', ticketsGet.status);
    console.log('   📊 Found', Array.isArray(ticketsGet.data) ? ticketsGet.data.length : 0, 'tickets');
    results.passed++;
  } else {
    console.log('   ❌ FAILED - Status:', ticketsGet.status);
    console.log('   Error:', ticketsGet.error || ticketsGet.data?.error);
    results.failed++;
    results.errors.push('GET /api/tickets: ' + (ticketsGet.error || ticketsGet.data?.error));
  }
  
  // 6. GET /api/tickets/pending-review
  console.log('\n6. GET /api/tickets/pending-review');
  const ticketsPending = await testEndpoint('GET', '/tickets/pending-review', token);
  if (ticketsPending.success) {
    console.log('   ✅ PASSED - Status:', ticketsPending.status);
    console.log('   📊 Found', Array.isArray(ticketsPending.data) ? ticketsPending.data.length : 0, 'pending tickets');
    results.passed++;
  } else {
    console.log('   ❌ FAILED - Status:', ticketsPending.status);
    console.log('   Error:', ticketsPending.error || ticketsPending.data?.error);
    results.failed++;
    results.errors.push('GET /api/tickets/pending-review: ' + (ticketsPending.error || ticketsPending.data?.error));
  }
  
  // 7. POST /api/tickets/:id/approve-send (will need valid ticket ID)
  console.log('\n7. POST /api/tickets/:id/approve-send');
  console.log('   ⚠️  SKIPPED - Requires valid ticket ID');
  console.log('   💡 To test: Approve an existing ticket');
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📋 Total: ${results.passed + results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (results.failed === 0) {
    console.log('\n✅ All tested endpoints are working!');
  } else {
    console.log('\n⚠️  Some endpoints failed. Check errors above.');
  }
  
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
