const mongoose = require("mongoose");

// Device Block Schema
const BlockedDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  reason: { type: String },
  blockedAt: { type: Date, default: Date.now },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

// Friend Registration Schema - for tracking registered friends
const RegisteredFriendSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String },
  email: { type: String },
  phoneNumber: { type: String },
  registeredAt: { type: Date, default: Date.now }
});

// User Schema with blocked devices, registered friends and admin approval
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  role: { type: String, enum: ["buyer", "seller", "reporter", "admin", "Dealer"], default: "buyer" },
  walletBalance: { type: Number, default: 0 }, // User's wallet balance
  referralCode: { type: String, unique: true }, // User's unique referral code
  referredBy: { type: String, default: null }, // Who referred this user
  
  // Friend registration tracking
  registeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User who registered this user
  registeredFriends: [RegisteredFriendSchema], // Friends registered by this user
  
  createdAt: { type: Date, default: Date.now },
  
  // Password reset fields
  resetPasswordOTP: { type: String, select: false }, // OTP for password reset
  resetPasswordOTPExpiry: { type: Date, select: false }, // OTP expiration time
  lastPasswordReset: { type: Date }, // When password was last reset
  
  // Account status fields
  isDisabled: { type: Boolean, default: false }, // If account is disabled
  disableReason: { type: String }, // Why account was disabled
  disabledAt: { type: Date }, // When account was disabled
  
  // Device blocking
  blockedDevices: [BlockedDeviceSchema], // Array of blocked devices
  lastLogin: {
    deviceId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date }
  },
  
  // Admin approval fields
  approvalStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  approvedAt: { 
    type: Date 
  },
  rejectionReason: { 
    type: String 
  }
});

// Add index for approval status to make queries more efficient
UserSchema.index({ approvalStatus: 1 });

// Other schemas remain the same...
const DataPurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  phoneNumber: { type: String, required: true }, 
  network: { type: String, enum: ["YELLO", "TELECEL", "AT_PREMIUM","airteltigo","at"], required: true },
  capacity: { type: Number, required: true }, 
  gateway: { type: String, required: true }, 
  method: { type: String, enum: ["web", "api"], required: true }, 
  price: { type: Number, required: true }, 
  geonetReference: { type: String, required: true }, 
  status: { type: String, enum: ["pending", "completed", "failed","processing","refunded","refund","delivered","on","waiting","accepted"], default: "pending" }, 
  // Add this processing field to prevent duplicate exports
  processing: { type: Boolean, default: false },
  // Add these fields for admin notes and update tracking
  adminNotes: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
 
});

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'refund','purchase', 'wallet-refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled','purchase','accepted', 'wallet-refund'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  gateway: {
    type: String,
    enum: ['paystack', 'manual', 'system','wallet','admin-deposit','wallet-refund'],
    default: 'paystack'
  },
  // Add the new processing field to prevent double processing
  processing: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Updated ReferralBonus Schema to include friend registration type
const ReferralBonusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  amount: { type: Number, required: true }, 
  status: { type: String, enum: ["pending", "credited"], default: "pending" },
  // Added registration type field to track how the user was referred
  registrationType: { type: String, enum: ["referral", "friend-registration"], default: "referral" },
  createdAt: { type: Date, default: Date.now }
});

// Updated DataInventory Schema - Add this to your schema.js file

const DataInventorySchema = new mongoose.Schema({
  network: { 
    type: String, 
    enum: ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at", "waiting"], 
    required: true,
    unique: true 
  },
  
  // Web User Controls
  webInStock: { 
    type: Boolean, 
    default: true 
  },
  webSkipGeonettech: { 
    type: Boolean, 
    default: false 
  },
  
  // API Developer Controls
  apiInStock: { 
    type: Boolean, 
    default: true 
  },
  apiSkipGeonettech: { 
    type: Boolean, 
    default: false 
  },
  
  // Legacy fields (for backward compatibility during migration)
  inStock: { 
    type: Boolean, 
    default: true 
  },
  skipGeonettech: { 
    type: Boolean, 
    default: false 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Track who last updated and when
  webLastUpdatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  webLastUpdatedAt: { 
    type: Date 
  },
  apiLastUpdatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  apiLastUpdatedAt: { 
    type: Date 
  }
});

// Add indexes for better query performance
DataInventorySchema.index({ network: 1 });
DataInventorySchema.index({ webInStock: 1 });
DataInventorySchema.index({ apiInStock: 1 });

const Schema = mongoose.Schema;

const apiKeySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    key: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    }
});

apiKeySchema.index({ key: 1 });
apiKeySchema.index({ userId: 1 });

const OrderReportSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  purchaseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "DataPurchase", 
    required: true 
  },
  reason: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "investigating", "resolved", "rejected"], 
    default: "pending" 
  },
  adminNotes: { 
    type: String 
  },
  resolution: { 
    type: String, 
    enum: ["refund", "resend", "other", null], 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

OrderReportSchema.index({ userId: 1 });
OrderReportSchema.index({ purchaseId: 1 });
OrderReportSchema.index({ status: 1 });

// Export all models
const User = mongoose.model("User", UserSchema);
const DataPurchase = mongoose.model("DataPurchase", DataPurchaseSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const ReferralBonus = mongoose.model("ReferralBonus", ReferralBonusSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const DataInventory = mongoose.model("DataInventory", DataInventorySchema);
const OrderReport = mongoose.model("OrderReport", OrderReportSchema);

module.exports = { User, DataPurchase, Transaction, ReferralBonus, ApiKey, DataInventory, OrderReport };