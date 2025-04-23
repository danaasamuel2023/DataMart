// Process bulk data bundle orders
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, DataPurchase, Transaction, DataInventory } = require('../schema/schema');

// Geonettech API Configuration
const GEONETTECH_BASE_URL = 'https://connect.geonettech.com/api/v1';
const GEONETTECH_API_KEY = '21|rkrw7bcoGYjK8irAOTMaZ8sc1LRHYcwjuZnZmMNw4a6196f1';

// Create Geonettech client
const geonetClient = axios.create({
  baseURL: GEONETTECH_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GEONETTECH_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Enhanced logging function
const logOperation = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
};

// Process bulk data bundle orders
router.post('/bulk-purchase-data', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    // Start transaction with extended timeout (90 seconds)
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxTimeMS: 90000 // Increase timeout to 90 seconds
    });
    
    const { userId, orders } = req.body;

    logOperation('BULK_PURCHASE_REQUEST', {
      userId,
      orderCount: orders.length,
      timestamp: new Date()
    });

    // Validate input
    if (!userId || !Array.isArray(orders) || orders.length === 0) {
      logOperation('BULK_PURCHASE_VALIDATION_ERROR', {
        hasUserId: !!userId,
        hasOrders: Array.isArray(orders),
        orderCount: Array.isArray(orders) ? orders.length : 0
      });
      
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request. Must include userId and a non-empty array of orders'
      });
    }

    // Find user
    const user = await User.findById(userId).session(session);
    if (!user) {
      logOperation('BULK_PURCHASE_USER_NOT_FOUND', { userId });
      
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Validate each order and calculate total cost
    let totalCost = 0;
    const validatedOrders = [];
    const invalidOrders = [];
    const recentlyPurchasedNumbers = [];
    const duplicateNumbers = [];
    
    // Check for recent purchases (last 30 minutes) from our database
    const thirtyMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPurchases = await DataPurchase.find({
      userId: userId,
      createdAt: { $gte: thirtyMinutesAgo }
    }).session(session);
    
    const recentPhoneNumbers = new Set(recentPurchases.map(purchase => purchase.phoneNumber));

    // Check for recent purchases (last 5 minutes) from Geonettech
    // This is a pre-validation to prevent known duplicates before sending to API
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const veryRecentPurchases = await DataPurchase.find({
      createdAt: { $gte: fiveMinutesAgo }
    }).session(session);
    
    const veryRecentPhoneNumbers = new Set(veryRecentPurchases.map(purchase => purchase.phoneNumber));

    // Track unique phone numbers within this batch to prevent duplicates
    const phoneNumbersInBatch = new Set();

    // Validate each order in the bulk request
    for (const order of orders) {
      const { phoneNumber, network, capacity, price } = order;
      
      // Basic validation
      if (!phoneNumber || !network || !capacity || !price) {
        invalidOrders.push({
          ...order,
          reason: 'Missing required fields'
        });
        continue;
      }
      
      // Clean the phone number for consistency
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Check for duplicates within the same batch
      if (phoneNumbersInBatch.has(cleanPhoneNumber)) {
        duplicateNumbers.push({
          ...order,
          reason: 'Duplicate phone number within this order batch'
        });
        continue;
      }
      
      // Add to our set of phone numbers in this batch
      phoneNumbersInBatch.add(cleanPhoneNumber);
      
      // Check for recent purchases for this phone number (30 minute rule - our database)
      if (recentPhoneNumbers.has(cleanPhoneNumber)) {
        recentlyPurchasedNumbers.push({
          ...order,
          reason: 'Cannot purchase data for the same number within 30 minutes'
        });
        continue;
      }
      
      // Check for very recent purchases (5 minute rule - Geonettech's limitation)
      if (veryRecentPhoneNumbers.has(cleanPhoneNumber)) {
        recentlyPurchasedNumbers.push({
          ...order,
          reason: 'Cannot purchase data for the same number within 5 minutes (provider limitation)'
        });
        continue;
      }
      
      // Verify network availability
      const inventory = await DataInventory.findOne({ network }).session(session);
      if (!inventory || !inventory.inStock) {
        invalidOrders.push({
          ...order,
          reason: 'Network not available or out of stock'
        });
        continue;
      }
      
      // Verify pricing matches our expected prices
      // This is to prevent users from tampering with prices on the frontend
      const expectedPriceEntry = getPriceForCapacity(capacity, network);
      if (!expectedPriceEntry || Math.abs(expectedPriceEntry.price - price) > 0.01) {
        invalidOrders.push({
          ...order,
          reason: 'Invalid price for the selected data amount'
        });
        continue;
      }
      
      // Add to valid orders and total cost
      validatedOrders.push({
        ...order,
        phoneNumber: cleanPhoneNumber, // Use the cleaned phone number
        orderReference: Math.floor(1000 + Math.random() * 900000),
        transactionReference: `TRX-${uuidv4()}`
      });
      
      totalCost += price;
    }

    // Check if there are any valid orders to process
    if (validatedOrders.length === 0) {
      logOperation('BULK_PURCHASE_NO_VALID_ORDERS', {
        invalidCount: invalidOrders.length,
        recentlyPurchasedCount: recentlyPurchasedNumbers.length,
        duplicateCount: duplicateNumbers.length
      });
      
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'No valid orders to process',
        data: {
          invalidOrders,
          recentlyPurchasedNumbers,
          duplicateNumbers
        }
      });
    }

    // Check user wallet balance
    if (user.walletBalance < totalCost) {
      logOperation('BULK_PURCHASE_INSUFFICIENT_BALANCE', {
        userId,
        walletBalance: user.walletBalance,
        requiredAmount: totalCost,
        shortfall: totalCost - user.walletBalance
      });
      
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient wallet balance for bulk purchase',
        data: {
          currentBalance: user.walletBalance,
          requiredAmount: totalCost,
          validOrderCount: validatedOrders.length,
          invalidOrderCount: invalidOrders.length,
          recentlyPurchasedCount: recentlyPurchasedNumbers.length,
          duplicateCount: duplicateNumbers.length
        }
      });
    }

    // *** IMPORTANT: We'll first update the local database before making API call ***
    // This prevents the MongoDB transaction from timing out during the API call
    
    // Update user wallet balance first
    const previousBalance = user.walletBalance;
    user.walletBalance -= totalCost;
    await user.save({ session });
    
    // Check agent balance - this call is outside the transaction
    let agentBalanceResponse;
    try {
      // End the MongoDB session temporarily to make API calls
      await session.commitTransaction();
      session.endSession();
      
      agentBalanceResponse = await geonetClient.get('/wallet/balance');
      const agentBalance = parseFloat(agentBalanceResponse.data.data.balance.replace(/,/g, ''));
      
      if (agentBalance < totalCost) {
        logOperation('BULK_PURCHASE_AGENT_INSUFFICIENT_BALANCE', {
          agentBalance,
          requiredAmount: totalCost
        });
        
        // Since we already committed the wallet update, we need to refund the user
        await refundUser(userId, totalCost, 'Insufficient agent balance');
        
        return res.status(400).json({
          status: 'error',
          message: 'Service provider has insufficient balance for bulk purchase. Your wallet has been refunded.'
        });
      }
      
      // Prepare Geonettech API payload
      const geonetOrderPayload = validatedOrders.map(order => ({
        network_key: order.network,
        ref: order.orderReference,
        recipient: order.phoneNumber,
        capacity: order.capacity
      }));
      
      logOperation('GEONETTECH_BULK_ORDER_REQUEST', {
        orderCount: geonetOrderPayload.length,
        totalValue: totalCost
      });
      
      // Send bulk request to Geonettech API
      const geonetResponse = await geonetClient.post('/orders', geonetOrderPayload);
      
      logOperation('GEONETTECH_BULK_ORDER_RESPONSE', {
        status: geonetResponse.status,
        data: geonetResponse.data
      });
      
      // Process the response and create records (outside of the MongoDB transaction)
      const successfulOrders = geonetResponse.data.data.orders || [];
      const failedOrders = geonetResponse.data.data.failed_orders || [];
      const successfulRefs = new Set(successfulOrders.map(order => order.ref.toString()));
      
      // Track failed orders from the API response
      const apiFailedOrders = [];
      
      // Map failed orders to a more useful format
      failedOrders.forEach(failedOrder => {
        apiFailedOrders.push({
          phoneNumber: failedOrder.recipient,
          network: failedOrder.network || network,
          capacity: failedOrder.capacity,
          reason: failedOrder.message || 'Order processing failed'
        });
      });
      
      // Create transaction and data purchase records
      const transactions = [];
      const dataPurchases = [];
      let refundAmount = 0;
      
      for (const order of validatedOrders) {
        const isSuccessful = successfulRefs.has(order.orderReference.toString());
        const status = isSuccessful ? 'completed' : 'failed';
        
        // Create transaction record
        const transaction = new Transaction({
          userId,
          type: 'purchase',
          amount: order.price,
          status: 'completed', // We still complete the transaction
          reference: order.transactionReference,
          gateway: 'wallet'
        });
        
        // Create data purchase record
        const dataPurchase = new DataPurchase({
          userId,
          phoneNumber: order.phoneNumber,
          network: order.network,
          capacity: order.capacity,
          gateway: 'wallet',
          method: 'web',
          price: order.price,
          status,
          geonetReference: order.orderReference
        });
        
        transactions.push(transaction);
        dataPurchases.push(dataPurchase);
        
        // If order failed, track amount for refund
        if (!isSuccessful) {
          refundAmount += order.price;
        }
      }
      
      // Save all transactions and data purchases without transaction
      for (const transaction of transactions) {
        await transaction.save();
      }
      
      for (const dataPurchase of dataPurchases) {
        await dataPurchase.save();
      }
      
      // Refund failed orders if any
      if (refundAmount > 0) {
        await refundUser(userId, refundAmount, 'Partial refund for failed orders');
        logOperation('PARTIAL_REFUND', {
          userId,
          refundAmount,
          failedOrders: apiFailedOrders.length
        });
      }
      
      // Get updated user balance
      const updatedUser = await User.findById(userId);
      const finalBalance = updatedUser ? updatedUser.walletBalance : user.walletBalance;
      
      logOperation('BULK_PURCHASE_COMPLETED', {
        userId,
        totalCost,
        previousBalance,
        newBalance: finalBalance,
        totalOrders: validatedOrders.length,
        successfulOrders: successfulRefs.size,
        failedOrders: apiFailedOrders.length,
        refundAmount
      });
      
      // Prepare response
      res.status(201).json({
        status: 'success',
        message: 'Bulk data purchase processed',
        data: {
          totalOrders: orders.length,
          validOrders: validatedOrders.length,
          successfulOrders: successfulRefs.size,
          failedOrders: apiFailedOrders,
          newWalletBalance: finalBalance,
          totalCost,
          refundAmount,
          invalidOrders,
          duplicateNumbers,
          recentlyPurchasedNumbers,
          geonetechResponse: geonetResponse.data
        }
      });
      
    } catch (apiError) {
      // If the API call fails after we committed the transaction, refund the user
      logOperation('GEONETTECH_API_ERROR', {
        message: apiError.message,
        response: apiError.response ? apiError.response.data : null
      });
      
      await refundUser(userId, totalCost, 'Failed API call');
      
      // Extract specific error messages from the Geonettech response
      let errorDetails = apiError.message;
      let failedOrders = [];
      
      if (apiError.response && apiError.response.data) {
        // Check if we have specific error details from Geonettech
        if (apiError.response.data.data && apiError.response.data.data.failed_orders) {
          failedOrders = apiError.response.data.data.failed_orders.map(order => ({
            phoneNumber: order.recipient,
            reason: order.message || 'Order processing failed',
            network: order.network,
            capacity: order.capacity
          }));
          
          errorDetails = apiError.response.data.message || errorDetails;
        }
      }
      
      return res.status(400).json({
        status: 'error',
        message: 'Failed to process bulk data purchase. Your wallet has been refunded.',
        data: {
          errorDetails,
          failedOrders,
          totalRefunded: totalCost,
          newWalletBalance: (await User.findById(userId)).walletBalance
        }
      });
    }

  } catch (error) {
    // Handle database errors
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    
    logOperation('BULK_PURCHASE_ERROR', {
      message: error.message,
      stack: error.stack,
      response: error.response ? error.response.data : null
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to process bulk data purchase',
      details: error.response ? error.response.data : error.message
    });
  }
});

