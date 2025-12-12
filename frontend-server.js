import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// Get backend URL for proxying Qaidah images
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Proxy Qaidah/Quran images to backend (before static file serving)
// These images are stored in backend/public directories
app.use('/qaidah1', async (req, res) => {
  try {
    const imageUrl = `${BACKEND_BASE_URL}/qaidah1${req.path}`;
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error proxying Qaidah1 image:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

app.use('/qaidah2', async (req, res) => {
  try {
    const imageUrl = `${BACKEND_BASE_URL}/qaidah2${req.path}`;
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error proxying Qaidah2 image:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

app.use('/quran', async (req, res) => {
  try {
    const imageUrl = `${BACKEND_BASE_URL}/quran${req.path}`;
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error proxying Quran image:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Fallback for generic /qaidah path
app.use('/qaidah', async (req, res) => {
  try {
    const imageUrl = `${BACKEND_BASE_URL}/qaidah${req.path}`;
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error proxying Qaidah image:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

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

// Serve static files from the dist directory with proper MIME types
app.use(express.static(distPath, {
  index: false, // Don't serve index.html for directories
  setHeaders: (res, filePath) => {
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


