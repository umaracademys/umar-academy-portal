import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

let distExists = existsSync(distPath);
let indexExists = existsSync(indexPath);

if (!distExists) {
  console.error('❌ Error: dist directory not found!');
  console.error(`   Expected path: ${distPath}`);
  console.error('   Make sure the build completed successfully.');
  console.error('   Server will start but will return 503 until build is complete.');
} else if (!indexExists) {
  console.error('❌ Error: index.html not found in dist directory!');
  console.error(`   Expected path: ${indexPath}`);
  console.error('   Make sure the build completed successfully.');
  console.error('   Server will start but will return 503 until build is complete.');
} else {
  console.log('✅ Dist directory found');
  console.log(`📁 Serving from: ${distPath}`);
}

// Get backend URL for proxying Qaidah images
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Proxy Qaidah/Quran files (images and PDFs) to backend (MUST be before static file serving)
// These files are stored in backend/public directories
app.use('/qaidah1', async (req, res) => {
  try {
    // req.path already includes /qaidah1, so use it directly
    const fileUrl = `${BACKEND_BASE_URL}${req.path}`;
    console.log(`📄 Proxying Qaidah1: ${req.path} -> ${fileUrl}`);
    
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf, image/*, */*'
      }
    });
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // Determine content type based on file extension
      let contentType = response.headers.get('content-type');
      if (!contentType) {
        if (req.path.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (req.path.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        } else {
          contentType = 'image/jpeg';
        }
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
      console.log(`✅ Successfully proxied Qaidah1 file: ${req.path} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`❌ Backend returned ${response.status} for ${fileUrl}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.log(`❌ Backend error response: ${errorText}`);
      res.status(response.status).json({ 
        error: 'File not found', 
        path: req.path, 
        url: fileUrl,
        backendStatus: response.status,
        backendError: errorText
      });
    }
  } catch (error) {
    console.error('❌ Error proxying Qaidah1 file:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to load file', message: error?.message });
  }
});

app.use('/qaidah2', async (req, res) => {
  try {
    // req.path already includes /qaidah2, so use it directly
    const fileUrl = `${BACKEND_BASE_URL}${req.path}`;
    console.log(`📄 Proxying Qaidah2: ${req.path} -> ${fileUrl}`);
    
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf, image/*, */*'
      }
    });
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // Determine content type based on file extension
      let contentType = response.headers.get('content-type');
      if (!contentType) {
        if (req.path.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (req.path.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        } else {
          contentType = 'image/jpeg';
        }
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
      console.log(`✅ Successfully proxied Qaidah2 file: ${req.path} (${(buffer.byteLength / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`❌ Backend returned ${response.status} for ${fileUrl}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.log(`❌ Backend error response: ${errorText}`);
      res.status(response.status).json({ 
        error: 'File not found', 
        path: req.path, 
        url: fileUrl,
        backendStatus: response.status,
        backendError: errorText
      });
    }
  } catch (error) {
    console.error('❌ Error proxying Qaidah2 file:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to load file', message: error?.message });
  }
});

app.use('/quran', async (req, res) => {
  try {
    // req.path already includes /quran, so use it directly
    const fileUrl = `${BACKEND_BASE_URL}${req.path}`;
    console.log(`📄 Proxying Quran: ${req.path} -> ${fileUrl}`);
    const response = await fetch(fileUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // Determine content type based on file extension
      let contentType = response.headers.get('content-type');
      if (!contentType) {
        if (req.path.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (req.path.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        } else {
          contentType = 'image/jpeg';
        }
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } else {
      console.log(`❌ Backend returned ${response.status} for ${fileUrl}`);
      res.status(404).json({ error: 'File not found', path: req.path, url: fileUrl });
    }
  } catch (error) {
    console.error('Error proxying Quran file:', error);
    res.status(500).json({ error: 'Failed to load file', message: error?.message });
  }
});

// Fallback for generic /qaidah path
app.use('/qaidah', async (req, res) => {
  try {
    // req.path already includes /qaidah, so use it directly
    const fileUrl = `${BACKEND_BASE_URL}${req.path}`;
    console.log(`📄 Proxying Qaidah: ${req.path} -> ${fileUrl}`);
    const response = await fetch(fileUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // Determine content type based on file extension
      let contentType = response.headers.get('content-type');
      if (!contentType) {
        if (req.path.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (req.path.toLowerCase().endsWith('.png')) {
          contentType = 'image/png';
        } else {
          contentType = 'image/jpeg';
        }
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } else {
      console.log(`❌ Backend returned ${response.status} for ${fileUrl}`);
      res.status(404).json({ error: 'File not found', path: req.path, url: fileUrl });
    }
  } catch (error) {
    console.error('Error proxying Qaidah file:', error);
    res.status(500).json({ error: 'Failed to load file', message: error?.message });
  }
});

// Serve static files from the dist directory with proper MIME types
app.use(express.static(distPath, {
  index: false, // Don't serve index.html for directories
  setHeaders: (res, filePath) => {
    // Prevent caching of index.html to avoid stale asset references
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Cache assets with hash in filename (they're versioned)
    else if (filePath.match(/\/assets\/.*-[a-zA-Z0-9]+\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Ensure JavaScript modules are served with correct MIME type
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const distExists = existsSync(distPath);
  const indexExists = existsSync(indexPath);
  
  if (!distExists || !indexExists) {
    return res.status(503).json({ 
      status: 'NOT_READY', 
      message: 'Build files not found. Server is starting or build failed.',
      distExists,
      indexExists,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({ 
    status: 'OK', 
    message: 'Frontend server is running',
    timestamp: new Date().toISOString()
  });
});

// Handle SPA routing - all routes serve index.html
// This must be last, after all other routes
app.get('*', (req, res) => {
  // Prevent caching of index.html to avoid stale asset references
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Check if files exist before serving
  if (!existsSync(distPath) || !existsSync(indexPath)) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Application is still building. Please wait a moment and try again.',
      timestamp: new Date().toISOString()
    });
  }
  
  // Don't serve index.html for static file requests (js, css, wasm, etc.)
  // These should be handled by express.static above, but if they're not found,
  // we should return 404 instead of serving HTML (which causes MIME type errors)
  const path = req.path.toLowerCase();
  const isStaticFile = /\.(js|css|wasm|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/.test(path);
  
  // Skip Qaidah/Quran image paths - they're handled by proxy above
  const isQaidahImage = path.startsWith('/qaidah') || path.startsWith('/quran');
  
  if (isStaticFile && !isQaidahImage) {
    // Static file not found - return 404 instead of serving index.html
    console.log(`❌ Static file not found: ${req.path}`);
    return res.status(404).json({
      error: 'File not found',
      path: req.path,
      message: 'The requested static file could not be found.'
    });
  }
  
  // For non-file requests (routes), serve index.html for SPA routing
  console.log(`📄 Serving index.html for route: ${req.path}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).json({ 
        error: 'Error loading application',
        message: err.message 
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ 
    error: 'Internal server error',
    message: err?.message || 'Unknown error'
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Frontend server running on ${HOST}:${PORT}`);
  console.log(`📁 Serving from: ${distPath}`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
});


