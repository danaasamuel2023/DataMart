// middlewareUser/deviceTracker.js
const { User } = require('../schema/schema');

/**
 * Middleware to handle device tracking and blocking
 * This is a focused middleware that should be applied only to key routes
 * like login, purchases, profile changes, etc.
 */
const deviceTracker = async (req, res, next) => {
  try {
    // Skip this middleware if user is not authenticated yet
    if (!req.user || !req.user.id) {
      return next();
    }
    
    // Extract device information from request
    const deviceId = req.header('x-device-id') || req.body.deviceId || req.query.deviceId || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    
    // Find the user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(); // If no user, just continue (auth middleware will handle this)
    }
    
    // Initialize blockedDevices array if it doesn't exist
    if (!Array.isArray(user.blockedDevices)) {
      user.blockedDevices = [];
    }
    
    // Initialize lastLogin object if it doesn't exist
    if (!user.lastLogin) {
      user.lastLogin = {
        deviceId: null,
        ipAddress: null,
        userAgent: null,
        timestamp: null
      };
    }
    
    // Check if device is blocked
    const isBlocked = user.blockedDevices.some(device => device.deviceId === deviceId);
    
    if (isBlocked) {
      return res.status(403).json({ 
        msg: 'This device has been blocked from accessing your account. Please contact support.',
        blocked: true,
        deviceId
      });
    }
    
    // Update last login information - only on significant actions to reduce DB writes
    const isSignificantAction = req.method !== 'GET' || 
                               req.originalUrl.includes('/auth/') || 
                               req.originalUrl.includes('/profile');
    
    if (isSignificantAction) {
      user.lastLogin = {
        deviceId,
        ipAddress,
        userAgent,
        timestamp: Date.now()
      };
      
      // Use Model.updateOne to reduce overhead instead of full save()
      await User.updateOne(
        { _id: user._id }, 
        { $set: { lastLogin: user.lastLogin } }
      );
    }
    
    // Add device info to request for use in route handlers
    req.deviceInfo = {
      deviceId,
      userAgent,
      ipAddress
    };
    
    next();
  } catch (err) {
    console.error('Device tracking middleware error:', err.message);
    next(); // Don't block the request if the middleware fails
  }
};

module.exports = deviceTracker;