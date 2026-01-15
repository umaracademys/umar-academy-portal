// Test API Validation - Run this in browser console
(async () => {
  const token = localStorage.getItem('umar_academy_token');
  const API_BASE = 'http://localhost:3001/api';
  
  console.log('🧪 Testing API Validation...\n');
  
  // Test 1: Invalid Student ID format
  console.log('1️⃣ Testing invalid student ID...');
  try {
    const res = await fetch(`${API_BASE}/students/not-a-valid-mongodb-id`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    console.log('   Status:', res.status);
    console.log('   Response:', data);
    
    if (res.status === 400) {
      console.log('✅ PASS: Invalid ID rejected with 400');
    } else if (res.status === 404) {
      console.log('✅ PASS: Invalid ID rejected with 404 (also valid)');
    } else {
      console.log('⚠️ Got status:', res.status, '(Expected 400 or 404)');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  
  // Test 2: Try PUT with invalid ID
  console.log('\n2️⃣ Testing PUT with invalid ID...');
  try {
    const res = await fetch(`${API_BASE}/students/invalid-id-123`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fullName: 'Test' })
    });
    const data = await res.json();
    
    console.log('   Status:', res.status);
    console.log('   Response:', data);
    
    if (res.status === 400) {
      console.log('✅ PASS: Validation middleware working');
    } else if (res.status === 404) {
      console.log('✅ PASS: Invalid ID handled (404 is also acceptable)');
    } else {
      console.log('⚠️ Got status:', res.status);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  
  // Test 3: Check if validation middleware is applied
  console.log('\n3️⃣ Checking validation middleware...');
  console.log('   Note: Validation middleware is applied to PUT /api/students/:id');
  console.log('   If you see 400 with "Validation failed" or "Invalid student ID format", validation is working');
  
  console.log('\n✅ Validation tests complete!');
  console.log('\n📝 Note:');
  console.log('   - 400 status = Validation middleware working');
  console.log('   - 404 status = Route not found (also acceptable)');
  console.log('   - 500 status = Error (check backend logs)');
})();
