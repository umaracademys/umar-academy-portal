import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = '/Users/muhammadumar/Downloads/Part 1';
const TARGET_DIR = path.join(__dirname, '..', 'public', 'qaidah2');
const BOOK_NAME = 'qaidah2'; // Part 1 folder contains Part 2 of Qaidah

// Create target directory if it doesn't exist
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`✅ Created directory: ${TARGET_DIR}`);
}

// Get all JPG files from source directory
const files = fs.readdirSync(SOURCE_DIR)
  .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
  .sort((a, b) => {
    // Extract page number from filename
    const pageA = parseInt(a.match(/page-(\d+)/)?.[1] || '0');
    const pageB = parseInt(b.match(/page-(\d+)/)?.[1] || '0');
    return pageA - pageB;
  });

console.log(`📚 Found ${files.length} pages to copy`);

let copied = 0;
let skipped = 0;
let errors = 0;

files.forEach((file, index) => {
  const sourcePath = path.join(SOURCE_DIR, file);
  // Extract page number from filename (e.g., page-0001 -> 1)
  const pageMatch = file.match(/page-(\d+)/);
  const pageNum = pageMatch ? parseInt(pageMatch[1]) : (index + 1);
  
  // Target filename: pageNum.png (or .jpg if keeping JPG)
  const targetFileName = `${pageNum}.jpg`;
  const targetPath = path.join(TARGET_DIR, targetFileName);

  try {
    // Check if file already exists
    if (fs.existsSync(targetPath)) {
      console.log(`⏭️  Skipping ${targetFileName} (already exists)`);
      skipped++;
      return;
    }

    // Copy file
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied: ${file} → ${targetFileName}`);
    copied++;
  } catch (error) {
    console.error(`❌ Error copying ${file}:`, error.message);
    errors++;
  }
});

console.log('\n📊 Summary:');
console.log(`   ✅ Copied: ${copied} files`);
console.log(`   ⏭️  Skipped: ${skipped} files`);
console.log(`   ❌ Errors: ${errors} files`);
console.log(`\n📁 Files are now in: ${TARGET_DIR}`);
console.log(`\n🎉 Done! Your Qaidah pages are ready to use.`);
