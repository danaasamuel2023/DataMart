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
// Updated UserSchema section to add in your schema.js file

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } }, // Not required for Google users
  phoneNumber: { type: String, required: true, unique: true },
  role: { type: String, enum: ["buyer", "seller", "reporter", "admin", "Dealer"], default: "buyer" },
  walletBalance: { type: Number, default: 0 },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  
  // Google Sign-In fields
  googleId: { type: String, sparse: true, unique: true },
  profilePicture: { type: String },
  authProvider: { type: String, enum: ["email", "google"], default: "email" },
  
  // Friend registration tracking
  registeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  registeredFriends: [RegisteredFriendSchema],
  
  createdAt: { type: Date, default: Date.now },
  
  // Password reset fields
  resetPasswordOTP: { type: String, select: false },
  resetPasswordOTPExpiry: { type: Date, select: false },
  lastPasswordReset: { type: Date },
  
  // Account status fields
  isDisabled: { type: Boolean, default: false },
  disableReason: { type: String },
  disabledAt: { type: Date },
  
  // Device blocking
  blockedDevices: [BlockedDeviceSchema],
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

// Add indexes for Google ID
UserSchema.index({ googleId: 1 });
UserSchema.index({ approvalStatus: 1 });
UserSchema.index({ authProvider: 1 });

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
  processing: { type: Boolean, default: false },
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
    enum: ['deposit', 'withdrawal', 'transfer', 'refund','purchase', 'wallet-refund', 'admin-deduction'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled','purchase','accepted', 'wallet-refund' , 'admin-deduction'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  gateway: {
    type: String,
    enum: ['paystack', 'manual', 'system','wallet','admin-deposit','wallet-refund', 'admin-deduction'],
    default: 'paystack'
  },
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

const ReferralBonusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  amount: { type: Number, required: true }, 
  status: { type: String, enum: ["pending", "credited"], default: "pending" },
  registrationType: { type: String, enum: ["referral", "friend-registration"], default: "referral" },
  createdAt: { type: Date, default: Date.now }
});

