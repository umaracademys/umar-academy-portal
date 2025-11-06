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
if (!existsSync(distPath)) {
  console.error('❌ Error: dist directory not found!');
  console.error(`   Expected path: ${distPath}`);
  console.error('   Make sure the build completed successfully.');
  process.exit(1);
}

// Check if index.html exists
const indexPath = path.join(distPath, 'index.html');
if (!existsSync(indexPath)) {
  console.error('❌ Error: index.html not found in dist directory!');
  console.error(`   Expected path: ${indexPath}`);
  console.error('   Make sure the build completed successfully.');
  process.exit(1);
}

console.log('✅ Dist directory found');
console.log(`📁 Serving from: ${distPath}`);

// Serve static files from the dist directory
app.use(express.static(distPath, {
  index: false // Don't serve index.html for directories
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Frontend server is running',
    timestamp: new Date().toISOString()
  });
});

// Handle SPA routing - all routes serve index.html
// This must be last, after all other routes
app.get('*', (req, res) => {
  console.log(`📄 Serving index.html for: ${req.path}`);
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


