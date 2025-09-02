const mongoose = require("mongoose");

// Agent Store Schema - Main store configuration
const AgentStoreSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  
  // Store Basic Info
  storeName: {
    type: String,
    required: true,
    maxlength: 100
  },
  storeSlug: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  storeDescription: {
    type: String,
    maxlength: 500
  },
  storeLogo: {
    type: String // URL to logo
  },
  storeBanner: {
    type: String // URL to banner image
  },
  
  // Store Status
  status: {
    type: String,
    enum: ["active", "inactive", "suspended", "pending_approval", "closed"],
    default: "pending_approval"
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  closureReason: {
    type: String
  },
  closedAt: {
    type: Date
  },
  
  // Business Hours
  businessHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  autoCloseOutsideHours: {
    type: Boolean,
    default: false
  },
  
  // Contact & Social
  contactInfo: {
    phoneNumber: { type: String, required: true },
    alternatePhone: { type: String },
    email: { type: String },
    whatsappNumber: { type: String, required: true },
    address: {
      street: String,
      city: String,
      region: String,
      digitalAddress: String
    }
  },
  
  // WhatsApp Integration
  whatsappSettings: {
    groupLink: { type: String },
    communityLink: { type: String },
    broadcastListId: { type: String },
    autoSendReceipt: { type: Boolean, default: true },
    welcomeMessage: { type: String },
    orderNotification: { type: Boolean, default: true },
    supportHoursMessage: { type: String }
  },
  
  // Social Media
  socialMedia: {
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    telegram: { type: String }
  },
  
  // Commission & Pricing
  commissionSettings: {
    type: {
      type: String,
      enum: ["percentage", "fixed", "tiered", "custom"],
      default: "percentage"
    },
    defaultCommissionRate: {
      type: Number,
      default: 10, // 10% default
      min: 0,
      max: 100
    },
    fixedCommissionAmount: {
      type: Number,
      default: 0
    },
    tieredCommissions: [{
      minAmount: Number,
      maxAmount: Number,
      rate: Number
    }],
    minimumMarkup: {
      type: Number,
      default: 0 // Minimum markup percentage allowed
    },
    maximumMarkup: {
      type: Number,
      default: 50 // Maximum markup percentage allowed
    }
  },
  
  // Financial
  wallet: {
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    lastWithdrawal: { type: Date }
  },
  
  // Withdrawal Settings
  withdrawalSettings: {
    minimumWithdrawal: { type: Number, default: 10 },
    preferredMethod: {
      type: String,
      enum: ["momo", "bank", "cash"],
      default: "momo"
    },
    momoDetails: {
      network: String,
      number: String,
      name: String
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      branch: String
    },
    autoWithdrawal: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 100 },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly"
      }
    }
  },
  
  // Store Customization
  customization: {
    theme: {
      type: String,
      enum: ["default", "dark", "light", "blue", "green", "custom"],
      default: "default"
    },
    primaryColor: { type: String, default: "#1976d2" },
    secondaryColor: { type: String, default: "#dc004e" },
    customCSS: { type: String },
    showPrices: { type: Boolean, default: true },
    allowGuestCheckout: { type: Boolean, default: false },
    requirePhoneVerification: { type: Boolean, default: true }
  },
  
  // Marketing Tools
  marketing: {
    referralCode: { type: String, unique: true, sparse: true },
    referralBonus: { type: Number, default: 0 },
    promotions: [{
      code: String,
      discount: Number,
      type: { type: String, enum: ["percentage", "fixed"] },
      validFrom: Date,
      validTo: Date,
      usageLimit: Number,
      usedCount: { type: Number, default: 0 },
      active: { type: Boolean, default: true }
    }],
    loyaltyProgram: {
      enabled: { type: Boolean, default: false },
      pointsPerCedi: { type: Number, default: 1 },
      redeemRate: { type: Number, default: 100 } // 100 points = 1 GHS
    }
  },
  
  // Store Policies
  policies: {
    termsAndConditions: { type: String },
    privacyPolicy: { type: String },
    refundPolicy: { type: String },
    deliveryPolicy: { type: String }
  },
  
  // Analytics & Metrics
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 }
  },
  
  // SEO Settings
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }]
  },
  
  // Verification & Compliance
  verification: {
    isVerified: { type: Boolean, default: false },
    verificationDate: { type: Date },
    documents: [{
      type: { type: String, enum: ["id_card", "business_cert", "tax_cert"] },
      url: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false }
    }],
    businessRegistrationNumber: { type: String },
    taxIdentificationNumber: { type: String }
  },
  
  // Notifications Settings
  notifications: {
    email: {
      newOrder: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      withdrawal: { type: Boolean, default: true }
    },
    sms: {
      newOrder: { type: Boolean, default: true },
      withdrawal: { type: Boolean, default: true }
    },
    whatsapp: {
      newOrder: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: false }
    }
  },
  
  // Admin Controls
  adminNotes: [{ 
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Suspension & Penalties
  violations: [{
    type: { type: String },
    description: String,
    date: { type: Date, default: Date.now },
    penalty: String
  }],
  suspensionHistory: [{
    reason: String,
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    suspendedAt: Date,
    liftedAt: Date
  }],
  
  // Timestamps
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastActiveAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
AgentStoreSchema.index({ agentId: 1 });
AgentStoreSchema.index({ storeSlug: 1 });
AgentStoreSchema.index({ status: 1 });
AgentStoreSchema.index({ "metrics.rating": -1 });

// Agent Product Schema - Products with custom pricing
const AgentProductSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentStore",
    required: true
  },
  
  // Product Details
  network: {
    type: String,
    enum: ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at"],
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  mb: {
    type: Number,
    required: true
  },
  
  // Pricing
  basePrice: {
    type: Number,
    required: true // Original price from system
  },
  sellingPrice: {
    type: Number,
    required: true // Agent's custom price
  },
  profit: {
    type: Number,
    required: true // sellingPrice - basePrice
  },
  profitMargin: {
    type: Number,
    required: true // Percentage markup
  },
  
  // Product Status
  isActive: {
    type: Boolean,
    default: true
  },
  inStock: {
    type: Boolean,
    default: true
  },
  
  // Display Settings
  displayName: {
    type: String
  },
  description: {
    type: String
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Promotional
  isOnSale: {
    type: Boolean,
    default: false
  },
  salePrice: {
    type: Number
  },
  saleStartDate: {
    type: Date
  },
  saleEndDate: {
    type: Date
  },
  
  // Limits
  minimumQuantity: {
    type: Number,
    default: 1
  },
  maximumQuantity: {
    type: Number,
    default: 10
  },
  dailyLimit: {
    type: Number
  },
  
  // Stats
  totalSold: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AgentProductSchema.index({ storeId: 1, network: 1 });
AgentProductSchema.index({ storeId: 1, isActive: 1 });

// Agent Transaction Schema - Track sales and commissions
const AgentTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentStore",
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Order Details
  originalPurchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DataPurchase"
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentProduct"
  },
  
  // Product Info
  network: { type: String, required: true },
  capacity: { type: Number, required: true },
  phoneNumber: { type: String, required: true },
  
  // Financial
  basePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  agentProfit: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  netProfit: { type: Number, required: true },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ["wallet", "momo", "cash", "bank_transfer"],
    required: true
  },
  paymentReference: { type: String },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending"
  },
  
  // Status
  orderStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "cancelled", "refunded"],
    default: "pending"
  },
  
  // Customer Info
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  
  // Delivery
  deliveryMethod: {
    type: String,
    enum: ["instant", "scheduled"],
    default: "instant"
  },
  scheduledDelivery: { type: Date },
  deliveredAt: { type: Date },
  
  // Promo/Discount
  promoCode: { type: String },
  discountAmount: { type: Number, default: 0 },
  
  // Notes
  agentNotes: { type: String },
  customerNotes: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

