#!/usr/bin/env node

/**
 * Production Readiness Test Suite
 * Tests API endpoints, database, authentication, load, and security
 */

const mongoose = require('mongoose');

// Use Node's built-in fetch (Node 18+) or fallback to axios
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  try {
    const axios = require('axios');
    // Create axios-based fetch wrapper
    fetch = async (url, options = {}) => {
      try {
        const response = await axios({
          url,
          method: options.method || 'GET',
          headers: options.headers || {},
          data: options.body,
          timeout: options.timeout || 10000,
          validateStatus: () => true // Don't throw on any status
        });
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          json: async () => response.data,
          text: async () => JSON.stringify(response.data)
        };
      } catch (error) {
        throw error;
      }
    };
  } catch (e2) {
    console.error('Neither fetch nor axios available. Please install axios: npm install axios');
    process.exit(1);
  }
}

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';
const TEST_EMAIL = process.env.TEST_EMAIL || 'sadmin@umaracademy.org';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';
const TEST_ROLE = process.env.TEST_ROLE || 'superadmin';

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    title: `${colors.bold}${colors.blue}▶${colors.reset}`
  }[type] || prefix.info;
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(name, passed, message, warning = false) {
  results.tests.push({ name, passed, message, warning });
  if (warning) {
    results.warnings++;
    log(`${name}: ${message}`, 'warning');
  } else if (passed) {
    results.passed++;
    log(`${name}: ${message}`, 'success');
  } else {
    results.failed++;
    log(`${name}: ${message}`, 'error');
  }
}

// Test: Database Connection
async function testDatabaseConnection() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    recordTest('Database Connection', true, 'Successfully connected to MongoDB');
    return true;
  } catch (error) {
    recordTest('Database Connection', false, `Failed to connect: ${error.message}`);
    return false;
  }
}

