/**
 * Script to test MongoDB connection
 * 
 * Usage: node backend/testMongoConnection.js
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB connection...');
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000,
    };

    // Attempt connection
    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Get connection info
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    
    // Get server status
    const serverStatus = await adminDb.serverStatus();
    console.log('\n📊 Server Information:');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    console.log('   Database:', mongoose.connection.name);
    console.log('   Version:', serverStatus.version);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    if (collections.length === 0) {
      console.log('   (No collections found)');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Test a simple query
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const userCount = await User.countDocuments();
    console.log(`\n👥 Users in database: ${userCount}`);
    
    // Check connection state
    console.log('\n🔗 Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n✅ MongoDB connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('\nError details:');
    console.error('   Message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Possible issues:');
      console.error('   1. MongoDB server is not running');
      console.error('   2. Connection string is incorrect');
      console.error('   3. Network/firewall blocking the connection');
      console.error('   4. MongoDB credentials are incorrect');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('\n💡 Authentication failed:');
      console.error('   - Check your MongoDB username and password');
      console.error('   - Verify the database user has proper permissions');
    } else if (error.name === 'MongoNetworkError') {
      console.error('\n💡 Network error:');
      console.error('   - Check if MongoDB server is accessible');
      console.error('   - Verify the host and port are correct');
    }
    
    console.error('\n📝 Current connection string (masked):');
    console.error(`   ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the test
testConnection();

