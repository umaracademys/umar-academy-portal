import { connectDatabase } from '../config/database';
import { DatabaseService } from '../services/databaseService';
import bcrypt from 'bcryptjs';

const simpleSeed = async () => {
  try {
    await connectDatabase();
    console.log('🌱 Starting simple database seeding...');

    // Create a simple user first
    console.log('👤 Creating a test user...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const testUser = await DatabaseService.createUser({
      fullName: 'Test User',
      email: 'test@umaracademy.com',
      password: hashedPassword,
      role: 'admin',
      avatar: 'https://ui-avatars.com/api/?name=Test+User&background=2E4D32&color=fff'
    });

    console.log('✅ Test user created:', testUser.email);

    // Test getting dashboard stats
    const stats = await DatabaseService.getDashboardStats();
    console.log('📊 Dashboard stats:', stats);

    console.log('🎉 Simple seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in simple seeding:', error);
    process.exit(1);
  }
};

simpleSeed();








