import initSqlJs, { Database } from 'sql.js';
import type { LayoutPage, Line, Word } from '../components/InteractiveMushaf';

const LAYOUT_DB_PATH = '/data/layouts/qpc-v1-15-lines.db';
const WORDS_DB_PATH = '/data/glyphs/qpc-v1-glyph-codes-wbw.db';
const FONT_DIR_NAME = encodeURIComponent('QPC V1 Font.woff');

let sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>> | null = null;
let layoutDbPromise: Promise<Database> | null = null;
let wordsDbPromise: Promise<Database> | null = null;
let wordsCachePromise: Promise<Word[]> | null = null;
const loadedFonts = new Map<number, string>();

const locateFile = (file: string) => (file.endsWith('.wasm') ? `https://sql.js.org/dist/${file}` : file);

async function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({ locateFile });
  }
  return sqlJsPromise;
}

async function loadDatabase(path: string, existingPromise: Promise<Database> | null): Promise<Database> {
  if (existingPromise) {
    return existingPromise;
  }
  const SQL = await getSqlJs();
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load database from ${path} (status ${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return new SQL.Database(new Uint8Array(buffer));
}

async function getLayoutDatabase(): Promise<Database> {
  if (!layoutDbPromise) {
    layoutDbPromise = loadDatabase(LAYOUT_DB_PATH, layoutDbPromise);
  }
  return layoutDbPromise;
}

async function getWordsDatabase(): Promise<Database> {
  if (!wordsDbPromise) {
    wordsDbPromise = loadDatabase(WORDS_DB_PATH, wordsDbPromise);
  }
  return wordsDbPromise;
}

export async function getQpcV1Layout(pageNumber: number): Promise<LayoutPage | null> {
  try {
    const db = await getLayoutDatabase();
    const stmt = db.prepare(
      'SELECT page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number FROM pages WHERE page_number = ? ORDER BY line_number ASC'
    );
    stmt.bind([pageNumber]);
    const lines: Line[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      const firstWordRaw = row.first_word_id as number | string | null;
      const lastWordRaw = row.last_word_id as number | string | null;
      const surahRaw = row.surah_number as number | string | null;

      lines.push({
        page_number: Number(row.page_number ?? pageNumber),
        line_number: Number(row.line_number ?? 0),
        line_type: (row.line_type as string) || 'ayah',
        is_centered: Number(row.is_centered) === 1,
        first_word_id:
          firstWordRaw === null || firstWordRaw === '' ? null : Number(firstWordRaw),
        last_word_id:
          lastWordRaw === null || lastWordRaw === '' ? null : Number(lastWordRaw),
        surah_number:
          surahRaw === null || surahRaw === '' ? undefined : Number(surahRaw),
      });
    }

    stmt.free();

    if (lines.length === 0) {
      return null;
    }

    return {
      page_number: pageNumber,
      lines,
      metadata: {
        mushaf_name: 'QPC V1',
        code: 'qpc_v1',
        pages_count: 604,
        lines_per_page: 15,
        font_name: 'QPC V1 Font',
      },
    };
  } catch (error) {
    console.error('Error loading QPC V1 layout:', error);
    return null;
  }
}

async function loadAllQpcWords(): Promise<Word[]> {
  const db = await getWordsDatabase();
  const stmt = db.prepare('SELECT id, surah, ayah, word, text FROM words ORDER BY id ASC');
  const words: Word[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    words.push({
      word_index: Number(row.id),
      surah: Number(row.surah),
      ayah: Number(row.ayah),
      text: (row.text as string) || '',
    });
  }

  stmt.free();
  return words;
}

export async function getAllQpcV1Words(): Promise<Word[]> {
  if (!wordsCachePromise) {
    wordsCachePromise = loadAllQpcWords();
  }
  return wordsCachePromise;
}

export async function ensureQpcV1Font(pageNumber: number): Promise<string> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'Amiri';
  }

  if (!loadedFonts.has(pageNumber)) {
    const fontFamily = `QPCV1-Page-${pageNumber}`;
    const fontPath = `/fonts/${FONT_DIR_NAME}/p${pageNumber}.woff`;
    try {
      const fontFace = new FontFace(fontFamily, `url(${fontPath})`);
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      loadedFonts.set(pageNumber, fontFamily);
    } catch (error) {
      console.error(`Failed to load QPC V1 font for page ${pageNumber}:`, error);
      loadedFonts.set(pageNumber, 'Amiri');
    }
  }

  return loadedFonts.get(pageNumber) || 'Amiri';
}
