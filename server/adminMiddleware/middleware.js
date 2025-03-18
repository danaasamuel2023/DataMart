// middleware/adminAuth.js

/**
 * Middleware to verify if the user has admin role privileges
 * This middleware should be used after the auth middleware
 * which attaches the user to the request object
 */
const adminAuth = (req, res, next) => {
    try {
      // Check if user exists and has required role
      if (!req.user) {
        return res.status(401).json({ msg: 'Authentication required' });
      }
  
      // Check if user has admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Admin access required' });
      }
  
      // User is authenticated and has admin role, proceed
      next();
    } catch (err) {
      console.error('Error in admin authentication middleware:', err.message);
      res.status(500).json({ msg: 'Server error' });
    }
  };
  
  module.exports = adminAuth;