const DataInventorySchema = new mongoose.Schema({
  network: { 
    type: String, 
    enum: ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at", "waiting"], 
    required: true,
    unique: true 
  },
  
  webInStock: { 
    type: Boolean, 
    default: true 
  },
  webSkipGeonettech: { 
    type: Boolean, 
    default: false 
  },
  
  apiInStock: { 
    type: Boolean, 
    default: true 
  },
  apiSkipGeonettech: { 
    type: Boolean, 
    default: false 
  },
  
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

// NEW REPORT SYSTEM SCHEMAS

// Report Settings Schema - Admin controls for reporting system
const ReportSettingsSchema = new mongoose.Schema({
  isReportingEnabled: {
    type: Boolean,
    default: true,
    required: true
  },
  reportTimeLimit: {
    type: String,
    enum: ["same_day", "specific_days", "all_time", "no_reporting"],
    default: "same_day",
    required: true
  },
  reportTimeLimitHours: {
    type: Number,
    default: 24,
    min: 1,
    max: 8760 // Max 1 year
  },
  // For specific days reporting
  allowedReportDays: {
    type: Number,
    default: 1,
    min: 1,
    max: 365 // Max 1 year
  },
  maxReportsPerUser: {
    type: Number,
    default: 5,
    min: 1,
    max: 50
  },
  maxReportsPerUserPerDay: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  allowedReportReasons: [{
    type: String,
    default: [
      "Data not received",
      "Wrong amount credited",
      "Network error",
      "Slow delivery",
      "Double charging",
      "Other"
    ]
  }],
  autoResolveAfterDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 30
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Order Report Schema - Individual reports
const OrderReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    required: true
  },
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
  phoneNumber: {
    type: String,
    required: true
  },
  reportReason: { 
    type: String, 
    required: true 
  },
  customReason: {
    type: String
  },
  description: {
    type: String,
    maxlength: 500
  },
  status: { 
    type: String, 
    enum: [
      "pending", 
      "under_review", 
      "investigating", 
      "resolved", 
      "rejected", 
      "auto_resolved"
    ], 
    default: "pending" 
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  adminNotes: [{ 
    note: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  }],
  resolution: {
    type: { 
      type: String, 
      enum: ["refund", "resend", "compensation", "no_action", null], 
      default: null 
    },
    amount: { type: Number },
    description: { type: String },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: {
    type: Date
  },
  escalatedBy: {
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
  },
  lastStatusChange: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save middleware to generate reportId
OrderReportSchema.pre('save', async function(next) {
  if (this.isNew && !this.reportId) {
    const count = await this.constructor.countDocuments();
    this.reportId = `RPT${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

OrderReportSchema.index({ userId: 1 });
OrderReportSchema.index({ purchaseId: 1 });
OrderReportSchema.index({ status: 1 });
OrderReportSchema.index({ reportId: 1 });
OrderReportSchema.index({ phoneNumber: 1 });
OrderReportSchema.index({ createdAt: -1 });

// Report Analytics Schema - For tracking report metrics
const ReportAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalReports: {
    type: Number,
    default: 0
  },
  reportsByStatus: {
    pending: { type: Number, default: 0 },
    under_review: { type: Number, default: 0 },
    investigating: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    auto_resolved: { type: Number, default: 0 }
  },
  reportsByReason: {
    type: Map,
    of: Number,
    default: {}
  },
  // Hourly breakdown for "Data not received" reports
  dataNotReceivedByHour: {
    type: Map,
    of: Number,
    default: {}
  },
  // Network-wise breakdown for "Data not received"
  dataNotReceivedByNetwork: {
    type: Map,
    of: Number,
    default: {}
  },
  // Time-based patterns for all report types
  reportsByHour: {
    type: Map,
    of: Number,
    default: {}
  },
  averageResolutionTime: {
    type: Number, // in hours
    default: 0
  },
  resolutionRate: {
    type: Number, // percentage
    default: 0
  },
  // Peak hours analysis
  peakReportingHours: [{
    hour: Number,
    count: Number,
    percentage: Number
  }],
  // Critical insights
  insights: {
    mostProblematicHour: {
      hour: Number,
      reportCount: Number,
      mainReason: String
    },
    dataDeliveryIssuesPeak: {
      startHour: Number,
      endHour: Number,
      totalReports: Number
    },
    networkWithMostIssues: {
      network: String,
      reportCount: Number,
      percentage: Number
    }
  }
});

ReportAnalyticsSchema.index({ date: -1 });
const SMSHistorySchema = new mongoose.Schema({
  campaignId: { type: String, unique: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phoneNumber: { type: String, required: true },
    name: { type: String },
    status: { type: String, enum: ['sent', 'delivered', 'failed', 'pending'], default: 'sent' }
  }],
  message: { type: String, required: true },
  senderId: { type: String, required: true },
  method: { type: String, enum: ['quick', 'group'], required: true },
  groups: [{ type: String }], // For group SMS
  totalRecipients: { type: Number, required: true },
  totalSent: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  creditsUsed: { type: Number, default: 0 },
  isScheduled: { type: Boolean, default: false },
  scheduledDate: { type: Date },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  mnotifyResponse: { type: Object },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Export all models
const User = mongoose.model("User", UserSchema);
const DataPurchase = mongoose.model("DataPurchase", DataPurchaseSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const ReferralBonus = mongoose.model("ReferralBonus", ReferralBonusSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const DataInventory = mongoose.model("DataInventory", DataInventorySchema);
const ReportSettings = mongoose.model("ReportSettings", ReportSettingsSchema);
const OrderReport = mongoose.model("OrderReport", OrderReportSchema);
const ReportAnalytics = mongoose.model("ReportAnalytics", ReportAnalyticsSchema);
const SMSHistory = mongoose.model('SMSHistory', SMSHistorySchema);


module.exports = { 
  User, 
  DataPurchase, 
  Transaction, 
  ReferralBonus, 
  ApiKey, 
  DataInventory, 
  ReportSettings,
  OrderReport, 
  ReportAnalytics ,
  SMSHistory
};