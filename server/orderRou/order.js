const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, DataPurchase, Transaction } = require('../schema/schema');

// Geonettech API Configuration
const GEONETTECH_BASE_URL = 'https://posapi.geonettech.com/api/v1';
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

// Check Agent Wallet Balance
router.get('/agent-balance', async (req, res) => {
  try {
    logOperation('AGENT_BALANCE_REQUEST', { timestamp: new Date() });
    
    const response = await geonetClient.get('/wallet/balance');
    
    logOperation('AGENT_BALANCE_RESPONSE', {
      status: response.status,
      data: response.data
    });
    
    res.json({
      status: 'success',
      data: {
        balance: parseFloat(response.data.data.balance.replace(/,/g, ''))
      }
    });
  } catch (error) {
    logOperation('AGENT_BALANCE_ERROR', {
      message: error.message,
      response: error.response ? error.response.data : null,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch agent balance',
      details: error.response ? error.response.data : error.message
    });
  }
});

// Purchase Data Bundle
router.post('/purchase-data', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      userId, 
      phoneNumber, 
      network, 
      capacity, 
      price 
    } = req.body;

    logOperation('DATA_PURCHASE_REQUEST', {
      userId,
      phoneNumber,
      network,
      capacity,
      price,
      timestamp: new Date()
    });

    // Validate inputs
    if (!userId || !phoneNumber || !network || !capacity || !price) {
      logOperation('DATA_PURCHASE_VALIDATION_ERROR', {
        missingFields: {
          userId: !userId,
          phoneNumber: !phoneNumber,
          network: !network,
          capacity: !capacity,
          price: !price
        }
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Find user
    const user = await User.findById(userId).session(session);
    if (!user) {
      logOperation('DATA_PURCHASE_USER_NOT_FOUND', { userId });
      throw new Error('User not found');
    }

    logOperation('DATA_PURCHASE_USER_FOUND', {
      userId,
      currentBalance: user.walletBalance,
      requestedPurchaseAmount: price
    });

    // Check user wallet balance
    if (user.walletBalance < price) {
      logOperation('DATA_PURCHASE_INSUFFICIENT_BALANCE', {
        userId,
        walletBalance: user.walletBalance,
        requiredAmount: price,
        shortfall: price - user.walletBalance
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient wallet balance',
        currentBalance: user.walletBalance,
        requiredAmount: price
      });
    }

    // Check agent wallet balance
    logOperation('AGENT_BALANCE_CHECK_PRE_PURCHASE', { timestamp: new Date() });
    const agentBalanceResponse = await geonetClient.get('/wallet/balance');
    const agentBalance = parseFloat(agentBalanceResponse.data.data.balance.replace(/,/g, ''));
    
    logOperation('AGENT_BALANCE_RESULT', {
      balance: agentBalance,
      requiredAmount: price,
      sufficient: agentBalance >= price
    });
    
    if (agentBalance < price) {
      logOperation('AGENT_INSUFFICIENT_BALANCE', {
        agentBalance,
        requiredAmount: price
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Service provider out of stock'
      });
    }

    // Generate unique references
    const transactionReference = `TRX-${uuidv4()}`;
    const orderReference = `ORDER-${uuidv4()}`;

    logOperation('GEONETTECH_ORDER_REQUEST_PREPARED', {
      network_key: network,
      ref: orderReference,
      recipient: phoneNumber,
      capacity: capacity,
      timestamp: new Date()
    });

    // Place order with Geonettech
    const geonetOrderPayload = [{
      network_key: network,
      ref: orderReference,
      recipient: phoneNumber,
      capacity: capacity
    }];
    
    logOperation('GEONETTECH_ORDER_REQUEST', geonetOrderPayload);
    
    const geonetResponse = await geonetClient.post('/orders', geonetOrderPayload);
    
    logOperation('GEONETTECH_ORDER_RESPONSE', {
      status: geonetResponse.status,
      statusText: geonetResponse.statusText,
      headers: geonetResponse.headers,
      data: geonetResponse.data,
      timestamp: new Date()
    });

    // Create Transaction
    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: price,
      status: 'completed',
      reference: transactionReference,
      gateway: 'wallet'
    });

    // Create Data Purchase
    const dataPurchase = new DataPurchase({
      userId,
      phoneNumber,
      network,
      capacity,
      gateway: 'wallet',
      method: 'web',
      price,
      status: 'completed',
      geonetReference: orderReference
    });

    logOperation('DATA_PURCHASE_DOCUMENTS_CREATED', {
      transaction: transaction.toJSON(),
      dataPurchase: dataPurchase.toJSON()
    });

    // Update user wallet
    const previousBalance = user.walletBalance;
    user.walletBalance -= price;

    logOperation('USER_WALLET_UPDATE', {
      userId,
      previousBalance,
      newBalance: user.walletBalance,
      deduction: price
    });

    // Save all documents
    await transaction.save({ session });
    await dataPurchase.save({ session });
    await user.save({ session });

    logOperation('DATA_PURCHASE_DOCUMENTS_SAVED', {
      transaction: transaction._id,
      dataPurchase: dataPurchase._id,
      userUpdated: user._id
    });

    // Commit transaction
    await session.commitTransaction();
    logOperation('DATABASE_TRANSACTION_COMMITTED', { timestamp: new Date() });

    res.status(201).json({
      status: 'success',
      message: 'Data bundle purchased successfully',
      data: {
        transaction,
        dataPurchase,
        newWalletBalance: user.walletBalance,
        geonetechResponse: geonetResponse.data
      }
    });

  } catch (error) {
    // Rollback transaction
    await session.abortTransaction();
    logOperation('DATABASE_TRANSACTION_ABORTED', {
      reason: error.message,
      timestamp: new Date()
    });

    logOperation('DATA_PURCHASE_ERROR', {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      request: error.request ? {
        method: error.request.method,
        path: error.request.path,
        headers: error.request.headers
      } : null
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to purchase data bundle',
      details: error.response ? error.response.data : error.message
    });
  } finally {
    // End the session
    session.endSession();
    logOperation('DATABASE_SESSION_ENDED', { timestamp: new Date() });
  }
});

