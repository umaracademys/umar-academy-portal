/**
 * Complete Phase 1-4 Test Script
 * Run this in browser console to test all patches
 */

(async () => {
  console.log('🧪 Starting Complete Test Suite...\n');
  
  const token = localStorage.getItem('umar_academy_token');
  if (!token) {
    console.error('❌ No token found. Please login first.');
    return;
  }
  
  const API_BASE = 'http://localhost:3001/api';
  let passed = 0;
  let failed = 0;
  
  // Phase 1: Socket.IO & Error Logging
  console.log('📋 Phase 1: Socket.IO & Error Logging');
  console.log('─────────────────────────────────────');
  
  // Test 1.1: Socket Room
  try {
    const roomRes = await fetch(`${API_BASE}/test/socket-rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (roomRes.ok) {
      const roomData = await roomRes.json();
      if (roomData.socketCount > 0) {
        console.log(`✅ Socket Room: PASS (${roomData.socketCount} socket(s) in ${roomData.expectedRoom})`);
        passed++;
      } else {
        console.warn(`⚠️ Socket Room: FAIL (No sockets found in ${roomData.expectedRoom})`);
        failed++;
      }
    } else {
      console.error('❌ Socket Room: FAIL (Request failed)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Socket Room: FAIL', e);
    failed++;
  }
  
  // Test 1.2: Error Logging
  try {
    const errorRes = await fetch(`${API_BASE}/test/error`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!errorRes.ok) {
      const errorData = await errorRes.json();
      console.log('✅ Error Logging: PASS (Check backend logs for structured format)');
      passed++;
    } else {
      console.warn('⚠️ Error Logging: FAIL (Unexpected success)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Error Logging: FAIL', e);
    failed++;
  }
  
  // Phase 2: Auth & Token Sync
  console.log('\n📋 Phase 2: Auth & Token Sync');
  console.log('─────────────────────────────');
  
  // Test 2.1: Token Expiration Check
  try {
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
      const isExpired = decoded.exp < Date.now() / 1000;
      const minutesUntilExpiry = Math.floor((decoded.exp * 1000 - Date.now()) / 1000 / 60);
      
      if (!isExpired) {
        console.log(`✅ Token Expiration Check: PASS (Valid for ${minutesUntilExpiry} minutes)`);
        console.log(`   Expires: ${new Date(decoded.exp * 1000).toLocaleString()}`);
        passed++;
      } else {
        console.warn('⚠️ Token Expiration Check: FAIL (Token is expired)');
        failed++;
      }
    } else {
      console.error('❌ Token Expiration Check: FAIL (Invalid token format)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Token Expiration Check: FAIL', e);
    failed++;
  }
  
  // Phase 4: Permission Management
  console.log('\n📋 Phase 4: Permission Management');
  console.log('──────────────────────────────────');
  
  // Test 4.1: Permission Version in JWT
  try {
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
      
      if (decoded.permissionsVersion) {
        console.log(`✅ Permission Version in JWT: PASS (Version: ${decoded.permissionsVersion})`);
        passed++;
      } else {
        console.warn('⚠️ Permission Version in JWT: FAIL (Not found in token)');
        failed++;
      }
      
      // Show permissions if available
      if (decoded.permissions) {
        const permCount = Object.keys(decoded.permissions).length;
        const enabledCount = Object.values(decoded.permissions).filter(v => v === true).length;
        console.log(`   Permissions: ${enabledCount}/${permCount} enabled`);
      }
    } else {
      console.error('❌ Permission Version: FAIL (Invalid token format)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Permission Version: FAIL', e);
    failed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('────────────────');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your patches are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
  
  console.log('\n📝 Manual Tests Required:');
  console.log('   1. Multi-tab sync: Open 2 tabs, login in one, check other');
  console.log('   2. Permission update: Update permissions as superadmin, check token invalidation');
  console.log('   3. Schema drift: Create document with unknown fields, check backend logs');
  console.log('   4. Socket reconnection: Change token in localStorage, check reconnection');
})();
