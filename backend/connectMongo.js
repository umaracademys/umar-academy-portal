/**
 * Simple MongoDB connection script
 * Connects to MongoDB and provides interactive shell
 * 
 * Usage: node backend/connectMongo.js
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

async function connectMongo() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!\n');
    
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📊 Database: ${dbName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}\n`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections (${collections.length}):`);
    collections.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.name}`);
    });
    
    console.log('\n💡 You can now use mongoose models to query the database.');
    console.log('   Example: const User = mongoose.model("User");');
    console.log('   Example: const users = await User.find({});\n');
    
    // Keep connection alive
    console.log('✅ Connection established. Script will keep connection alive.');
    console.log('   Press Ctrl+C to disconnect.\n');
    
    // Don't disconnect - keep connection alive
    // await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('   💡 Check your MongoDB credentials');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('   💡 Make sure MongoDB is running');
      console.error('   💡 Try: brew services start mongodb-community (on macOS)');
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Disconnecting from MongoDB...');
  await mongoose.disconnect();
  console.log('✅ Disconnected');
  process.exit(0);
});

connectMongo();
