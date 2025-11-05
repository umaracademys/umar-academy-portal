#!/usr/bin/env node

/**
 * Verify QPC v4 layout database file
 */

import { Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../src/data/layouts/qpc-v4-tajweed-15-lines.db');

console.log('🔍 Verifying QPC v4 layout database...\n');

// Check if file exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ File not found:', DB_PATH);
  console.log('\n📥 Please download the file first:');
  console.log('   1. Visit: https://qul.tarteel.ai/resources/mushaf-layout/19?page=');
  console.log('   2. Sign in and click "Download sqlite"');
  console.log('   3. Save to:', DB_PATH);
  process.exit(1);
}

// Check file size
const stats = fs.statSync(DB_PATH);
if (stats.size === 0) {
  console.error('❌ File is empty (0 bytes)');
  console.log('\n📥 Please download the file again:');
  console.log('   1. Visit: https://qul.tarteel.ai/resources/mushaf-layout/19?page=');
  console.log('   2. Sign in and click "Download sqlite"');
  console.log('   3. Save to:', DB_PATH);
  process.exit(1);
}

console.log(`✅ File exists: ${DB_PATH}`);
console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);

try {
  const db = new Database(DB_PATH, { readonly: true });
  
  // Check tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📊 Tables found:', tables.map(t => t.name).join(', '));
  
  // Check page count
  const pageCount = db.prepare("SELECT COUNT(DISTINCT page_number) as count FROM pages").get();
  console.log(`📄 Total pages: ${pageCount.count}`);
  
  // Check line count
  const lineCount = db.prepare("SELECT COUNT(*) as count FROM pages").get();
  console.log(`📝 Total lines: ${lineCount.count}`);
  
  // Check sample data
  const sample = db.prepare("SELECT * FROM pages WHERE page_number = 1 LIMIT 3").all();
  console.log('\n📋 Sample data (page 1, first 3 lines):');
  sample.forEach(line => {
    console.log(`   Line ${line.line_number}: ${line.line_type} (words ${line.first_word_id}-${line.last_word_id})`);
  });
  
  // Check info table if exists
  if (tables.some(t => t.name === 'info')) {
    const info = db.prepare("SELECT * FROM info").all();
    console.log('\nℹ️  Database info:');
    info.forEach(row => {
      console.log(`   ${row.key}: ${row.value}`);
    });
  }
  
  db.close();
  console.log('\n✅ Database verification complete!');
  
} catch (error) {
  console.error('❌ Error reading database:', error.message);
  console.log('\n📥 The file may be corrupted. Please download again:');
  console.log('   1. Visit: https://qul.tarteel.ai/resources/mushaf-layout/19?page=');
  console.log('   2. Sign in and click "Download sqlite"');
  console.log('   3. Save to:', DB_PATH);
  process.exit(1);
}

