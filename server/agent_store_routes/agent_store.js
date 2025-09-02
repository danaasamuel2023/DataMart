// routes/agentStoreRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const auth = require('../middlewareUser/middleware'); // Your existing auth middleware

// Import schemas
const { 
  User, 
  DataPurchase, 
  Transaction,
  DataInventory 
} = require('../schema/schema');

const {
  AgentStore,
  AgentProduct,
  AgentTransaction,
  AgentWithdrawal,
  AgentCustomer,
  StoreReview,
  StoreAnalytics
} = require('../Agent_Store_Schema/page');

// Paystack Configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_key_here';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Create Paystack client
const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Helper function for logging
const logOperation = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AGENT_STORE] [${operation}]`, JSON.stringify(data, null, 2));
};

// Updated middleware to verify agent ownership - uses req.user from auth middleware
const verifyAgentOwnership = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const agentId = req.user._id; // Get from authenticated user

    const store = await AgentStore.findById(storeId);
    if (!store) {
      return res.status(404).json({
        status: 'error',
        message: 'Store not found'
      });
    }

    if (store.agentId.toString() !== agentId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: You do not own this store'
      });
    }

    req.store = store;
    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify store ownership'
    });
  }
};

// ===== STORE MANAGEMENT ROUTES =====

// Create new agent store - Protected with auth middleware
router.post('/stores/create', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get agentId from authenticated user
    const agentId = req.user._id;
    
    const {
      storeName,
      storeDescription,
      contactInfo,
      whatsappSettings,
      businessHours,
      commissionSettings
    } = req.body;

    logOperation('CREATE_STORE_REQUEST', {
      agentId: agentId.toString(),
      storeName,
      userEmail: req.user.email
    });

    // Validate required fields
    if (!storeName || !storeDescription || !contactInfo.email || !contactInfo.phoneNumber) {
      await session.abortTransaction();
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Check if agent already has a store
    const existingStore = await AgentStore.findOne({ agentId }).session(session);
    if (existingStore) {
      await session.abortTransaction();
      return res.status(400).json({
        status: 'error',
        message: 'You already have a store',
        storeId: existingStore._id,
        storeSlug: existingStore.storeSlug
      });
    }

    // Generate unique store slug
    const baseSlug = storeName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const storeSlug = `${baseSlug}-${Date.now()}`;

    // Generate referral code
    const referralCode = `AGT${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create new store
    const newStore = new AgentStore({
      agentId,
      storeName,
      storeSlug,
      storeDescription,
      contactInfo,
      whatsappSettings,
      businessHours,
      commissionSettings: commissionSettings || {
        type: 'percentage',
        defaultCommissionRate: 10,
        minimumMarkup: 5,
        maximumMarkup: 50
      },
      marketing: {
        referralCode
      },
      status: 'pending_approval',
      wallet: {
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      }
    });

    await newStore.save({ session });

    // Update user role to include agent if not already
    if (!req.user.role.includes('agent')) {
      await User.findByIdAndUpdate(
        agentId,
        { role: req.user.role ? `${req.user.role},agent` : 'agent' },
        { session }
      );
    }

    await session.commitTransaction();

    logOperation('CREATE_STORE_SUCCESS', {
      storeId: newStore._id,
      storeSlug: newStore.storeSlug
    });

    res.status(201).json({
      status: 'success',
      message: 'Store created successfully. Pending admin approval.',
      data: {
        store: newStore,
        storeUrl: `/store/${newStore.storeSlug}`
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logOperation('CREATE_STORE_ERROR', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to create store',
      details: error.message
    });
  } finally {
    session.endSession();
  }
});

// Get current user's store
router.get('/stores/my-store', auth, async (req, res) => {
  try {
    const agentId = req.user._id;
    
    const store = await AgentStore.findOne({ agentId });
    
    if (!store) {
      return res.status(404).json({
        status: 'error',
        message: 'No store found for this account'
      });
    }

    res.json({
      status: 'success',
      data: store
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch store',
      details: error.message
    });
  }
});