// Helper function to refund a user after a failed API call
async function refundUser(userId, amount, reason) {
  try {
    // Find the user and update wallet balance
    const user = await User.findById(userId);
    if (user) {
      user.walletBalance += amount;
      await user.save();
      
      // Create refund transaction
      const refundTransaction = new Transaction({
        userId,
        type: 'refund',
        amount,
        status: 'completed',
        reference: `REFUND-${uuidv4()}`,
        gateway: 'wallet',
        description: `Refund for failed bulk purchase: ${reason}`
      });
      
      await refundTransaction.save();
      
      logOperation('USER_REFUNDED', {
        userId,
        amount,
        reason,
        newBalance: user.walletBalance
      });
    }
  } catch (refundError) {
    logOperation('REFUND_ERROR', {
      userId,
      amount,
      error: refundError.message
    });
  }
}

// Helper function to get the price for a specific capacity and network
function getPriceForCapacity(capacity, network) {
  // This matches your pricing data
  const pricesList = [
    { capacity: 1, mb: 1000, price: 4.30, network: 'YELLO' },
    { capacity: 2, mb: 2000, price: 9.20, network: 'YELLO' },
    { capacity: 3, mb: 3000, price: 13.5, network: 'YELLO' },
    { capacity: 4, mb: 4000, price: 18.50, network: 'YELLO' },
    { capacity: 5, mb: 5000, price: 23.50, network: 'YELLO' },
    { capacity: 6, mb: 6000, price: 27.00, network: 'YELLO' },
    { capacity: 8, mb: 8000, price: 35.50, network: 'YELLO' },
    { capacity: 10, mb: 10000, price: 43.50, network: 'YELLO' },
    { capacity: 15, mb: 15000, price: 62.50, network: 'YELLO' },
    { capacity: 20, mb: 20000, price: 83.00, network: 'YELLO' },
    { capacity: 25, mb: 25000, price: 105.00, network: 'YELLO' },
    { capacity: 30, mb: 30000, price: 129.00, network: 'YELLO' },
    { capacity: 40, mb: 40000, price: 166.00, network: 'YELLO' },
    { capacity: 50, mb: 50000, price: 207.00, network: 'YELLO' },
    { capacity: 100, mb: 100000, price: 407.00, network: 'YELLO' }
  ];
  
  // Convert input capacity to number if it's a string
  const capacityNum = typeof capacity === 'string' ? parseInt(capacity, 10) : capacity;
  
  return pricesList.find(p => p.capacity === capacityNum && p.network === network);
}

module.exports = router;