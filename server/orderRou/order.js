const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, DataPurchase, Transaction,DataInventory} = require('../schema/schema');

// Geonettech API Configuration
const GEONETTECH_BASE_URL = 'https://testhub.geonettech.site/api/v1';
const GEONETTECH_API_KEY = '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';

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
    
    const response = await geonetClient.get('/checkBalance');
    
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

// Purchase Data Bundle with Inventory Check
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

    // Check if user has purchased data for this phone number in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const recentPurchase = await DataPurchase.findOne({
      userId: userId,
      phoneNumber: phoneNumber,
      createdAt: { $gte: thirtyMinutesAgo }
    }).session(session);
    
    if (recentPurchase) {
      logOperation('DATA_PURCHASE_TOO_FREQUENT', {
        userId,
        phoneNumber,
        lastPurchaseTime: recentPurchase.createdAt,
        timeSinceLastPurchase: Date.now() - recentPurchase.createdAt.getTime()
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Cannot purchase data for the same number within 30 minutes',
        lastPurchaseTime: recentPurchase.createdAt,
        canPurchaseAfter: new Date(recentPurchase.createdAt.getTime() + 30 * 60 * 1000)
      });
    }

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
        requiredAmount:  price
      });
    }

    // Check if the network is in stock
    const inventory = await DataInventory.findOne({ network }).session(session);
    
    logOperation('DATA_INVENTORY_CHECK', {
      network,
      inventoryFound: !!inventory,
      inStock: inventory ? inventory.inStock : false
    });
    
    // Generate unique references
    const transactionReference = `TRX-${uuidv4()}`;
    const orderReference = Math.floor(1000 + Math.random() * 900000);

    // If inventory doesn't exist or inStock is false, create order in waiting status
    if (!inventory || !inventory.inStock) {
      logOperation('DATA_INVENTORY_OUT_OF_STOCK', {
        network,
        skipGeonettech: true
      });
      
      // Create Transaction
      const transaction = new Transaction({
        userId,
        type: 'purchase',
        amount: price,
        status: 'completed', // Still complete the transaction
        reference: transactionReference,
        gateway: 'wallet'
      });

      // Create Data Purchase in waiting status
      const dataPurchase = new DataPurchase({
        userId,
        phoneNumber,
        network,
        capacity,
        gateway: 'wallet',
        method: 'web',
        price,
        status: 'waiting', // Set status to waiting
        geonetReference: orderReference
      });

      logOperation('DATA_PURCHASE_DOCUMENTS_CREATED_WAITING', {
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

      logOperation('DATA_PURCHASE_DOCUMENTS_SAVED_WAITING', {
        transaction: transaction._id,
        dataPurchase: dataPurchase._id,
        userUpdated: user._id
      });

      // Commit transaction
      await session.commitTransaction();
      logOperation('DATABASE_TRANSACTION_COMMITTED', { timestamp: new Date() });

      return res.status(201).json({
        status: 'success',
        message: 'Data bundle order placed in waiting queue',
        data: {
          transaction,
          dataPurchase,
          newWalletBalance: user.walletBalance,
          waitingForInventory: true
        }
      });
    }

    // If inventory is in stock, proceed with Geonettech API
    logOperation('AGENT_BALANCE_CHECK_PRE_PURCHASE', { timestamp: new Date() });
    const agentBalanceResponse = await geonetClient.get('/checkBalance');
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

    logOperation('GEONETTECH_ORDER_REQUEST_PREPARED', {
      network_key: network,
      ref: orderReference,
      recipient: phoneNumber,
      capacity: capacity,
      timestamp: new Date()
    });

    // Place order with Geonettech
    const geonetOrderPayload = {
      network_key: network,
      ref: orderReference,
      recipient: phoneNumber,
      capacity: capacity
    };
    
    logOperation('GEONETTECH_ORDER_REQUEST', geonetOrderPayload);
    
    const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
    
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

// Get User Sales Report
router.get('/sales-report/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { 
      startDate, 
      endDate, 
      network, 
      format = 'json',
      groupBy = 'day' // Options: 'day', 'week', 'month'
    } = req.query;

    logOperation('SALES_REPORT_REQUEST', {
      userId,
      startDate,
      endDate,
      network,
      format,
      groupBy,
      timestamp: new Date()
    });

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logOperation('SALES_REPORT_INVALID_ID', { userId });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      logOperation('SALES_REPORT_USER_NOT_FOUND', { userId });
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Prepare date range
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set time to end of day for end date
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateObj;
      }
    }

    // Prepare network filter
    const networkFilter = {};
    if (network && network !== 'All') {
      networkFilter.network = network;
    }

    // Combine all filters
    const filter = {
      userId,
      ...dateFilter,
      ...networkFilter
    };

    logOperation('SALES_REPORT_FILTER', filter);

    // Fetch all matching purchases
    const purchases = await DataPurchase.find(filter).sort({ createdAt: 1 });

    logOperation('SALES_REPORT_PURCHASES_FOUND', {
      count: purchases.length
    });

    // Generate summary metrics
    const totalSales = purchases.reduce((total, purchase) => total + purchase.price, 0);
    const totalOrders = purchases.length;
    const totalDataSold = purchases.reduce((total, purchase) => {
      // Convert capacity to GB if needed (assuming capacity is in MB)
      const gbValue = purchase.capacity >= 1000 ? purchase.capacity / 1000 : purchase.capacity;
      return total + gbValue;
    }, 0);

    // Group data according to the groupBy parameter
    let groupedData = [];
    
    if (groupBy === 'day') {
      // Group by day
      const grouped = {};
      
      purchases.forEach(purchase => {
        const date = new Date(purchase.createdAt);
        const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!grouped[day]) {
          grouped[day] = {
            date: day,
            sales: 0,
            orders: 0,
            dataSold: 0
          };
        }
        
        grouped[day].sales += purchase.price;
        grouped[day].orders += 1;
        
        // Add data sold in GB
        const gbValue = purchase.capacity >= 1000 ? purchase.capacity / 1000 : purchase.capacity;
        grouped[day].dataSold += gbValue;
      });
      
      groupedData = Object.values(grouped);
      
    } else if (groupBy === 'week') {
      // Group by week (Sunday to Saturday)
      const grouped = {};
      
      purchases.forEach(purchase => {
        const date = new Date(purchase.createdAt);
        const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
        const sunday = new Date(date);
        sunday.setDate(date.getDate() - dayOfWeek);
        const weekStart = sunday.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!grouped[weekStart]) {
          grouped[weekStart] = {
            weekStart,
            sales: 0,
            orders: 0,
            dataSold: 0
          };
        }
        
        grouped[weekStart].sales += purchase.price;
        grouped[weekStart].orders += 1;
        
        // Add data sold in GB
        const gbValue = purchase.capacity >= 1000 ? purchase.capacity / 1000 : purchase.capacity;
        grouped[weekStart].dataSold += gbValue;
      });
      
      groupedData = Object.values(grouped);
      
    } else if (groupBy === 'month') {
      // Group by month
      const grouped = {};
      
      purchases.forEach(purchase => {
        const date = new Date(purchase.createdAt);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM format
        
        if (!grouped[yearMonth]) {
          grouped[yearMonth] = {
            month: yearMonth,
            sales: 0,
            orders: 0,
            dataSold: 0
          };
        }
        
        grouped[yearMonth].sales += purchase.price;
        grouped[yearMonth].orders += 1;
        
        // Add data sold in GB
        const gbValue = purchase.capacity >= 1000 ? purchase.capacity / 1000 : purchase.capacity;
        grouped[yearMonth].dataSold += gbValue;
      });
      
      groupedData = Object.values(grouped);
    }

    // Calculate network distribution
    const networkDistribution = {};
    purchases.forEach(purchase => {
      if (!networkDistribution[purchase.network]) {
        networkDistribution[purchase.network] = {
          count: 0,
          revenue: 0,
          dataSold: 0
        };
      }
      
      networkDistribution[purchase.network].count += 1;
      networkDistribution[purchase.network].revenue += purchase.price;
      
      // Add data sold in GB
      const gbValue = purchase.capacity >= 1000 ? purchase.capacity / 1000 : purchase.capacity;
      networkDistribution[purchase.network].dataSold += gbValue;
    });

    // Format the response based on requested format
    if (format === 'csv') {
      // Generate CSV
      let csv = 'Date,Orders,Sales,Data Sold (GB)\n';
      
      groupedData.forEach(data => {
        const dateField = data.date || data.weekStart || data.month;
        csv += `${dateField},${data.orders},${data.sales.toFixed(2)},${data.dataSold.toFixed(2)}\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales_report_${userId}_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } else {
      // Return JSON
      res.json({
        status: 'success',
        data: {
          summary: {
            totalSales,
            totalOrders,
            totalDataSold: parseFloat(totalDataSold.toFixed(2)),
            startDate: dateFilter.createdAt?.$gte || null,
            endDate: dateFilter.createdAt?.$lte || null,
            user: {
              id: user._id,
              name: user.name,
              email: user.email
            }
          },
          details: groupedData.map(item => ({
            ...item,
            sales: parseFloat(item.sales.toFixed(2)),
            dataSold: parseFloat(item.dataSold.toFixed(2))
          })),
          networkDistribution: Object.entries(networkDistribution).map(([network, data]) => ({
            network,
            count: data.count,
            revenue: parseFloat(data.revenue.toFixed(2)),
            dataSold: parseFloat(data.dataSold.toFixed(2)),
            percentage: parseFloat((data.count / totalOrders * 100).toFixed(2))
          }))
        }
      });
    }
  } catch (error) {
    logOperation('SALES_REPORT_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate sales report',
      details: error.message
    });
  }
});

router.get('/users-leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    logOperation('REALTIME_LEADERBOARD_REQUEST', {
      limit,
      timestamp: new Date()
    });

    // Get current timestamp for real-time reference
    const currentTime = new Date();
    
    // Aggregate pipeline for leaderboard
    const leaderboard = await DataPurchase.aggregate([
      // Group by userId
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$price' },
          lastOrderDate: { $max: '$createdAt' },
          // Store most recent orders (up to 5)
          recentOrders: { 
            $push: {
              createdAt: '$createdAt',
              price: '$price',
              phoneNumber: '$phoneNumber',
              network: '$network',
              capacity: '$capacity'
            }
          }
        }
      },
      // Sort primarily by order count (descending)
      {
        $sort: { 
          orderCount: -1,  // Primary sort: highest order count first
          lastOrderDate: -1  // Secondary sort: most recent orders first (for tiebreakers)
        }
      },
      // Limit to specified number of top users
      {
        $limit: parseInt(limit)
      },
      // Add user details
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      // Unwind the userDetails array
      {
        $unwind: '$userDetails'
      },
      // Sort the recent orders and limit to most recent 5
      {
        $addFields: {
          recentOrders: {
            $slice: [
              { $sortArray: { input: '$recentOrders', sortBy: { createdAt: -1 } } },
              5
            ]
          }
        }
      },
      // Format response
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$userDetails.name',
          email: '$userDetails.email',
          phoneNumber: '$userDetails.phoneNumber',
          orderCount: 1,
          totalSpent: 1,
          lastOrderDate: 1,
          recentOrders: 1,
          // Time since last order in minutes
          minutesSinceLastOrder: {
            $divide: [
              { $subtract: [currentTime, '$lastOrderDate'] },
              1000 * 60  // Convert ms to minutes
            ]
          },
          // Average order value
          averageOrderValue: { $divide: ['$totalSpent', '$orderCount'] }
        }
      }
    ]);

    logOperation('REALTIME_LEADERBOARD_RESULTS', {
      count: leaderboard.length,
      timestamp: currentTime
    });

    // Format and add ranking
    const formattedLeaderboard = leaderboard.map((user, index) => {
      // Format time since last order
      let timeSinceLastOrder;
      const minutes = Math.floor(user.minutesSinceLastOrder);
      
      if (minutes < 1) {
        timeSinceLastOrder = 'Just now';
      } else if (minutes < 60) {
        timeSinceLastOrder = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (minutes < 1440) { // Less than a day
        const hours = Math.floor(minutes / 60);
        timeSinceLastOrder = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        const days = Math.floor(minutes / 1440);
        timeSinceLastOrder = `${days} ${days === 1 ? 'day' : 'days'} ago`;
      }
      
      // Return formatted user object with rank
      return {
        rank: index + 1,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        orderCount: user.orderCount,
        totalSpent: parseFloat(user.totalSpent.toFixed(2)),
        averageOrderValue: parseFloat(user.averageOrderValue.toFixed(2)),
        lastOrderDate: user.lastOrderDate,
        timeSinceLastOrder,
        // Format recent orders
        recentOrders: user.recentOrders.map(order => ({
          ...order,
          price: parseFloat(order.price.toFixed(2)),
          createdAt: order.createdAt,
          formattedDate: new Date(order.createdAt).toLocaleString()
        }))
      };
    });

    // Add live update information
    res.json({
      status: 'success',
      data: {
        leaderboard: formattedLeaderboard,
        lastUpdated: currentTime,
        updateMessage: 'Leaderboard is live. Data refreshes automatically.',
        serverTime: currentTime
      }
    });

  } catch (error) {
    logOperation('REALTIME_LEADERBOARD_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch real-time users leaderboard',
      details: error.message
    });
  }
});

// Websocket real-time leaderboard (add this if you're using Socket.io)
// This function can be called periodically to emit updates to connected clients
const emitLeaderboardUpdate = async (io) => {
  try {
    logOperation('SOCKET_LEADERBOARD_UPDATE', {
      timestamp: new Date()
    });

    const currentTime = new Date();
    
    // Same aggregation pipeline as the HTTP endpoint
    const leaderboard = await DataPurchase.aggregate([
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$price' },
          lastOrderDate: { $max: '$createdAt' }
        }
      },
      {
        $sort: { 
          orderCount: -1,
          lastOrderDate: -1
        }
      },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$userDetails.name',
          email: '$userDetails.email',
          orderCount: 1,
          totalSpent: 1,
          lastOrderDate: 1
        }
      }
    ]);

    // Format the leaderboard
    const formattedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      name: user.name,
      email: user.email,
      orderCount: user.orderCount,
      totalSpent: parseFloat(user.totalSpent.toFixed(2)),
      lastOrderDate: user.lastOrderDate
    }));

    // Emit the updated leaderboard to all connected clients
    io.emit('leaderboardUpdate', {
      leaderboard: formattedLeaderboard,
      lastUpdated: currentTime
    });

    logOperation('SOCKET_LEADERBOARD_EMITTED', {
      usersCount: formattedLeaderboard.length,
      timestamp: currentTime
    });
    
  } catch (error) {
    logOperation('SOCKET_LEADERBOARD_ERROR', {
      message: error.message,
      stack: error.stack
    });
  }
};
// Daily Sales Route - GET endpoint (Fixed for String Dates)
router.get('/daily-sales', async (req, res) => {
  try {
    const { userId, days = 7 } = req.query;
    
    // Log the operation
    logOperation('DAILY_SALES_REQUEST', {
      userId: userId || 'all',
      days,
      timestamp: new Date()
    });

    // Calculate date range (for the past X days)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of current day
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(days) - 1));
    startDate.setHours(0, 0, 0, 0); // Start of first day
    
    // Format dates as strings for comparison (YYYY-MM-DD format)
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    
    console.log('Date range for query:', { startDateStr, endDateStr });
    
    // Build query object
    const query = {};
    if (userId) {
      try {
        // Try to convert to ObjectId if it's in that format
        const { ObjectId } = require('mongodb');
        query.userId = new ObjectId(userId);
      } catch (err) {
        // If conversion fails, use as a string
        console.log('Using userId as string:', userId);
        query.userId = userId;
      }
    }
    
    // Get a sample record to check the data structure
    const sampleRecords = await DataPurchase.find().limit(2).lean();
    console.log('Sample records:', JSON.stringify(sampleRecords, null, 2));
    
    // First approach: Try to use $expr with $substr if dates are stored as strings
    // This handles the case where createdAt is stored as a string like "2025-04-01T12:34:56.789Z"
    const dailySales = await DataPurchase.aggregate([
      // Initial match to reduce dataset size
      {
        $match: userId ? { userId: query.userId } : {}
      },
      
      // Add a day field by extracting just the date part of the createdAt string
      {
        $addFields: {
          // Extract YYYY-MM-DD from the date string
          dayStr: {
            $substr: ["$createdAt", 0, 10]  // First 10 chars of ISO date string
          }
        }
      },
      
      // Now filter by the date range using the extracted day string
      {
        $match: {
          dayStr: { $gte: startDateStr, $lte: endDateStr }
        }
      },
      
      // Group by day
      {
        $group: {
          _id: "$dayStr",
          // We'll format this later since we can't use date operations on strings
          orderCount: { $sum: 1 },
          revenue: { $sum: "$price" },
          orders: {
            $push: {
              id: "$_id",
              phoneNumber: "$phoneNumber",
              price: "$price",
              network: "$network",
              capacity: "$capacity",
              createdAt: "$createdAt" 
            }
          }
        }
      },
      
      // Sort by date string
      { $sort: { _id: 1 } }
    ]);
    
    console.log('Query results count:', dailySales.length);
    
    // Generate a complete date range (including days with no sales)
    const completeDateRange = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const formattedDay = currentDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Check if we have data for this day
      const existingData = dailySales.find(day => day._id === dateString);
      
      if (existingData) {
        completeDateRange.push({
          date: new Date(dateString), // Convert back to Date object
          dayString: dateString,
          dayFormatted: formattedDay,
          orderCount: existingData.orderCount,
          revenue: Math.round(existingData.revenue * 100) / 100, // Round to 2 decimal places
          averageOrderValue: existingData.orderCount > 0 
            ? Math.round((existingData.revenue / existingData.orderCount) * 100) / 100
            : 0,
          topOrders: existingData.orders.slice(0, 5) // Take top 5 orders
        });
      } else {
        // Add empty data for days with no sales
        completeDateRange.push({
          date: new Date(dateString),
          dayString: dateString,
          dayFormatted: formattedDay,
          orderCount: 0,
          revenue: 0,
          averageOrderValue: 0,
          topOrders: []
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Format data for chart consumption
    const chartData = {
      labels: completeDateRange.map(day => day.dayFormatted),
      revenue: completeDateRange.map(day => day.revenue),
      orders: completeDateRange.map(day => day.orderCount)
    };

    // Calculate period totals and metrics
    const totalOrders = completeDateRange.reduce((sum, day) => sum + day.orderCount, 0);
    const totalRevenue = completeDateRange.reduce((sum, day) => sum + day.revenue, 0);
    const periodAverageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Identify best performing day
    let bestDay = null;
    let bestDayRevenue = -1;
    
    completeDateRange.forEach(day => {
      if (day.revenue > bestDayRevenue) {
        bestDayRevenue = day.revenue;
        bestDay = day;
      }
    });

    // Respond with formatted data
    res.json({
      status: 'success',
      data: {
        dailySales: completeDateRange,
        metrics: {
          totalPeriodOrders: totalOrders,
          totalPeriodRevenue: parseFloat(totalRevenue.toFixed(2)),
          periodAverageOrderValue: parseFloat(periodAverageOrderValue.toFixed(2)),
          bestPerformingDay: bestDay ? {
            date: bestDay.dayFormatted,
            revenue: bestDay.revenue,
            orderCount: bestDay.orderCount
          } : null
        },
        chartData,
        timeRange: {
          start: startDate,
          end: endDate,
          days: parseInt(days)
        }
      }
    });

  } catch (error) {
    console.error('Daily sales error:', error);
    
    logOperation('DAILY_SALES_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch daily sales data',
      details: error.message
    });
  }
});
module.exports = router;