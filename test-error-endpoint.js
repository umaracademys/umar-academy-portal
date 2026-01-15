// Quick test for error endpoint - Run this in browser console
(async () => {
  const token = localStorage.getItem('umar_academy_token');
  if (!token) {
    console.error('❌ Please login first');
    return;
  }
  
  console.log('Testing Error Endpoint...');
  console.log('Token exists:', !!token);
  
  try {
    const res = await fetch('http://localhost:3001/api/test/error', {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', data);
    
    if (!res.ok) {
      console.log('✅ Error endpoint working (returned error as expected)');
    } else {
      console.warn('⚠️ Unexpected: endpoint returned OK');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.name === 'TimeoutError') {
      console.error('Request timed out - backend might not be responding');
    }
  }
})();
