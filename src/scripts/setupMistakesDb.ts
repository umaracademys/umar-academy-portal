import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database connection
const dbPath = path.join(__dirname, '../../umar_academy.db');
const db = new sqlite3.Database(dbPath);

// Promisify database methods for easier async/await usage
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

async function setupMistakesDatabase() {
  try {
    console.log(`📁 Database path: ${dbPath}`);

    // Create mistakes table
    await dbRun(`CREATE TABLE IF NOT EXISTS mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      word_id INTEGER,
      mistake_type TEXT,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ Mistakes table created successfully');

    // Insert sample mistake
    await dbRun(
      'INSERT INTO mistakes (student_id, word_id, mistake_type, note) VALUES (?, ?, ?, ?)',
      [1, 42, 'Memory Mistake', 'mispronounced']
    );

    console.log('✅ Sample mistake inserted');

    // Query to verify
    const mistakes = await dbAll('SELECT * FROM mistakes');
    console.log('📊 Current mistakes:', mistakes);

    // Close database
    return new Promise<void>((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('✅ Database connection closed');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    db.close();
    throw error;
  }
}

// Run setup
setupMistakesDatabase()
  .then(() => {
    console.log('✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