AgentTransactionSchema.index({ storeId: 1, createdAt: -1 });
AgentTransactionSchema.index({ agentId: 1, paymentStatus: 1 });
AgentTransactionSchema.index({ transactionId: 1 });

// Agent Withdrawal Schema
const AgentWithdrawalSchema = new mongoose.Schema({
  withdrawalId: {
    type: String,
    unique: true,
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentStore",
    required: true
  },
  
  // Amount
  requestedAmount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  
  // Method
  method: {
    type: String,
    enum: ["momo", "bank", "cash"],
    required: true
  },
  paymentDetails: {
    momoNetwork: String,
    momoNumber: String,
    momoName: String,
    bankName: String,
    accountNumber: String,
    accountName: String,
    cashPickupLocation: String
  },
  
  // Status
  status: {
    type: String,
    enum: ["pending", "approved", "processing", "completed", "rejected", "cancelled"],
    default: "pending"
  },
  
  // Processing
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  processedAt: { type: Date },
  paymentReference: { type: String },
  
  // Rejection
  rejectionReason: { type: String },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  rejectedAt: { type: Date },
  
  // Notes
  agentNotes: { type: String },
  adminNotes: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

AgentWithdrawalSchema.index({ agentId: 1, status: 1 });
AgentWithdrawalSchema.index({ storeId: 1, createdAt: -1 });

// Agent Customer Schema - Track agent's customers
const AgentCustomerSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentStore",
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Customer Info
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  whatsappNumber: { type: String },
  
  // Relationship
  customerType: {
    type: String,
    enum: ["regular", "vip", "wholesale", "one_time"],
    default: "regular"
  },
  source: {
    type: String,
    enum: ["whatsapp", "walk_in", "referral", "online", "social_media"],
    default: "whatsapp"
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentCustomer"
  },
  
  // Groups
  groups: [{ type: String }],
  tags: [{ type: String }],
  
  // Loyalty
  loyaltyPoints: { type: Number, default: 0 },
  tier: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze"
  },
  
  // Purchase History
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
  averageOrderValue: { type: Number, default: 0 },
  
  // Credit System
  creditLimit: { type: Number, default: 0 },
  creditUsed: { type: Number, default: 0 },
  creditAvailable: { type: Number, default: 0 },
  
  // Preferences
  preferences: {
    preferredNetwork: String,
    preferredPaymentMethod: String,
    communicationPreference: {
      type: String,
      enum: ["whatsapp", "sms", "email", "call"],
      default: "whatsapp"
    }
  },
  
  // Notes
  notes: { type: String },
  
  // Status
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String },
  
  // Timestamps
  firstPurchaseDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AgentCustomerSchema.index({ storeId: 1, phoneNumber: 1 });
