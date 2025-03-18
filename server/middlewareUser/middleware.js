// middleware/auth.js

const jwt = require('jsonwebtoken');
const { User } = require('../schema/schema');

/**
 * Middleware to verify JWT token and attach user to request
 * This should be used before the adminAuth middleware
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, 'DatAmArt');

    // Find user by id
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ msg: 'Token is valid but user not found' });
    }

    // Attach user object to request
    req.user = user;
    
    // Proceed to next middleware
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = auth;