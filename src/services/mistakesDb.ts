import initSqlJs, { Database } from 'sql.js';

let SQL: typeof initSqlJs.SqlJsStatic | null = null;
let db: Database | null = null;

// Initialize SQL.js and create database
export async function initMistakesDatabase(): Promise<Database> {
  if (!SQL) {
    SQL = await initSqlJs({
      // Specify location of sql-wasm.wasm file
      locateFile: (file: string) => {
        // Try to load from node_modules first, then fallback to CDN
        if (file.endsWith('.wasm')) {
          return `https://sql.js.org/dist/${file}`;
        }
        return file;
      }
    });
  }

  if (!db) {
    db = new SQL.Database(); // in-memory DB
    
    // Create mistakes table
    db.run(`
      CREATE TABLE IF NOT EXISTS mistakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        word_id INTEGER,
        word_index INTEGER,
        surah INTEGER,
        ayah INTEGER,
        page INTEGER,
        type TEXT,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    console.log('✅ Mistakes database initialized');
  }

  return db;
}

// Insert a mistake
export async function insertMistake(
  studentId: number,
  wordId: number,
  wordIndex: number,
  surah: number,
  ayah: number,
  page: number,
  type: string,
  note?: string
): Promise<void> {
  const database = await initMistakesDatabase();
  
  database.run(
    `INSERT INTO mistakes (student_id, word_id, word_index, surah, ayah, page, type, note) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [studentId, wordId, wordIndex, surah, ayah, page, type, note || null]
  );
}

// Get all mistakes for a student
export async function getMistakesByStudent(studentId: number): Promise<any[]> {
  const database = await initMistakesDatabase();
  
  const stmt = database.prepare('SELECT * FROM mistakes WHERE student_id = ? ORDER BY created_at DESC');
  stmt.bind([studentId]);
  
  const mistakes: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    mistakes.push(row);
  }
  stmt.free();
  
  return mistakes;
}

// Get mistakes for a specific page
export async function getMistakesByPage(page: number): Promise<any[]> {
  const database = await initMistakesDatabase();
  
  const stmt = database.prepare('SELECT * FROM mistakes WHERE page = ? ORDER BY created_at DESC');
  stmt.bind([page]);
  
  const mistakes: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    mistakes.push(row);
  }
  stmt.free();
  
  return mistakes;
}

// Get all mistakes
export async function getAllMistakes(): Promise<any[]> {
  const database = await initMistakesDatabase();
  
  const stmt = database.prepare('SELECT * FROM mistakes ORDER BY created_at DESC');
  
  const mistakes: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    mistakes.push(row);
  }
  stmt.free();
  
  return mistakes;
}

// Delete a mistake by ID
export async function deleteMistake(id: number): Promise<void> {
  const database = await initMistakesDatabase();
  
  database.run('DELETE FROM mistakes WHERE id = ?', [id]);
}

// Export database to ArrayBuffer (for saving)
export async function exportDatabase(): Promise<ArrayBuffer> {
  const database = await initMistakesDatabase();
  return database.export();
}

// Import database from ArrayBuffer (for loading)
export async function importDatabase(data: ArrayBuffer): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  db = new SQL.Database(new Uint8Array(data));
}

// Close database
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

