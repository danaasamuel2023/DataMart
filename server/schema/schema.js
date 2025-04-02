const mongoose = require("mongoose");

// User Schema


// User Schema with password reset fields
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },
  walletBalance: { type: Number, default: 0 }, // User's wallet balance
  referralCode: { type: String, unique: true }, // User's unique referral code
  referredBy: { type: String, default: null }, // Who referred this user
  createdAt: { type: Date, default: Date.now },
  
  // Password reset fields
  resetPasswordOTP: { type: String, select: false }, // OTP for password reset
  resetPasswordOTPExpiry: { type: Date, select: false }, // OTP expiration time
  lastPasswordReset: { type: Date }, // When password was last reset
  
  // Account status fields
  isDisabled: { type: Boolean, default: false }, // If account is disabled
  disableReason: { type: String }, // Why account was disabled
  disabledAt: { type: Date } // When account was disabled
});
// Data Purchase Schema
const DataPurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Buyer ID
  phoneNumber: { type: String, required: true }, // Where data is sent
  network: { type: String, enum: ["YELLO", "TELECEL", "AT_PREMIUM","airteltigo","at"], required: true },
  capacity: { type: Number, required: true }, // Data size (GB/MB)
  gateway: { type: String, required: true }, // Payment method used
  method: { type: String, enum: ["web", "api"], required: true }, // Source of purchase
  price: { type: Number, required: true }, // Cost of data package
  geonetReference: { type: String, required: true }, // Unique reference from Geonet
  status: { type: String, enum: ["pending", "completed", "failed","processing","refunded","refund","delivered","on","waiting"], default: "pending" }, // Status
  createdAt: { type: Date, default: Date.now }
});

// Transaction Schema (Deposits & Purchases)
const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["deposit", "purchase","refund"], required: true }, // Deposit or Data Purchase
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "failed","refund","waiting"], default: "pending" },
  reference: { type: String, unique: true, required: true }, // Unique transaction ID
  gateway: { type: String, required: true }, // Payment method (Mobile Money, Card, etc.)
  createdAt: { type: Date, default: Date.now }
});

// Referral Bonus Schema
const ReferralBonusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who got the bonus
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // New user
  amount: { type: Number, required: true }, // Bonus amount
  status: { type: String, enum: ["pending", "credited"], default: "pending" }, // If bonus is credited
  createdAt: { type: Date, default: Date.now }
});

const DataInventorySchema = new mongoose.Schema({
  network: { type: String, enum: ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at","waiting"], required: true },
  
  inStock: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});



// Add this to your schema.js file

const Schema = mongoose.Schema;

// API Key Schema
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

// Create index for faster lookups
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ userId: 1 });


// Export ApiKey along with your other models


// Export all models
const User = mongoose.model("User", UserSchema);
const DataPurchase = mongoose.model("DataPurchase", DataPurchaseSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const ReferralBonus = mongoose.model("ReferralBonus", ReferralBonusSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const DataInventory = mongoose.model("DataInventory", DataInventorySchema);

module.exports = { User, DataPurchase, Transaction, ReferralBonus,ApiKey,DataInventory };
