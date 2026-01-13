/**
 * Authentication middleware for binary file uploads
 * Works with streaming requests (before JSON parsing)
 */

const jwt = require('jsonwebtoken');

const authenticateBinaryUpload = (req, res, next) => {
  // Get token from Authorization header or query parameter
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // Alternative: check query parameter (for some upload clients)
  const queryToken = req.query?.token;

  if (!token && !queryToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const tokenToVerify = token || queryToken;
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

  jwt.verify(tokenToVerify, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || null,
      permissionsVersion: decoded.permissionsVersion || null
    };
    
    next();
  });
};

module.exports = authenticateBinaryUpload;
