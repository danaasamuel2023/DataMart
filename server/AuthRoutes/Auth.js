const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { User, ReferralBonus } = require("../schema/schema");
const admin = require("firebase-admin");

dotenv.config();
const router = express.Router();

// ✅ Load service account from environment variable (base64 encoded)
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
);

// ✅ Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Generate Unique Referral Code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ==========================
//        GOOGLE SIGN-IN
// ==========================
router.post("/google-signin", async (req, res) => {
  try {
    const { idToken, deviceInfo } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

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

    let user = await User.findOne({ email });

    if (!user) {
      const referralCode = generateReferralCode();
      const randomPassword = await bcrypt.hash(uid + Date.now().toString(), 12);

      user = new User({
        name: name || email.split("@")[0],
        email,
        password: randomPassword,
        phoneNumber: phone_number || `GOOGLE_${uid}`,
        referralCode,
        approvalStatus: "approved",
        googleId: uid,
        profilePicture: picture,
        authProvider: "google",
        lastLogin: {
          deviceId: deviceInfo?.deviceId,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          timestamp: new Date(),
        },
      });

      await user.save();

      const referredBy = req.body.referredBy;
      if (referredBy) {
        const referrer = await User.findOne({ referralCode: referredBy });
        if (referrer) {
          await ReferralBonus.create({
            userId: referrer._id,
            referredUserId: user._id,
            amount: 5,
            status: "pending",
          });
        }
      }
    } else {
      user.googleId = uid;
      user.profilePicture = picture || user.profilePicture;
      if (!user.authProvider) user.authProvider = "email";
      user.lastLogin = {
        deviceId: deviceInfo?.deviceId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date(),
      };
      await user.save();
    }

    if (user.isDisabled) {
      return res.status(403).json({
        message: "Account is disabled",
        reason: user.disableReason,
      });
    }

    if (
      deviceInfo?.deviceId &&
      user.blockedDevices.some((device) => device.deviceId === deviceInfo.deviceId)
    ) {
      return res.status(403).json({ message: "This device has been blocked" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        authProvider: "google",
      },
      process.env.JWT_SECRET || "DatAmArt",
      { expiresIn: "7d" }
    );

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      profilePicture: user.profilePicture,
      authProvider: user.authProvider || "google",
      isNewUser: !user.createdAt || new Date() - user.createdAt < 60000,
    };

    res.json({
      message: user.isNewUser ? "Account created successfully" : "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
//         REGISTER
// ==========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phoneNumber, referredBy } = req.body;

    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? "Email already registered"
          : "Phone number already registered"
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const referralCode = generateReferralCode();

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      referralCode,
      referredBy,
      approvalStatus: "pending",
      authProvider: "email",
    });

    await newUser.save();

    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        await ReferralBonus.create({
          userId: referrer._id,
          referredUserId: newUser._id,
          amount: 5,
          status: "pending",
        });
      }
    }

    const token = jwt.sign(
      { userId: newUser._id, authProvider: "email" },
      process.env.JWT_SECRET || "DatAmArt",
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
        authProvider: "email",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field === "email" ? "Email" : "Phone number"} already registered`,
      });
    }
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
//         LOGIN
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please sign in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (user.isDisabled) {
      return res.status(403).json({
        message: "Account is disabled",
        reason: user.disableReason,
      });
    }

    if (
      deviceInfo?.deviceId &&
      user.blockedDevices.some((device) => device.deviceId === deviceInfo.deviceId)
    ) {
      return res.status(403).json({ message: "This device has been blocked" });
    }

    user.lastLogin = {
      deviceId: deviceInfo?.deviceId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date(),
    };
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        authProvider: user.authProvider || "email",
      },
      process.env.JWT_SECRET || "DatAmArt",
      { expiresIn: "7d" }
    );

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      profilePicture: user.profilePicture,
      authProvider: user.authProvider || "email",
    };

    res.json({
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================
//       MIDDLEWARE
// ==========================
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "DatAmArt");

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      authProvider: decoded.authProvider,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      message: error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
    });
  }
};

const authorize = (roles = []) => {
  if (typeof roles === "string") roles = [roles];
  return (req, res, next) => {
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

// ==========================
//     GET CURRENT USER
// ==========================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { router, authMiddleware, authorize };
