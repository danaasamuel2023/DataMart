// TransferSchema/Transfer.js
const mongoose = require("mongoose");

// Simple Transfer Schema
const TransferSchema = new mongoose.Schema({
  // Reference from MoMo
  momoReference: {
    type: String,
    required: true,
    unique: true
  },
  
  // Customer who sent money
  customerPhone: {
    type: String,
    required: true
  },
  customerName: String,
  
  // Worker who processed
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  workerName: String,
  
  // Amount
  amount: {
    type: Number,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed','momo'],
    default: 'completed'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Transfer = mongoose.model("Transfer", TransferSchema);

// Export the model
module.exports = Transfer;