/**
 * Phase 1 Patch Testing Script
 * Run this in browser console to test all Phase 1 patches
 */

// Get token from localStorage
const token = localStorage.getItem('umar_academy_token');
const API_BASE = 'http://localhost:3001/api';

if (!token) {
  console.error('❌ No token found. Please login first.');
} else {
  console.log('✅ Token found, starting Phase 1 tests...\n');
  
  // Test 1: Check Socket Room Membership
  async function testSocketRooms() {
    console.log('📋 Test 1: Socket Room Membership');
    console.log('─────────────────────────────────');
    
    try {
      const response = await fetch(`${API_BASE}/test/socket-rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Socket Room Test Result:', data);
        if (data.socketCount > 0) {
          console.log(`✅ SUCCESS: ${data.socketCount} socket(s) in room ${data.expectedRoom}`);
        } else {
          console.warn(`⚠️ WARNING: No sockets found in room ${data.expectedRoom}`);
        }
      } else {
        const error = await response.text();
        console.error('❌ Socket Room Test Failed:', error);
      }
    } catch (error) {
      console.error('❌ Socket Room Test Error:', error);
    }
    console.log('');
  }
  
  // Test 2: Test Error Logging
  async function testErrorLogging() {
    console.log('📋 Test 2: Error Logging');
    console.log('─────────────────────────────────');
    
    try {
      const response = await fetch(`${API_BASE}/test/error`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('✅ Error Response Received:', errorData);
        console.log('✅ Check backend console for structured error log');
        console.log('   Look for: "❌ ERROR:" with JSON structure');
      } else {
        console.warn('⚠️ Unexpected: Error endpoint returned OK');
      }
    } catch (error) {
      console.error('❌ Error Logging Test Error:', error);
    }
    console.log('');
  }
  
  // Test 3: Test Token Expiration Detection
  async function testTokenExpiration() {
    console.log('📋 Test 3: Token Expiration Detection');
    console.log('─────────────────────────────────');
    
    try {
      // Decode token to check expiration
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        
        if (decoded.exp) {
          const expirationDate = new Date(decoded.exp * 1000);
          const now = new Date();
          const isExpired = decoded.exp < Date.now() / 1000;
          const timeUntilExpiry = expirationDate - now;
          
          console.log('Token Info:');
          console.log(`  - Issued: ${new Date(decoded.iat * 1000).toLocaleString()}`);
          console.log(`  - Expires: ${expirationDate.toLocaleString()}`);
          console.log(`  - Time until expiry: ${Math.floor(timeUntilExpiry / 1000 / 60)} minutes`);
          console.log(`  - Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
          
          if (isExpired) {
            console.warn('⚠️ Token is expired - Socket.IO should disconnect');
          } else {
            console.log('✅ Token is valid - Socket.IO should remain connected');
          }
        } else {
          console.warn('⚠️ Token has no expiration field');
        }
      }
    } catch (error) {
      console.error('❌ Token Expiration Test Error:', error);
    }
    console.log('');
  }
  
  // Run all tests
  (async () => {
    await testSocketRooms();
    await testErrorLogging();
    await testTokenExpiration();
    
    console.log('✅ Phase 1 Testing Complete!');
    console.log('📝 Next Steps:');
    console.log('   1. Check backend console for error logs');
    console.log('   2. Check backend console for socket connection logs');
    console.log('   3. Verify Socket.IO reconnects when token changes');
  })();
}
