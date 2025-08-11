const express = require('express');
const router = express.Router();
const { ResultCheckerProduct, ResultCheckerPurchase, ResultCheckerInventory } = require('../WaecSchema/Schema');
const { User, Transaction } = require('../schema/schema');
const mongoose = require('mongoose');
const auth = require('../middlewareUser/middleware');
const adminAuth = require('../adminMiddleware/middleware');
const axios = require('axios');

// mNotify SMS configuration (same as your existing)
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY || 'w3rGWhv4e235nDwYvD5gVDyrW',
  SENDER_ID: 'DataMartGH',
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

/**
 * Format phone number to Ghana format for mNotify
 */
const formatPhoneNumberForMnotify = (phone) => {
  if (!phone) return '';
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  
  return cleaned;
};

/**
 * Send SMS notification using mNotify
 */
const sendMnotifySMS = async (to, message) => {
  try {
    const formattedPhone = formatPhoneNumberForMnotify(to);
    
    if (!formattedPhone || formattedPhone.length < 12) {
      throw new Error('Invalid phone number format');
    }
    
    const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${SMS_CONFIG.SENDER_ID}`;
    
    const response = await axios.get(url);
    
    console.log('mNotify SMS API Response:', {
      status: response.status,
      data: response.data,
      dataType: typeof response.data
    });
    
    let responseCode;
    
    if (typeof response.data === 'number') {
      responseCode = response.data;
    } else if (typeof response.data === 'string') {
      const match = response.data.match(/\d+/);
      if (match) {
        responseCode = parseInt(match[0]);
      } else {
        responseCode = parseInt(response.data.trim());
      }
    } else if (typeof response.data === 'object' && response.data.code) {
      responseCode = parseInt(response.data.code);
    }
    
    if (isNaN(responseCode)) {
      console.error('Could not parse mNotify response code from:', response.data);
      if (response.status === 200) {
        return { success: true, message: 'SMS sent (assumed successful)', rawResponse: response.data };
      }
      throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
    }
    
    switch (responseCode) {
      case 1000:
        return { success: true, message: 'SMS sent successfully', code: responseCode };
      case 1002:
        throw new Error('SMS sending failed');
      case 1003:
        throw new Error('Insufficient SMS balance');
      case 1004:
        throw new Error('Invalid API key');
      case 1005:
        throw new Error('Invalid phone number');
      case 1006:
        throw new Error('Invalid Sender ID. Sender ID must not be more than 11 Characters');
      case 1007:
        return { success: true, message: 'SMS scheduled for later delivery', code: responseCode };
      case 1008:
        throw new Error('Empty message');
      case 1011:
        throw new Error('Numeric Sender IDs are not allowed');
      case 1012:
        throw new Error('Sender ID is not registered. Please contact support at senderids@mnotify.com');
      default:
        throw new Error(`Unknown response code: ${responseCode}`);
    }
  } catch (error) {
    if (error.response) {
      console.error('mNotify SMS API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error('mNotify SMS Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send result checker purchase SMS
 */
const sendCheckerPurchaseSMS = async (user, checkerType, serialNumber, pin) => {
  try {
    const message = `Hello ${user.name}! Your ${checkerType} Result Checker purchase is successful. Serial: ${serialNumber}, PIN: ${pin}. Keep this information safe. Thank you for choosing DataMartGH!`;
    
    const result = await sendMnotifySMS(user.phoneNumber, message);
    
    if (result.success) {
      console.log(`Checker purchase SMS sent to ${user.phoneNumber}`);
    } else {
      console.error(`Failed to send checker purchase SMS to ${user.phoneNumber}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Send Checker Purchase SMS Error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// ADMIN ROUTES
// =====================================================

/**
 * @route   POST /api/admin/result-checkers/products
 * @desc    Create a new result checker product
 * @access  Admin
 */
router.post('/products', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, price } = req.body;
    
    // Validate input
    if (!name || !description || !price) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, description and price'
      });
    }
    
    // Check if product already exists
    const existingProduct = await ResultCheckerProduct.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `${name} product already exists`
      });
    }
    
    const product = new ResultCheckerProduct({
      name,
      description,
      price,
      createdBy: req.user.id
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      message: `${name} checker product created successfully`,
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/result-checkers/products
 * @desc    Get all result checker products
 * @access  Admin
 */
router.get('/products', auth, adminAuth, async (req, res) => {
  try {
    const products = await ResultCheckerProduct.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort('-createdAt');
    
    // Get inventory stats for each product
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const availableCount = await ResultCheckerInventory.countDocuments({
          checkerType: product.name,
          status: 'available'
        });
        
        const soldCount = await ResultCheckerInventory.countDocuments({
          checkerType: product.name,
          status: 'sold'
        });
        
        return {
          ...product.toObject(),
          inventory: {
            available: availableCount,
            sold: soldCount,
            total: availableCount + soldCount
          }
        };
      })
    );
    
    res.json({
      success: true,
      data: productsWithStats
    });
  } catch (error) {
    console.error('Get products error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/result-checkers/products/:id
 * @desc    Update result checker product
 * @access  Admin
 */
router.put('/products/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();
    
    const product = await ResultCheckerProduct.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/admin/result-checkers/inventory/add-single
 * @desc    Add single checker to inventory
 * @access  Admin
 */
router.post('/inventory/add-single', auth, adminAuth, async (req, res) => {
  try {
    const { checkerType, serialNumber, pin } = req.body;
    
    if (!checkerType || !serialNumber || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide checkerType, serialNumber and pin'
      });
    }
    
    // Check if serial number already exists
    const existing = await ResultCheckerInventory.findOne({ serialNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Serial number already exists in inventory'
      });
    }
    
    const checker = new ResultCheckerInventory({
      checkerType,
      serialNumber,
      pin,
      uploadedBy: req.user.id,
      batchId: `SINGLE_${Date.now()}`
    });
    
    await checker.save();
    
    res.status(201).json({
      success: true,
      message: 'Checker added to inventory successfully',
      data: checker
    });
  } catch (error) {
    console.error('Add single checker error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/admin/result-checkers/inventory/bulk-upload
 * @desc    Bulk upload checkers
 * @access  Admin
 */
router.post('/inventory/bulk-upload', auth, adminAuth, async (req, res) => {
  try {
    const { checkerType, checkers } = req.body;
    
    if (!checkerType || !checkers || !Array.isArray(checkers) || checkers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide checkerType and checkers array'
      });
    }
    
    const batchId = `BATCH_${checkerType}_${Date.now()}`;
    const uploadedBy = req.user.id;
    
    // Prepare checkers for bulk insert
    const checkersToInsert = checkers.map(checker => ({
      checkerType,
      serialNumber: checker.serialNumber,
      pin: checker.pin,
      uploadedBy,
      batchId,
      status: 'available'
    }));
    
    try {
      // Bulk insert with ordered: false to continue on duplicates
      const result = await ResultCheckerInventory.insertMany(checkersToInsert, { ordered: false });
      
      res.status(201).json({
        success: true,
        message: `${result.length} ${checkerType} checkers uploaded successfully`,
        data: {
          batchId,
          totalUploaded: result.length,
          failed: checkers.length - result.length
        }
      });
    } catch (bulkError) {
      // Handle duplicate key errors
      if (bulkError.code === 11000) {
        const insertedCount = bulkError.insertedDocs ? bulkError.insertedDocs.length : 0;
        const duplicates = checkers.length - insertedCount;
        
        res.status(207).json({
          success: true,
          message: `${insertedCount} checkers uploaded, ${duplicates} duplicates skipped`,
          data: {
            batchId,
            totalUploaded: insertedCount,
            duplicatesSkipped: duplicates
          }
        });
      } else {
        throw bulkError;
      }
    }
  } catch (error) {
    console.error('Bulk upload error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/result-checkers/inventory
 * @desc    Get inventory with filters
 * @access  Admin
 */
router.get('/inventory', auth, adminAuth, async (req, res) => {
  try {
    const { checkerType, status, page = 1, limit = 50, search = '' } = req.query;
    const filter = {};
    
    if (checkerType) filter.checkerType = checkerType;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { batchId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const inventory = await ResultCheckerInventory.find(filter)
      .populate('uploadedBy', 'name email')
      .populate('soldTo', 'name email phoneNumber')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ResultCheckerInventory.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/result-checkers/inventory/stats
 * @desc    Get inventory statistics
 * @access  Admin
 */
router.get('/inventory/stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = await ResultCheckerInventory.aggregate([
      {
        $group: {
          _id: {
            checkerType: '$checkerType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.checkerType',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);
    
    // Get recent sales
    const recentSales = await ResultCheckerPurchase.find({ status: 'completed' })
      .sort('-createdAt')
      .limit(10)
      .populate('userId', 'name email phoneNumber');
    
    // Get daily sales for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailySales = await ResultCheckerPurchase.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            checkerType: '$checkerType'
          },
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      {
        $sort: { '_id.date': -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        inventory: stats,
        recentSales,
        dailySales
      }
    });
  } catch (error) {
    console.error('Get inventory stats error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/result-checkers/sales
 * @desc    Get sales report
 * @access  Admin
 */
router.get('/sales', auth, adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, checkerType, page = 1, limit = 100 } = req.query;
    const filter = { status: 'completed' };
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        filter.createdAt.$lte = endDateObj;
      }
    }
    
    if (checkerType) filter.checkerType = checkerType;
    
    const skip = (page - 1) * limit;
    
    const sales = await ResultCheckerPurchase.find(filter)
      .populate('userId', 'name email phoneNumber')
      .populate('transactionId')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ResultCheckerPurchase.countDocuments(filter);
    
    // Calculate totals
    const summary = await ResultCheckerPurchase.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$checkerType',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$price' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        sales,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// =====================================================
// USER ROUTES
// =====================================================

/**
 * @route   GET /api/result-checkers/products
 * @desc    Get available products for users
 * @access  Protected
 */
router.get('/user/products', auth, async (req, res) => {
  try {
    const products = await ResultCheckerProduct.find({ isActive: true })
      .select('name description price');
    
    // Check availability for each product
    const productsWithAvailability = await Promise.all(
      products.map(async (product) => {
        const availableCount = await ResultCheckerInventory.countDocuments({
          checkerType: product.name,
          status: 'available'
        });
        
        return {
          ...product.toObject(),
          available: availableCount > 0,
          stockCount: availableCount
        };
      })
    );
    
    res.json({
      success: true,
      data: productsWithAvailability
    });
  } catch (error) {
    console.error('Get user products error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/result-checkers/purchase
 * @desc    Purchase a result checker
 * @access  Protected
 */
router.post('/purchase', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { checkerType, paymentMethod = 'wallet' } = req.body;
    const userId = req.user.id;
    
    if (!checkerType) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please specify checker type (WAEC or BECE)'
      });
    }
    
    // Get product details
    const product = await ResultCheckerProduct.findOne({ 
      name: checkerType,
      isActive: true 
    }).session(session);
    
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Product not available'
      });
    }
    
    // Get user details
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user account is disabled
    if (user.isDisabled) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Your account is disabled. Please contact support.'
      });
    }
    
    // Check wallet balance if payment method is wallet
    if (paymentMethod === 'wallet' && user.walletBalance < product.price) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        currentBalance: user.walletBalance,
        requiredAmount: product.price
      });
    }
    
    // Find and reserve an available checker
    const availableChecker = await ResultCheckerInventory.findOneAndUpdate(
      {
        checkerType: product.name,
        status: 'available'
      },
      {
        status: 'reserved',
        reservedFor: userId,
        reservedAt: new Date()
      },
      { new: true, session }
    );
    
    if (!availableChecker) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `No ${checkerType} checkers available in stock`
      });
    }
    
    // Generate purchase reference
    const count = await ResultCheckerPurchase.countDocuments();
    const type = product.name === "WAEC" ? "W" : "B";
    const purchaseReference = `CHK${type}${Date.now()}${String(count + 1).padStart(4, '0')}`;
    
    // Create purchase record
    const purchase = new ResultCheckerPurchase({
      userId,
      checkerType: product.name,
      serialNumber: availableChecker.serialNumber,
      pin: availableChecker.pin,
      price: product.price,
      purchaseReference: purchaseReference, // Add this explicitly
      status: 'pending',
      paymentMethod
    });
    
    // Log for debugging
    console.log('Creating purchase with data:', {
      userId,
      checkerType: product.name,
      price: product.price,
      purchaseReference: purchaseReference,
      hasSerialNumber: !!availableChecker.serialNumber,
      hasPin: !!availableChecker.pin
    });
    
    await purchase.save({ session });
    
    // Process payment if wallet
    if (paymentMethod === 'wallet') {
      // Create transaction
      const transaction = new Transaction({
        userId,
        type: 'purchase',
        amount: product.price,
        balanceBefore: user.walletBalance,
        balanceAfter: user.walletBalance - product.price,
        status: 'completed',
        reference: purchase.purchaseReference,
        gateway: 'wallet',
        description: `Purchase of ${product.name} Result Checker`,
        relatedPurchaseId: purchase._id
      });
      
      await transaction.save({ session });
      
      // Update user balance
      user.walletBalance -= product.price;
      await user.save({ session });
      
      // Update purchase status
      purchase.status = 'completed';
      purchase.transactionId = transaction._id;
      await purchase.save({ session });
      
      // Mark checker as sold
      availableChecker.status = 'sold';
      availableChecker.soldTo = userId;
      availableChecker.soldAt = new Date();
      availableChecker.reservedFor = undefined;
      availableChecker.reservedAt = undefined;
      await availableChecker.save({ session });
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Send SMS notification
    await sendCheckerPurchaseSMS(user, purchase.checkerType, purchase.serialNumber, purchase.pin);
    
    res.status(201).json({
      success: true,
      message: 'Result checker purchased successfully',
      data: {
        purchaseId: purchase._id,
        purchaseReference: purchase.purchaseReference,
        checkerType: purchase.checkerType,
        serialNumber: purchase.serialNumber,
        pin: purchase.pin,
        price: purchase.price,
        status: purchase.status,
        newWalletBalance: user.walletBalance
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Purchase error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/result-checkers/my-purchases
 * @desc    Get user's purchased checkers
 * @access  Protected
 */
router.get('/my-purchases', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, checkerType } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { 
      userId,
      status: 'completed'
    };
    
    if (checkerType) filter.checkerType = checkerType;
    
    const purchases = await ResultCheckerPurchase.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ResultCheckerPurchase.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user purchases error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/result-checkers/purchase/:id
 * @desc    Get specific purchase details
 * @access  Protected
 */
router.get('/purchase/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const purchase = await ResultCheckerPurchase.findOne({
      _id: id,
      userId,
      status: 'completed'
    });
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Get purchase details error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;