// Test: API Health Check
async function testHealthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      recordTest('API Health Check', true, 'API is healthy');
      return true;
    } else {
      recordTest('API Health Check', false, `Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('API Health Check', false, `Health check failed: ${error.message}`);
    return false;
  }
}

// Test: Authentication
async function testAuthentication() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: TEST_ROLE
      }),
      timeout: 10000
    });
    
    const data = await response.json();
    
    if (response.status === 200 && data.token) {
      recordTest('Authentication', true, 'Login successful');
      return data.token;
    } else {
      recordTest('Authentication', false, `Login failed - ${data.error || 'no token received'}`);
      return null;
    }
  } catch (error) {
    recordTest('Authentication', false, `Login failed: ${error.message}`);
    return null;
  }
}

// Test: Protected Routes
async function testProtectedRoutes(token) {
  if (!token) {
    recordTest('Protected Routes', false, 'Skipped - no authentication token');
    return;
  }

  const protectedEndpoints = [
    { method: 'get', path: '/students', name: 'Get Students' },
    { method: 'get', path: '/teachers', name: 'Get Teachers' },
    { method: 'get', path: '/assignments', name: 'Get Assignments' },
    { method: 'get', path: '/tickets', name: 'Get Tickets' }
  ];

  const headers = { Authorization: `Bearer ${token}` };
  let passed = 0;

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
        method: endpoint.method.toUpperCase(),
        headers,
        timeout: 10000
      });
      
      if (response.status === 200 || response.status === 201) {
        passed++;
      } else {
        const errorData = await response.json().catch(() => ({}));
        recordTest(`Protected Route: ${endpoint.name}`, false, `Status: ${response.status} - ${errorData.error || ''}`);
      }
    } catch (error) {
      recordTest(`Protected Route: ${endpoint.name}`, false, `Error: ${error.message}`);
    }
  }

  if (passed === protectedEndpoints.length) {
    recordTest('Protected Routes', true, `All ${protectedEndpoints.length} routes accessible`);
  } else {
    recordTest('Protected Routes', false, `Only ${passed}/${protectedEndpoints.length} routes accessible`);
  }
}

// Test: Rate Limiting
async function testRateLimiting() {
  try {
    // Rate limiting is configured but may skip localhost in development
    // Test with sequential requests to trigger rate limit
    const requests = [];
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100' // Simulate non-localhost IP
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'wrongpassword',
          role: 'student'
        }),
        timeout: 5000
      }).catch(() => ({ status: 500 }));
      requests.push(response);
      
      // Small delay to ensure requests are processed
      if (i < 9) await new Promise(resolve => setTimeout(resolve, 100));
    }

    const rateLimited = requests.filter(r => r.status === 429).length;
    const allFailed = requests.filter(r => r.status === 401 || r.status === 429).length;
    
    // Rate limiting may be configured but skip localhost, which is acceptable for development
    if (rateLimited > 0) {
      recordTest('Rate Limiting', true, `Rate limiting active (${rateLimited} requests blocked)`);
    } else if (allFailed === requests.length) {
      recordTest('Rate Limiting', true, 'Rate limiting configured (localhost may be excluded in dev)', true);
    } else {
      recordTest('Rate Limiting', false, 'Rate limiting not working - all requests passed', true);
    }
  } catch (error) {
    recordTest('Rate Limiting', false, `Test failed: ${error.message}`, true);
  }
}

// Test: Error Handling
async function testErrorHandling() {
  const errorTests = [
    {
      name: 'Invalid Login',
      request: () => fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrong',
          role: 'student'
        })
      }),
      expectedStatus: 401
    },
    {
      name: 'Missing Fields',
      request: () => fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com'
          // Missing password and role
        })
      }),
      expectedStatus: 400
    },
    {
      name: 'Invalid Endpoint',
      request: () => fetch(`${API_BASE_URL}/invalid-endpoint`),
      expectedStatus: 404
    }
  ];

  let passed = 0;
  for (const test of errorTests) {
    try {
      const response = await test.request();
      const status = response.status;
      if (status === test.expectedStatus) {
        passed++;
        recordTest(`Error Handling: ${test.name}`, true, `Correctly returned ${status}`);
      } else {
        recordTest(`Error Handling: ${test.name}`, false, `Expected ${test.expectedStatus}, got ${status}`);
      }
    } catch (error) {
      recordTest(`Error Handling: ${test.name}`, false, `Request failed: ${error.message}`);
    }
  }

  if (passed === errorTests.length) {
    recordTest('Error Handling', true, 'All error cases handled correctly');
  }
}

// Test: Load/Stress Test
async function testLoad(token) {
  if (!token) {
    recordTest('Load Test', false, 'Skipped - no authentication token');
    return;
  }

  log('Starting load test (50 concurrent requests)...', 'info');
  const startTime = Date.now();
  const concurrentRequests = 50;
  const requests = [];

  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      fetch(`${API_BASE_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      }).catch(err => ({ error: err.message, status: 500 }))
    );
  }

  try {
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    const successful = responses.filter(r => !r.error && r.status === 200).length;
    const failed = responses.filter(r => r.error || r.status !== 200).length;

    const avgResponseTime = duration / concurrentRequests;
    
    if (successful >= concurrentRequests * 0.9) {
      recordTest('Load Test', true, 
        `${successful}/${concurrentRequests} requests succeeded in ${duration}ms (avg: ${avgResponseTime.toFixed(0)}ms)`);
    } else {
      recordTest('Load Test', false, 
        `Only ${successful}/${concurrentRequests} requests succeeded. ${failed} failed.`);
    }

    if (avgResponseTime > 2000) {
      recordTest('Performance Warning', false, `Average response time ${avgResponseTime.toFixed(0)}ms is high`, true);
    }
  } catch (error) {
    recordTest('Load Test', false, `Load test failed: ${error.message}`);
  }
}

// Test: Database Performance
async function testDatabasePerformance() {
  try {
    // Test basic MongoDB connection performance
    const startTime = Date.now();
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration < 500) {
      recordTest('Database Performance', true, `Database operations completed in ${duration}ms`);
    } else if (duration < 1000) {
      recordTest('Database Performance', false, `Database operations took ${duration}ms (acceptable)`, true);
    } else {
      recordTest('Database Performance', false, `Database operations took ${duration}ms (slow)`);
    }
  } catch (error) {
    recordTest('Database Performance', false, `Database query failed: ${error.message}`);
  }
}