// Update store details - Protected with auth and ownership check
router.put('/stores/:storeId/update', auth, verifyAgentOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const updateData = req.body;

    logOperation('UPDATE_STORE_REQUEST', {
      storeId,
      updateFields: Object.keys(updateData)
    });

    // Remove fields that shouldn't be updated directly
    delete updateData.agentId;
    delete updateData.wallet;
    delete updateData.metrics;
    delete updateData.status;
    delete updateData.approvedBy;
    delete updateData.approvedAt;

    const updatedStore = await AgentStore.findByIdAndUpdate(
      storeId,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    logOperation('UPDATE_STORE_SUCCESS', {
      storeId: updatedStore._id
    });

    res.json({
      status: 'success',
      message: 'Store updated successfully',
      data: updatedStore
    });

  } catch (error) {
    logOperation('UPDATE_STORE_ERROR', {
      message: error.message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to update store',
      details: error.message
    });
  }
});

// Toggle store open/close status
router.post('/stores/:storeId/toggle-status', auth, verifyAgentOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { isOpen, closureReason } = req.body;

    const store = req.store;

    if (!isOpen && !closureReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Closure reason is required when closing store'
      });
    }

    store.isOpen = isOpen;
    if (!isOpen) {
      store.closureReason = closureReason;
      store.closedAt = new Date();
    } else {
      store.closureReason = null;
      store.closedAt = null;
    }

    await store.save();

    logOperation('TOGGLE_STORE_STATUS', {
      storeId,
      isOpen,
      closureReason
    });

    res.json({
      status: 'success',
      message: `Store ${isOpen ? 'opened' : 'closed'} successfully`,
      data: store
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle store status'
    });
  }
});

// Add/Update products - Protected
router.post('/stores/:storeId/products', auth, verifyAgentOwnership, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storeId } = req.params;
    const { products } = req.body;

    logOperation('ADD_PRODUCTS_REQUEST', {
      storeId,
      productCount: products.length
    });

    const store = req.store;

    if (store.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({
        status: 'error',
        message: 'Store must be active to add products'
      });
    }

    const savedProducts = [];

    for (const product of products) {
      const { network, capacity, sellingPrice, displayName, description } = product;

      const basePrice = capacity * 4; // Placeholder - should use actual pricing
      
      const markup = ((sellingPrice - basePrice) / basePrice) * 100;
      
      if (markup < store.commissionSettings.minimumMarkup) {
        await session.abortTransaction();
        return res.status(400).json({
          status: 'error',
          message: `Markup for ${network} ${capacity}GB is below minimum allowed (${store.commissionSettings.minimumMarkup}%)`
        });
      }

      if (markup > store.commissionSettings.maximumMarkup) {
        await session.abortTransaction();
        return res.status(400).json({
          status: 'error',
          message: `Markup for ${network} ${capacity}GB exceeds maximum allowed (${store.commissionSettings.maximumMarkup}%)`
        });
      }

      let agentProduct = await AgentProduct.findOne({
        storeId,
        network,
        capacity
      }).session(session);

      if (agentProduct) {
        agentProduct.sellingPrice = sellingPrice;
        agentProduct.profit = sellingPrice - basePrice;
        agentProduct.profitMargin = markup;
        agentProduct.displayName = displayName || agentProduct.displayName;
        agentProduct.description = description || agentProduct.description;
        agentProduct.updatedAt = new Date();
      } else {
        agentProduct = new AgentProduct({
          storeId,
          network,
          capacity,
          mb: capacity * 1024,
          basePrice,
          sellingPrice,
          profit: sellingPrice - basePrice,
          profitMargin: markup,
          displayName,
          description,
          isActive: true,
          inStock: true
        });
      }

      await agentProduct.save({ session });
      savedProducts.push(agentProduct);
    }

    await session.commitTransaction();

    logOperation('ADD_PRODUCTS_SUCCESS', {
      storeId,
      savedCount: savedProducts.length
    });

    res.json({
      status: 'success',
      message: 'Products added/updated successfully',
      data: savedProducts
    });

  } catch (error) {
    await session.abortTransaction();
    logOperation('ADD_PRODUCTS_ERROR', {
      message: error.message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to add products',
      details: error.message
    });
  } finally {
    session.endSession();
  }
});

