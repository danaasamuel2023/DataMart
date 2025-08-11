const mongoose = require("mongoose");

// SMM Service Schema - For caching available services from JAP API
const SMMServiceSchema = new mongoose.Schema({
  serviceId: { type: Number, required: true, unique: true }, // JAP service ID
  name: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String, required: true },
  rate: { type: Number, required: true }, // Price per 1000
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  refill: { type: Boolean, default: false },
  cancel: { type: Boolean, default: false },
  
  // Our pricing
  ourRate: { type: Number, required: true }, // Our selling price
  isActive: { type: Boolean, default: true },
  
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

// SMM Order Schema - Track orders placed through JAP
const SMMOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // JAP order details
  japOrderId: { type: Number, required: true }, // Order ID from JAP
  serviceId: { type: Number, required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "SMMService" },
  
  // Order details
  link: { type: String, required: true },
  quantity: { type: Number, required: true },
  
  // For special order types
  runs: { type: Number }, // For drip-feed
  interval: { type: Number }, // For drip-feed
  comments: [{ type: String }], // For custom comments
  usernames: [{ type: String }], // For mentions
  hashtags: [{ type: String }], // For hashtag services
  
  // Pricing
  costPrice: { type: Number, required: true }, // What we pay JAP
  sellingPrice: { type: Number, required: true }, // What user pays us
  profit: { type: Number, required: true },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ["pending", "processing", "in progress", "completed", "partial", "cancelled", "error"], 
    default: "pending" 
  },
  japStatus: { type: String }, // Raw status from JAP
  
  // Progress
  startCount: { type: Number },
  remains: { type: Number },
  
  // Related transaction
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  
  // Tracking
  method: { type: String, enum: ["web", "api"], default: "web" },
  apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: "ApiKey" },
  ipAddress: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// SMM Refill Schema
const SMMRefillSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "SMMOrder", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  japOrderId: { type: Number, required: true },
  japRefillId: { type: String }, // Refill ID from JAP
  
  status: { 
    type: String, 
    enum: ["pending", "processing", "completed", "rejected"], 
    default: "pending" 
  },
  
  requestedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// SMM API Settings Schema
const SMMSettingsSchema = new mongoose.Schema({
  japApiUrl: { type: String, default: "https://justanotherpanel.com/api/v2" },
  japApiKey: { type: String, required: true },
  
  // Profit settings
  profitMargin: { type: Number, default: 20 }, // Percentage markup
  minProfit: { type: Number, default: 0.01 }, // Minimum profit per order
  
  // Service sync settings
  autoSyncServices: { type: Boolean, default: true },
  syncInterval: { type: Number, default: 3600 }, // Seconds
  lastSync: { type: Date },
  
  // Order settings
  autoCheckOrderStatus: { type: Boolean, default: true },
  statusCheckInterval: { type: Number, default: 300 }, // Seconds
  
  // Limits
  maxOrdersPerUser: { type: Number, default: 10 }, // Per day
  minOrderAmount: { type: Number, default: 0.5 },
  maxOrderAmount: { type: Number, default: 1000 },
  
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now }
});

// Export models
const SMMService = mongoose.model("SMMService", SMMServiceSchema);
const SMMOrder = mongoose.model("SMMOrder", SMMOrderSchema);
const SMMRefill = mongoose.model("SMMRefill", SMMRefillSchema);
const SMMSettings = mongoose.model("SMMSettings", SMMSettingsSchema);

module.exports = {
  SMMService,
  SMMOrder,
  SMMRefill,
  SMMSettings
};