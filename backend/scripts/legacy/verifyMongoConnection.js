// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Script to verify MongoDB connection status
 * 
 * Usage: node backend/verifyMongoConnection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

async function verifyConnection() {
  try {
    console.log('🔍 Verifying MongoDB connection...');
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };

    // Attempt connection
    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Get connection info
    console.log('\n📊 Connection Information:');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    console.log('   Database:', mongoose.connection.name);
    console.log('   Ready State:', mongoose.connection.readyState === 1 ? 'Connected (1)' : `Disconnected (${mongoose.connection.readyState})`);
    
    // Test ping
    try {
      const pingResult = await mongoose.connection.db.admin().ping();
      console.log('   Ping Test:', '✅ Success', JSON.stringify(pingResult));
    } catch (pingError) {
      console.log('   Ping Test:', '❌ Failed', pingError.message);
    }
    
    // Test a simple query
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const userCount = await User.countDocuments();
    console.log(`\n👥 Users in database: ${userCount}`);
    
    // List collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections: ${collections.length}`);
    if (collections.length > 0) {
      collections.slice(0, 10).forEach(col => {
        console.log(`   - ${col.name}`);
      });
      if (collections.length > 10) {
        console.log(`   ... and ${collections.length - 10} more`);
      }
    }
    
    console.log('\n✅ MongoDB connection verification passed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB connection verification failed!');
    console.error('\nError details:');
    console.error('   Message:', error.message);
    console.error('   Name:', error.name);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Possible issues:');
      console.error('   1. MongoDB server is not running');
      console.error('   2. Connection string is incorrect');
      console.error('   3. Network/firewall blocking the connection');
      console.error('   4. MongoDB credentials are incorrect');
      console.error('   5. MongoDB Atlas IP whitelist may not include your IP');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('\n💡 Authentication failed:');
      console.error('   - Check your MongoDB username and password');
      console.error('   - Verify the database user has proper permissions');
    } else if (error.name === 'MongoNetworkError') {
      console.error('\n💡 Network error:');
      console.error('   - Check if MongoDB server is accessible');
      console.error('   - Verify the host and port are correct');
      console.error('   - Check firewall settings');
    }
    
    console.error('\n📝 Current connection string (masked):');
    console.error(`   ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the verification
verifyConnection();