// Check Order Status
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    logOperation('ORDER_STATUS_CHECK_REQUEST', { 
      orderId,
      timestamp: new Date() 
    });

    // Find local order
    const localOrder = await DataPurchase.findOne({ 
      orderId: orderId 
    });

    if (!localOrder) {
      logOperation('ORDER_STATUS_CHECK_NOT_FOUND', { orderId });
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    logOperation('ORDER_STATUS_LOCAL_ORDER_FOUND', {
      orderId,
      localStatus: localOrder.status,
      geonetReference: localOrder.geonetReference
    });

    // Check status with Geonettech
    logOperation('GEONETTECH_STATUS_CHECK_REQUEST', {
      geonetReference: localOrder.geonetReference
    });
    
    const geonetResponse = await geonetClient.get(`/order-status/${localOrder.geonetReference}`);
    
    logOperation('GEONETTECH_STATUS_CHECK_RESPONSE', {
      status: geonetResponse.status,
      data: geonetResponse.data
    });
    
    // Update local order status if needed
    if (geonetResponse.data.status === 'completed' && 
        localOrder.status !== 'completed') {
      
      logOperation('ORDER_STATUS_UPDATE_REQUIRED', {
        oldStatus: localOrder.status,
        newStatus: 'completed'
      });
      
      localOrder.status = 'completed';
      await localOrder.save();
      
      logOperation('ORDER_STATUS_UPDATE_COMPLETED', {
        orderId,
        status: localOrder.status
      });
    }

    res.json({
      status: 'success',
      data: {
        localOrder,
        geonetechStatus: geonetResponse.data
      }
    });

  } catch (error) {
    logOperation('ORDER_STATUS_CHECK_ERROR', {
      message: error.message,
      response: error.response ? error.response.data : null,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to check order status',
      details: error.response ? error.response.data : error.message
    });
  }
});

