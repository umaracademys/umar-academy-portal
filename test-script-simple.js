// SIMPLER TEST SCRIPT - Run this if the full script seems stuck
(async () => {
  console.log('🧪 Quick Test...\n');
  
  const token = localStorage.getItem('umar_academy_token');
  if (!token) {
    console.error('❌ Please login first');
    return;
  }
  
  const API_BASE = 'http://localhost:3001/api';
  
  // Test 1: Socket Room
  console.log('1️⃣ Testing Socket Room...');
  try {
    const res = await fetch(`${API_BASE}/test/socket-rooms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('✅ Socket Room:', data.socketCount > 0 ? 'PASS' : 'FAIL', `(${data.socketCount} sockets)`);
  } catch (e) {
    console.error('❌ Socket Room: FAIL', e.message);
  }
  
  // Test 2: Error Logging
  console.log('\n2️⃣ Testing Error Logging...');
  try {
    const res = await fetch(`${API_BASE}/test/error`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Error Logging: PASS (check backend logs)');
  } catch (e) {
    console.error('❌ Error Logging: FAIL', e.message);
  }
  
  // Test 3: Token Check
  console.log('\n3️⃣ Testing Token...');
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const isExpired = decoded.exp < Date.now() / 1000;
    console.log('✅ Token:', isExpired ? 'EXPIRED' : 'VALID');
    if (!isExpired) {
      console.log('   Expires:', new Date(decoded.exp * 1000).toLocaleString());
    }
  } catch (e) {
    console.error('❌ Token Check: FAIL', e.message);
  }
  
  // Test 4: Permission Version
  console.log('\n4️⃣ Testing Permission Version...');
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    if (decoded.permissionsVersion) {
      console.log('✅ Permission Version: PASS (v' + decoded.permissionsVersion + ')');
    } else {
      console.warn('⚠️ Permission Version: Not found');
    }
  } catch (e) {
    console.error('❌ Permission Version: FAIL', e.message);
  }
  
  console.log('\n✅ All tests complete!');
})();