// Get store dashboard - Protected
router.get('/stores/:storeId/dashboard', auth, verifyAgentOwnership, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { period = 'today' } = req.query;

    const store = req.store;

    let dateFilter = {};
    const now = new Date();
    
    if (period === 'today') {
      const today = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: today } };
    } else if (period === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      dateFilter = { createdAt: { $gte: monthAgo } };
    }

    const transactions = await AgentTransaction.find({
      storeId,
      orderStatus: 'completed',
      ...dateFilter
    });

    const totalOrders = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.sellingPrice, 0);
    const totalProfit = transactions.reduce((sum, t) => sum + t.netProfit, 0);

    const recentCustomers = await AgentCustomer.find({ storeId })
      .sort({ lastPurchaseDate: -1 })
      .limit(10);

    const pendingWithdrawals = await AgentWithdrawal.find({
      storeId,
      status: 'pending'
    });

    res.json({
      status: 'success',
      data: {
        store: {
          name: store.storeName,
          status: store.status,
          isOpen: store.isOpen,
          rating: store.metrics.rating,
          totalReviews: store.metrics.totalReviews
        },
        wallet: store.wallet,
        metrics: {
          period,
          totalOrders,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalProfit: parseFloat(totalProfit.toFixed(2)),
          averageOrderValue: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0
        },
        recentCustomers,
        pendingWithdrawals: pendingWithdrawals.length
      }
    });

  } catch (error) {
    logOperation('DASHBOARD_ERROR', {
      message: error.message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
});

// Request withdrawal - Protected
router.post('/stores/:storeId/withdraw', auth, verifyAgentOwnership, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storeId } = req.params;
    const {
      amount,
      method,
      paymentDetails,
      agentNotes
    } = req.body;

    const store = req.store;

    logOperation('WITHDRAWAL_REQUEST', {
      storeId,
      amount,
      method,
      agentId: req.user._id.toString()
    });

    if (amount < store.withdrawalSettings.minimumWithdrawal) {
      await session.abortTransaction();
      return res.status(400).json({
        status: 'error',
        message: `Minimum withdrawal amount is ${store.withdrawalSettings.minimumWithdrawal}`
      });
    }

    if (amount > store.wallet.availableBalance) {
      await session.abortTransaction();
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient available balance',
        availableBalance: store.wallet.availableBalance
      });
    }

    const withdrawalFee = amount * 0.01; // 1% withdrawal fee
    const netAmount = amount - withdrawalFee;

    const withdrawal = new AgentWithdrawal({
      agentId: req.user._id,
      storeId: store._id,
      requestedAmount: amount,
      fee: withdrawalFee,
      netAmount: netAmount,
      method: method,
      paymentDetails: paymentDetails,
      status: 'pending',
      agentNotes: agentNotes
    });

    await withdrawal.save({ session });

    store.wallet.availableBalance -= amount;
    store.wallet.pendingBalance += amount;
    await store.save({ session });

    await session.commitTransaction();

    logOperation('WITHDRAWAL_CREATED', {
      withdrawalId: withdrawal._id,
      amount,
      netAmount
    });

    res.json({
      status: 'success',
      message: 'Withdrawal request submitted successfully',
      data: {
        withdrawal,
        processingTime: '24-48 hours'
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logOperation('WITHDRAWAL_ERROR', {
      message: error.message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to process withdrawal request',
      details: error.message
    });
  } finally {
    session.endSession();
  }
});

// ===== PUBLIC ROUTES (No auth required) =====

// Get store by slug (public)
router.get('/store/:storeSlug', async (req, res) => {
  try {
    const { storeSlug } = req.params;

    const store = await AgentStore.findOne({ 
      storeSlug,
      status: 'active'
    }).select('-wallet -withdrawalSettings -adminNotes');

    if (!store) {
      return res.status(404).json({
        status: 'error',
        message: 'Store not found'
      });
    }

    res.json({
      status: 'success',
      data: store
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch store'
    });
  }
});

// Get store products (public)
router.get('/stores/:storeSlug/products', async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const { network, active = true } = req.query;

    const store = await AgentStore.findOne({ storeSlug });
    if (!store) {
      return res.status(404).json({
        status: 'error',
        message: 'Store not found'
      });
    }

    if (!store.isOpen || store.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Store is currently closed',
        storeStatus: store.status,
        closureReason: store.closureReason
      });
    }

    const query = { storeId: store._id };
    if (network) query.network = network;
    if (active === 'true') query.isActive = true;

    const products = await AgentProduct.find(query).sort({ sortOrder: 1, network: 1, capacity: 1 });

    res.json({
      status: 'success',
      data: {
        store: {
          id: store._id,
          name: store.storeName,
          description: store.storeDescription,
          logo: store.storeLogo,
          whatsapp: store.contactInfo.whatsappNumber,
          rating: store.metrics.rating
        },
        products
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products'
    });
  }
});

module.exports = router;