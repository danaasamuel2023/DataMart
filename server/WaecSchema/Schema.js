const mongoose = require("mongoose");

// =====================================================
// RESULT CHECKER PRODUCT SCHEMA
// =====================================================
// For admin to manage checker types and prices
const ResultCheckerProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["WAEC", "BECE"],
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
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

// =====================================================
// RESULT CHECKER PURCHASE SCHEMA
// =====================================================
// For tracking user purchases
const ResultCheckerPurchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  checkerType: {
    type: String,
    enum: ["WAEC", "BECE"],
    required: true
  },
  serialNumber: {
    type: String,
    required: true
  },
  pin: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  purchaseReference: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    enum: ["wallet", "paystack", "manual"],
    default: "wallet"
  },
  method: {
    type: String,
    enum: ["web", "api"],
    default: "web"
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction"
  },
  webhookUrl: {
    type: String, // Store webhook URL for API purchases
    default: null
  },
  skipSms: {
    type: Boolean, // Flag to skip SMS sending (developer handles it)
    default: false
  },
  smsStatus: {
    sent: {
      type: Boolean,
      default: false
    },
    message: String,
    sentAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// =====================================================
// RESULT CHECKER INVENTORY SCHEMA
// =====================================================
// For admin to manage available checkers
const ResultCheckerInventorySchema = new mongoose.Schema({
  checkerType: {
    type: String,
    enum: ["WAEC", "BECE"],
    required: true
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true
  },
  pin: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["available", "sold", "reserved"],
    default: "available"
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  soldAt: {
    type: Date
  },
  reservedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  reservedAt: {
    type: Date
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  batchId: {
    type: String // For tracking which batch this checker belongs to
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// =====================================================
// INDEXES
// =====================================================
// Product indexes
ResultCheckerProductSchema.index({ name: 1 });
ResultCheckerProductSchema.index({ isActive: 1 });

// Purchase indexes
ResultCheckerPurchaseSchema.index({ userId: 1 });
ResultCheckerPurchaseSchema.index({ purchaseReference: 1 });
ResultCheckerPurchaseSchema.index({ status: 1 });
ResultCheckerPurchaseSchema.index({ checkerType: 1 });
ResultCheckerPurchaseSchema.index({ createdAt: -1 });
ResultCheckerPurchaseSchema.index({ method: 1 }); // New index for API vs Web purchases
ResultCheckerPurchaseSchema.index({ skipSms: 1 }); // New index for SMS preference

// Inventory indexes
ResultCheckerInventorySchema.index({ checkerType: 1, status: 1 });
ResultCheckerInventorySchema.index({ serialNumber: 1 });
ResultCheckerInventorySchema.index({ status: 1 });
ResultCheckerInventorySchema.index({ batchId: 1 });

// =====================================================
// MIDDLEWARE
// =====================================================
// Generate unique purchase reference
ResultCheckerPurchaseSchema.pre('save', async function(next) {
  if (this.isNew && !this.purchaseReference) {
    const count = await this.constructor.countDocuments();
    const type = this.checkerType === "WAEC" ? "W" : "B";
    this.purchaseReference = `CHK${type}${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// =====================================================
// CREATE MODELS
// =====================================================
const ResultCheckerProduct = mongoose.model("ResultCheckerProduct", ResultCheckerProductSchema);
const ResultCheckerPurchase = mongoose.model("ResultCheckerPurchase", ResultCheckerPurchaseSchema);
const ResultCheckerInventory = mongoose.model("ResultCheckerInventory", ResultCheckerInventorySchema);

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  ResultCheckerProduct,
  ResultCheckerPurchase,
  ResultCheckerInventory
};