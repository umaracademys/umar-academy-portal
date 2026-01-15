// COMPLETE TEST SCRIPT - Copy and paste ALL of this into browser console
(async () => {
  console.log('🧪 Testing All Phases...\n');
  
  const token = localStorage.getItem('umar_academy_token');
  if (!token) {
    console.error('❌ Please login first');
    return;
  }
  
  const API_BASE = 'http://localhost:3001/api';
  let passed = 0;
  let failed = 0;
  
  // Phase 1: Socket Room
  console.log('📋 Phase 1: Socket.IO & Error Logging');
  console.log('─────────────────────────────────────');
  try {
    const res = await fetch(`${API_BASE}/test/socket-rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.socketCount > 0) {
        console.log(`✅ Socket Room: PASS (${data.socketCount} socket(s) in ${data.expectedRoom})`);
        passed++;
      } else {
        console.warn(`⚠️ Socket Room: FAIL (No sockets found)`);
        failed++;
      }
    } else {
      console.error('❌ Socket Room: FAIL (Request failed)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Socket Room: FAIL', e.message);
    failed++;
  }
  
  // Phase 1: Error Logging
  try {
    const res = await fetch(`${API_BASE}/test/error`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      console.log('✅ Error Logging: PASS (Check backend logs for structured format)');
      passed++;
    } else {
      console.warn('⚠️ Error Logging: FAIL (Unexpected success)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Error Logging: FAIL', e.message);
    failed++;
  }
  
  // Phase 2: Token Expiration
  console.log('\n📋 Phase 2: Auth & Token Sync');
  console.log('─────────────────────────────');
  try {
    const base64Url = token.split('.')[1];
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
      console.log(`✅ Token Check: PASS (Valid for ${minutesUntilExpiry} minutes)`);
      console.log(`   Expires: ${new Date(decoded.exp * 1000).toLocaleString()}`);
      passed++;
    } else {
      console.warn('⚠️ Token Check: FAIL (Token is expired)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Token Check: FAIL', e.message);
    failed++;
  }
  
  // Phase 4: Permission Version
  console.log('\n📋 Phase 4: Permission Management');
  console.log('──────────────────────────────────');
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    
    if (decoded.permissionsVersion) {
      console.log(`✅ Permission Version: PASS (v${decoded.permissionsVersion})`);
      if (decoded.permissions) {
        const permCount = Object.keys(decoded.permissions).length;
        const enabledCount = Object.values(decoded.permissions).filter(v => v === true).length;
        console.log(`   Permissions: ${enabledCount}/${permCount} enabled`);
      }
      passed++;
    } else {
      console.warn('⚠️ Permission Version: FAIL (Not found in token)');
      failed++;
    }
  } catch (e) {
    console.error('❌ Permission Version: FAIL', e.message);
    failed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('────────────────');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  const total = passed + failed;
  if (total > 0) {
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  }
  
  if (failed === 0 && total > 0) {
    console.log('\n🎉 All tests passed! Your patches are working correctly.');
  } else if (failed > 0) {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
  
  console.log('\n📝 Manual Tests:');
  console.log('   1. Multi-tab sync: Open 2 tabs, login in one');
  console.log('   2. Permission update: Update permissions, check token invalidation');
  console.log('   3. Socket reconnection: Change token, check reconnection');
})();
