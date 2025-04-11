// auth.js - Enhanced authentication routes
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { User, ReferralBonus } = require("../schema/schema");

dotenv.config();
const router = express.Router();

// Generate Unique Referral Code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// REGISTER ROUTE
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
      referredBy ,
       approvalStatus: "pending"
    });

    await newUser.save();

    // Handle Referral Bonus
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        await ReferralBonus.create({
          userId: referrer._id,
          referredUserId: newUser._id,
          amount: 5, // Set referral bonus amount
          status: "pending"
        });
      }
    }

    // Generate initial token for auto-login after registration
    const token = jwt.sign(
      { userId: newUser._id },
      'DatAmArt'  ,  
     { expiresIn: "7d" }
    );

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  }  catch (error) {
    if (error.code === 11000) {
      // Extract the duplicate field from the error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field === 'email' ? 'Email' : 'Phone number'} already registered` 
      });
    }
    // Handle other errors
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT Token with user role for authorization
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      'DatAmArt',
      { expiresIn: "7d" }
    );

    // Return user info (excluding password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode
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

// Authentication middleware
const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization denied' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, 'DatAmArt');
    
    // Add user data to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role
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