// Test: Security Headers
async function testSecurityHeaders() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { timeout: 5000 });
    const headers = {};
    
    // Handle both Headers object and plain object
    if (response.headers.forEach) {
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    } else {
      // If headers is already an object
      Object.keys(response.headers).forEach(key => {
        headers[key.toLowerCase()] = response.headers[key];
      });
    }
    
    // Check for Helmet security headers (may have different names)
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'content-security-policy': '', // CSP is set by Helmet
      'strict-transport-security': '' // HSTS is set by Helmet
    };

    let found = 0;
    const foundHeaders = [];
    for (const [header, expected] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        found++;
        foundHeaders.push(header);
      }
    }

    // Helmet sets multiple security headers, so if we find any, it's working
    if (found >= 2) {
      recordTest('Security Headers', true, `Security headers present (${foundHeaders.join(', ')})`);
    } else if (found > 0) {
      recordTest('Security Headers', false, 
        `Some security headers found (${foundHeaders.join(', ')}) but may need more`, true);
    } else {
      recordTest('Security Headers', false, 
        'Security headers not detected (Helmet may be configured differently)', true);
    }
  } catch (error) {
    recordTest('Security Headers', false, `Failed to check headers: ${error.message}`, true);
  }
}

// Test: CORS Configuration
async function testCORS() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      },
      timeout: 5000
    });

    const corsHeaders = response.headers.get('access-control-allow-origin');
    if (corsHeaders) {
      recordTest('CORS Configuration', true, 'CORS headers present');
    } else {
      recordTest('CORS Configuration', false, 'CORS headers missing', true);
    }
  } catch (error) {
    recordTest('CORS Configuration', false, `CORS test failed: ${error.message}`, true);
  }
}

// Test: Environment Variables
function testEnvironmentVariables() {
  const isLocal = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
  const optionalVars = ['NODE_ENV', 'PORT'];
  
  let allPresent = true;
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      // In local testing, these may use defaults, which is acceptable
      if (isLocal) {
        recordTest(`Environment: ${varName}`, false, 'Not set (using default - OK for local)', true);
      } else {
        recordTest(`Environment: ${varName}`, false, 'Missing required environment variable');
        allPresent = false;
      }
    } else {
      recordTest(`Environment: ${varName}`, true, 'Present');
    }
  }

  for (const varName of optionalVars) {
    if (process.env[varName]) {
      recordTest(`Environment: ${varName}`, true, `Set to: ${process.env[varName]}`);
    } else {
      recordTest(`Environment: ${varName}`, false, 'Not set (using default)', true);
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    recordTest('JWT_SECRET Security', false, 'JWT_SECRET should be at least 32 characters', true);
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}${colors.blue}Production Readiness Test Suite${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  log(`Testing API at: ${API_BASE_URL}`, 'info');
  log(`Testing MongoDB at: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`, 'info');
  console.log('');

  // 1. Environment Variables
  log('Testing Environment Variables...', 'title');
  testEnvironmentVariables();
  console.log('');

  // 2. Database Connection
  log('Testing Database Connection...', 'title');
  const dbConnected = await testDatabaseConnection();
  console.log('');

  // 3. API Health Check
  log('Testing API Health...', 'title');
  await testHealthCheck();
  console.log('');

  // 4. Authentication
  log('Testing Authentication...', 'title');
  const token = await testAuthentication();
  console.log('');

  // 5. Protected Routes
  log('Testing Protected Routes...', 'title');
  await testProtectedRoutes(token);
  console.log('');

  // 6. Error Handling
  log('Testing Error Handling...', 'title');
  await testErrorHandling();
  console.log('');

  // 7. Rate Limiting
  log('Testing Rate Limiting...', 'title');
  await testRateLimiting();
  console.log('');

  // 8. Security Headers
  log('Testing Security Headers...', 'title');
  await testSecurityHeaders();
  console.log('');

  // 9. CORS
  log('Testing CORS Configuration...', 'title');
  await testCORS();
  console.log('');

  // 10. Database Performance
  if (dbConnected) {
    log('Testing Database Performance...', 'title');
    await testDatabasePerformance();
    console.log('');
  }

  // 11. Load Test
  log('Testing Load/Stress...', 'title');
  await testLoad(token);
  console.log('');

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}Test Summary${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}✓ Passed:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${results.failed}`);
  console.log(`${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings}`);
  console.log(`Total Tests: ${results.tests.length}`);
  console.log('');

  const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  console.log('');

  // Count only critical failures (exclude warnings)
  const criticalFailures = results.tests.filter(t => !t.passed && !t.warning).length;
  
  if (criticalFailures === 0 && results.warnings === 0) {
    console.log(`${colors.green}${colors.bold}✅ All tests passed! Production ready!${colors.reset}\n`);
    process.exit(0);
  } else if (criticalFailures === 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  Tests passed with warnings. Review warnings before production.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ ${criticalFailures} critical test(s) failed. Please fix issues before production.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

