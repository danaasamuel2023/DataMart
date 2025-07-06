// auth.js - Enhanced authentication routes with Google Sign-In
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { User, ReferralBonus } = require("../schema/schema");
const admin = require("firebase-admin");

dotenv.config();
const router = express.Router();

// Initialize Firebase Admin SDK
// Make sure to set up your service account key file
const serviceAccount = require("../firebaseConfig/firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Generate Unique Referral Code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// GOOGLE SIGN-IN ROUTE
router.post("/google-signin", async (req, res) => {
  try {
    const { idToken, deviceInfo } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

    // Verify the ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error("Firebase token verification error:", error);
      return res.status(401).json({ message: "Invalid ID token" });
    }

    const { uid, email, name, picture, phone_number } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: "Email not found in Google account" });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from Google data
      const referralCode = generateReferralCode();
      
      // Generate a secure random password for Google users
      const randomPassword = await bcrypt.hash(uid + Date.now().toString(), 12);
      
      user = new User({
        name: name || email.split('@')[0],
        email,
        password: randomPassword, // Google users won't use this password
        phoneNumber: phone_number || `GOOGLE_${uid}`, // Placeholder if no phone
        referralCode,
        approvalStatus: "approved", // Auto-approve Google users
        googleId: uid,
        profilePicture: picture,
        authProvider: "google",
        lastLogin: {
          deviceId: deviceInfo?.deviceId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        }
      });

      await user.save();

      // Handle referral if passed
      const referredBy = req.body.referredBy;
      if (referredBy) {
        const referrer = await User.findOne({ referralCode: referredBy });
        if (referrer) {
          await ReferralBonus.create({
            userId: referrer._id,
            referredUserId: user._id,
            amount: 5,
            status: "pending"
          });
        }
      }
    } else {
      // Update existing user's Google info and last login
      user.googleId = uid;
      user.profilePicture = picture || user.profilePicture;
      if (!user.authProvider) {
        user.authProvider = "email"; // Mark existing users as email-based
      }
      
      // Update last login info
      user.lastLogin = {
        deviceId: deviceInfo?.deviceId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      };
      
      await user.save();
    }

    // Check if account is disabled
    if (user.isDisabled) {
      return res.status(403).json({ 
        message: "Account is disabled", 
        reason: user.disableReason 
      });
    }

    // Check device blocking
    if (deviceInfo?.deviceId && user.blockedDevices.some(device => device.deviceId === deviceInfo.deviceId)) {
      return res.status(403).json({ message: "This device has been blocked" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        authProvider: "google"
      },
      process.env.JWT_SECRET || 'DatAmArt',
      { expiresIn: "7d" }
    );

    // Return user info
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      profilePicture: user.profilePicture,
      authProvider: user.authProvider || "google",
      isNewUser: !user.createdAt || (new Date() - user.createdAt < 60000) // New if created within last minute
    };

    res.json({ 
      message: user.isNewUser ? "Account created successfully" : "Login successful", 
      token,
      user: userResponse
    });

  } catch (error) {
    console.error("Google Sign-In Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// REGISTER ROUTE (Original)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phoneNumber, referredBy } = req.body;
    
    // Input validation
    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already registered" });
      } else {
        return res.status(400).json({ message: "Phone number already registered" });
      }
    }

    // Hash password with stronger salt
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate Referral Code
    const referralCode = generateReferralCode();

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      referralCode,
      referredBy,
      approvalStatus: "pending",
      authProvider: "email"
    });

    await newUser.save();

    // Handle Referral Bonus
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        await ReferralBonus.create({
          userId: referrer._id,
          referredUserId: newUser._id,
          amount: 5,
          status: "pending"
        });
      }
    }

    // Generate initial token for auto-login after registration
    const token = jwt.sign(
      { userId: newUser._id, authProvider: "email" },
      process.env.JWT_SECRET || 'DatAmArt',
      { expiresIn: "7d" }
    );

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        authProvider: "email"
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field === 'email' ? 'Email' : 'Phone number'} already registered` 
      });
    }
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// LOGIN ROUTE (Enhanced)
router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check if this is a Google-only account trying to login with password
    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({ 
        message: "This account uses Google Sign-In. Please sign in with Google." 
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Check if account is disabled
    if (user.isDisabled) {
      return res.status(403).json({ 
        message: "Account is disabled", 
        reason: user.disableReason 
      });
    }

    // Check device blocking
    if (deviceInfo?.deviceId && user.blockedDevices.some(device => device.deviceId === deviceInfo.deviceId)) {
      return res.status(403).json({ message: "This device has been blocked" });
    }

    // Update last login
    user.lastLogin = {
      deviceId: deviceInfo?.deviceId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    };
    await user.save();

    // Generate JWT Token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        authProvider: user.authProvider || "email"
      },
      process.env.JWT_SECRET || 'DatAmArt',
      { expiresIn: "7d" }
    );

    // Return user info
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      profilePicture: user.profilePicture,
      authProvider: user.authProvider || "email"
    };

    res.json({ 
      message: "Login successful", 
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// // LINK GOOGLE ACCOUNT (for existing users)
// router.post("/link-google", authMiddleware, async (req, res) => {
//   try {
//     const { idToken } = req.body;
//     const userId = req.user.userId;

//     if (!idToken) {
//       return res.status(400).json({ message: "ID token is required" });
//     }

//     // Verify the ID token
//     let decodedToken;
//     try {
//       decodedToken = await admin.auth().verifyIdToken(idToken);
//     } catch (error) {
//       return res.status(401).json({ message: "Invalid ID token" });
//     }

//     const { uid, email } = decodedToken;

//     // Find the current user
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if Google account email matches
//     if (user.email !== email) {
//       return res.status(400).json({ 
//         message: "Google account email doesn't match your account email" 
//       });
//     }

//     // Check if another account already uses this Google ID
//     const existingGoogleUser = await User.findOne({ googleId: uid });
//     if (existingGoogleUser && existingGoogleUser._id.toString() !== userId) {
//       return res.status(400).json({ 
//         message: "This Google account is already linked to another user" 
//       });
//     }

//     // Link Google account
//     user.googleId = uid;
//     user.profilePicture = decodedToken.picture || user.profilePicture;
//     await user.save();

//     res.json({ 
//       message: "Google account linked successfully",
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         googleLinked: true
//       }
//     });
//   } catch (error) {
//     console.error("Link Google Error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// Authentication middleware
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization denied' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'DatAmArt');
    
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      authProvider: decoded.authProvider
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// Auth check route
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = { router, authMiddleware, authorize };