AgentCustomerSchema.index({ storeId: 1, customerType: 1 });

// Store Review Schema
const StoreReviewSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentStore",
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentTransaction"
  },
  
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 500
  },
  
  // Review aspects
  aspects: {
    service: { type: Number, min: 1, max: 5 },
    pricing: { type: Number, min: 1, max: 5 },
    speed: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 }
  },
  
  // Response
  agentResponse: {
    response: String,
    respondedAt: Date
  },
  
  // Moderation
  isVerified: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

StoreReviewSchema.index({ storeId: 1, rating: -1 });
StoreReviewSchema.index({ customerId: 1 });

// Store Analytics Schema
const StoreAnalyticsSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentStore",
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  
  // Traffic
  traffic: {
    views: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    socialMediaClicks: { type: Number, default: 0 }
  },
  
  // Sales
  sales: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 }
  },
  
  // Products
  productMetrics: {
    type: Map,
    of: {
      sold: Number,
      revenue: Number,
      profit: Number
    }
  },
  
  // Customers
  customers: {
    newCustomers: { type: Number, default: 0 },
    returningCustomers: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  
  // Peak Hours
  hourlyOrders: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Payment Methods
  paymentMethods: {
    wallet: { type: Number, default: 0 },
    momo: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now }
});

StoreAnalyticsSchema.index({ storeId: 1, date: -1 });

// Pre-save middleware for generating IDs
AgentTransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const count = await this.constructor.countDocuments();
    this.transactionId = `AGT${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

AgentWithdrawalSchema.pre('save', async function(next) {
  if (this.isNew && !this.withdrawalId) {
    const count = await this.constructor.countDocuments();
    this.withdrawalId = `WDR${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Generate store slug
AgentStoreSchema.pre('save', function(next) {
  if (this.isNew && !this.storeSlug) {
    this.storeSlug = this.storeName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();
  }
  this.updatedAt = new Date();
  next();
});

// Export all models
const AgentStore = mongoose.model("AgentStore", AgentStoreSchema);
const AgentProduct = mongoose.model("AgentProduct", AgentProductSchema);
const AgentTransaction = mongoose.model("AgentTransaction", AgentTransactionSchema);
const AgentWithdrawal = mongoose.model("AgentWithdrawal", AgentWithdrawalSchema);
const AgentCustomer = mongoose.model("AgentCustomer", AgentCustomerSchema);
const StoreReview = mongoose.model("StoreReview", StoreReviewSchema);
const StoreAnalytics = mongoose.model("StoreAnalytics", StoreAnalyticsSchema);

module.exports = {
  AgentStore,
  AgentProduct,
  AgentTransaction,
  AgentWithdrawal,
  AgentCustomer,
  StoreReview,
  StoreAnalytics
};