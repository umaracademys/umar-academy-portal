#!/usr/bin/env node

/**
 * Script to download QPC v4 layout (tajweed) from qul.tarteel.ai
 * Resource ID: 19
 * 
 * This script uses the Quran Foundation API authentication
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_BASE = 'https://prelive-oauth2.quran.foundation';
const API_BASE = 'https://apis-prelive.quran.foundation';
const CLIENT_ID = 'c5f8f10d-c985-44cd-81b5-e7a5d387be1a';
const CLIENT_SECRET = 'Q~5_lmLi15izhTb4XC98~BtKPs';

const OUTPUT_DIR = path.join(__dirname, '../src/data/layouts');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'qpc-v4-tajweed-15-lines.db');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = 'grant_type=client_credentials&scope=content';
    
    const options = {
      hostname: 'prelive-oauth2.quran.foundation',
      path: '/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const tokenData = JSON.parse(data);
          console.log('✅ Access token obtained');
          resolve(tokenData.access_token);
        } else {
          reject(new Error(`Failed to get token: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function downloadLayoutFile(token) {
  return new Promise((resolve, reject) => {
    // Try the API endpoint for resource 19
    const options = {
      hostname: 'apis-prelive.quran.foundation',
      path: '/content/api/v4/resources/mushaf-layout/19/download',
      method: 'GET',
      headers: {
        'x-auth-token': token,
        'x-client-id': CLIENT_ID,
        'Accept': 'application/x-sqlite3, application/octet-stream'
      }
    };

    const file = fs.createWriteStream(OUTPUT_FILE);
    
    const req = https.request(options, (res) => {
      console.log(`📥 Downloading... Status: ${res.statusCode}`);
      
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        const redirectUrl = res.headers.location;
        console.log(`🔄 Redirecting to: ${redirectUrl}`);
        file.close();
        fs.unlinkSync(OUTPUT_FILE);
        reject(new Error('Redirect detected - authentication may be required'));
        return;
      }
      
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(OUTPUT_FILE);
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }

      res.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ File downloaded to: ${OUTPUT_FILE}`);
        const stats = fs.statSync(OUTPUT_FILE);
        console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
        resolve();
      });
    });

    req.on('error', (error) => {
      file.close();
      if (fs.existsSync(OUTPUT_FILE)) {
        fs.unlinkSync(OUTPUT_FILE);
      }
      reject(error);
    });

    req.end();
  });
}

async function main() {
  try {
    console.log('🔐 Getting access token...');
    const token = await getAccessToken();
    
    console.log('📥 Downloading QPC v4 layout...');
    await downloadLayoutFile(token);
    
    // Verify the file
    if (fs.existsSync(OUTPUT_FILE)) {
      const stats = fs.statSync(OUTPUT_FILE);
      if (stats.size > 1000) {
        console.log('✅ Download successful!');
        console.log(`   File: ${OUTPUT_FILE}`);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log('⚠️  Downloaded file seems too small, may be an error page');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Manual download instructions:');
    console.log('1. Visit: https://qul.tarteel.ai/resources/mushaf-layout/19?page=');
    console.log('2. Sign in to your account');
    console.log('3. Click "Download sqlite" button');
    console.log('4. Save the file to:', OUTPUT_FILE);
    process.exit(1);
  }
}

main();