// Get User Data Purchase History
router.get('/purchase-history/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, network } = req.query;
    const userId = req.params.userId;

    logOperation('PURCHASE_HISTORY_REQUEST', {
      userId,
      page,
      limit,
      startDate,
      endDate,
      network
    });

    // Prepare filter object
    const filter = { userId };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set time to end of day for end date
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }
    
    // Add network filter if provided
    if (network && network !== 'All') {
      filter.network = network;
    }

    logOperation('PURCHASE_HISTORY_FILTER', filter);

    const purchases = await DataPurchase.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await DataPurchase.countDocuments(filter);

    logOperation('PURCHASE_HISTORY_RESULTS', {
      totalFound: total,
      returnedCount: purchases.length,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit)
    });

    res.json({
      status: 'success',
      data: {
        purchases,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalPurchases: total
        }
      }
    });

  } catch (error) {
    logOperation('PURCHASE_HISTORY_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch purchase history'
    });
  }
});

// Get User Transaction History for All Transactions Page
router.get('/user-transactions/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, network, phoneNumber } = req.query;
    const userId = req.params.userId;

    logOperation('USER_TRANSACTIONS_REQUEST', {
      userId,
      page,
      limit,
      startDate,
      endDate,
      network,
      phoneNumber
    });

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logOperation('USER_TRANSACTIONS_INVALID_ID', { userId });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    // Prepare filter object
    const filter = { userId };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set time to end of day for end date
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }
    
    // Add network filter if provided
    if (network && network !== 'All') {
      filter.network = network;
    }
    
    // Add phone number search if provided
    if (phoneNumber) {
      filter.phoneNumber = { $regex: phoneNumber, $options: 'i' };
    }

    logOperation('USER_TRANSACTIONS_FILTER', filter);

    const transactions = await DataPurchase.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalCount = await DataPurchase.countDocuments(filter);

    logOperation('USER_TRANSACTIONS_RESULTS', {
      totalFound: totalCount,
      returnedCount: transactions.length,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit))
    });z

    res.json({
      status: 'success',
      data: {
        transactions,
        totalCount,
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });

  } catch (error) {
    logOperation('USER_TRANSACTIONS_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user transactions',
      details: error.message
    });
  }
});

router.get('/user-dashboard/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    logOperation('USER_DASHBOARD_REQUEST', { userId });

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logOperation('USER_DASHBOARD_INVALID_ID', { userId });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      logOperation('USER_DASHBOARD_USER_NOT_FOUND', { userId });
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    logOperation('USER_DASHBOARD_USER_FOUND', {
      userId,
      walletBalance: user.walletBalance
    });

    // Get today's start and end
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    logOperation('USER_DASHBOARD_TODAY_ORDERS_QUERY', {
      userId,
      startDate: today,
      endDate: tomorrow
    });

    // Fetch today's orders
    const todayOrders = await DataPurchase.find({
      userId: userId,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ createdAt: -1 });

    logOperation('USER_DASHBOARD_TODAY_ORDERS_FOUND', {
      count: todayOrders.length,
      orderIds: todayOrders.map(order => order._id)
    });

    // Calculate today's total order value
    const todayTotalOrderValue = todayOrders.reduce((total, order) => total + order.price, 0);
    
    // Calculate total GB sold today
    const totalGbSoldToday = todayOrders.reduce((total, order) => {
      // Convert MB to GB if necessary (assuming capacity is in MB)
      const gbValue = order.capacity >= 1000 ? order.capacity / 1000 : order.capacity;
      return total + gbValue;
    }, 0);

    // Format GB value to 2 decimal places
    const formattedGbSold = parseFloat(totalGbSoldToday.toFixed(2));

    logOperation('USER_DASHBOARD_CALCULATIONS', {
      totalOrderValue: todayTotalOrderValue,
      totalGbSold: formattedGbSold
    });

    // Prepare response
    res.json({
      status: 'success',
      data: {
        userBalance: user.walletBalance,
        todayOrders: {
          count: todayOrders.length,
          totalValue: todayTotalOrderValue,
          totalGbSold: formattedGbSold,
          amountSpentToday: todayTotalOrderValue,
          orders: todayOrders
        }
      }
    });

  } catch (error) {
    logOperation('USER_DASHBOARD_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user dashboard information',
      details: error.message
    });
  }
});

module.exports = router;