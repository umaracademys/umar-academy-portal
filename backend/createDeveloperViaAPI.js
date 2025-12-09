/**
 * Script to create a developer account via the production API
 * 
 * This script creates the developer account by calling the production API endpoint.
 * You need to be logged in as a superadmin to use this.
 * 
 * Usage: 
 *   1. First, get a JWT token from logging in as superadmin
 *   2. Then run: API_TOKEN="your-jwt-token" node backend/createDeveloperViaAPI.js
 * 
 * OR use this script to create it directly in MongoDB if you have the connection string.
 */

const axios = require('axios');

const PRODUCTION_API = 'https://umar-academy-backend.onrender.com/api';
const API_TOKEN = process.env.API_TOKEN; // JWT token from superadmin login

async function createDeveloperViaAPI() {
  try {
    if (!API_TOKEN) {
      console.error('❌ Error: API_TOKEN environment variable is required!');
      console.error('\nTo get a token:');
      console.error('  1. Log in to the portal as superadmin');
      console.error('  2. Open browser DevTools > Application > Local Storage');
      console.error('  3. Copy the "umar_academy_token" value');
      console.error('  4. Run: API_TOKEN="your-token" node backend/createDeveloperViaAPI.js');
      console.error('\nAlternatively, use createDeveloperProduction.js with MONGODB_URI');
      process.exit(1);
    }

    console.log('🔌 Connecting to production API...');
    
    // First, check if user already exists
    try {
      const checkResponse = await axios.get(`${PRODUCTION_API}/users`, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      const existingUser = checkResponse.data.find((u: any) => u.email === 'developer@test.com');
      if (existingUser) {
        console.log('⚠️  Developer account already exists!');
        console.log('   Email:', existingUser.email);
        console.log('   Role:', existingUser.role);
        return;
      }
    } catch (error) {
      console.log('ℹ️  Could not check existing users, proceeding...');
    }

    // Create developer user
    console.log('👤 Creating developer account via API...');
    const response = await axios.post(
      `${PRODUCTION_API}/users`,
      {
        name: 'Developer Account',
        email: 'developer@test.com',
        role: 'superadmin',
        password: 'developer123'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Developer account created successfully!');
    console.log('\n📋 Account Details:');
    console.log('   Email: developer@test.com');
    console.log('   Password: developer123');
    console.log('   Role: superadmin');
    
    // Now update the user to add developer flags
    // Note: This requires a PATCH endpoint or direct MongoDB access
    console.log('\n⚠️  Note: You need to manually add isDeveloper: true and isTestAccount: true');
    console.log('   to the user document in MongoDB to enable data masking.');
    console.log('   Or use createDeveloperProduction.js script with MONGODB_URI instead.');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
      if (error.response.status === 401) {
        console.error('   Authentication failed. Check your API_TOKEN.');
      } else if (error.response.status === 409) {
        console.error('   Developer account already exists.');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

createDeveloperViaAPI();

