// friendRegistration.js - Using custom user ID passed from frontend
const express = require("express");
const bcrypt = require("bcryptjs");
const { User, ReferralBonus } = require("../schema/schema");
const { authMiddleware } = require("./auth"); // Keep auth middleware for security
const router = express.Router();

// Route to register a friend (requires authentication but uses passed referrerId)
router.post("/register-friend", authMiddleware, async (req, res) => {
  try {
    const { name, email, password, phoneNumber, referrerId } = req.body;
    
    // Input validation
    if (!name || !email || !password || !phoneNumber || !referrerId) {
      return res.status(400).json({ 
        message: "All fields are required",
        details: {
          name: !name ? "Name is required" : null,
          email: !email ? "Email is required" : null,
          password: !password ? "Password is required" : null,
          phoneNumber: !phoneNumber ? "Phone number is required" : null,
          referrerId: !referrerId ? "Referrer ID is required" : null
        }
      });
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

    // Get the referrer using the provided ID
    const referrer = await User.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ message: "Referrer not found" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate new referral code for the friend
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      referralCode,
      referredBy: referrer.referralCode,
      registeredByUserId: referrer._id
    });

    await newUser.save();

    // Create referral record
    await ReferralBonus.create({
      userId: referrer._id,
      referredUserId: newUser._id,
      amount: 5, // Set referral bonus amount
      status: "pending"
    });

    // Update the referrer's registered friends list
    if (!referrer.registeredFriends) {
      referrer.registeredFriends = [];
    }
    referrer.registeredFriends.push({
      userId: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      registeredAt: new Date()
    });
    await referrer.save();

    res.status(201).json({
      message: "Friend registered successfully",
      friend: {
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber
      }
    });
  } catch (error) {
    console.error("Friend registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Route to get all registered friends with custom user ID
router.get("/my-registered-friends/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get users registered by this user
    const registeredFriends = await User.find({ registeredByUserId: userId })
      .select('name email phoneNumber createdAt')
      .sort({ createdAt: -1 });

    res.json({
      totalFriends: registeredFriends.length,
      registeredFriends
    });
  } catch (error) {
    console.error("Get registered friends error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;