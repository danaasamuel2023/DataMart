const express = require('express');
const router = express.Router();
const { User, DataPurchase, Transaction, ReferralBonus,DataInventory } = require('../schema/schema');
const mongoose = require('mongoose');
const auth = require('../middlewareUser/middleware');
const adminAuth = require('../adminMiddleware/middleware');
const axios = require('axios');
const PAYSTACK_SECRET_KEY = 'sk_live_0fba72fb9c4fc71200d2e0cdbb4f2b37c1de396c'; 



// Middleware to check if user is admin

// const mongoose = require('mongoose');
const ARKESEL_API_KEY = 'QkNhS0l2ZUZNeUdweEtmYVRUREg';

const sendSMS = async (phoneNumber, message, options = {}) => {
  const {
    scheduleTime = null,
    useCase = null,
    senderID = 'Bundle'
  } = options;

  // Input validation
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  // Base parameters
  const params = {
    action: 'send-sms',
    api_key: ARKESEL_API_KEY,
    to: phoneNumber,
    from: senderID,
    sms: message
  };

  // Add optional parameters
  if (scheduleTime) {
    params.schedule = scheduleTime;
  }

  if (useCase && ['promotional', 'transactional'].includes(useCase)) {
    params.use_case = useCase;
  }

  // Add Nigerian use case if phone number starts with 234
  if (phoneNumber.startsWith('234') && !useCase) {
    params.use_case = 'transactional';
  }

  try {
    const response = await axios.get('https://sms.arkesel.com/sms/api', {
      params,
      timeout: 10000 // 10 second timeout
    });

    // Map error codes to meaningful messages
    const errorCodes = {
      '100': 'Bad gateway request',
      '101': 'Wrong action',
      '102': 'Authentication failed',
      '103': 'Invalid phone number',
      '104': 'Phone coverage not active',
      '105': 'Insufficient balance',
      '106': 'Invalid Sender ID',
      '109': 'Invalid Schedule Time',
      '111': 'SMS contains spam word. Wait for approval'
    };

    if (response.data.code !== 'ok') {
      const errorMessage = errorCodes[response.data.code] || 'Unknown error occurred';
      throw new Error(`SMS sending failed: ${errorMessage}`);
    }

    console.log('SMS sent successfully:', {
      to: phoneNumber,
      status: response.data.code,
      balance: response.data.balance,
      mainBalance: response.data.main_balance
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    // Handle specific error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('SMS API responded with error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from SMS API:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('SMS request setup error:', error.message);
    }

    // Instead of swallowing the error, return error details
    return {
      success: false,
      error: {
        message: error.message,
        code: error.response?.data?.code,
        details: error.response?.data
      }
    };
  }
};


/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users',auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const searchQuery = search 
      ? { 
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
            { referralCode: { $regex: search, $options: 'i' } }
          ] 
        } 
      : {};
    
    const users = await User.find(searchQuery)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(searchQuery);
    
    res.json({
      users,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalUsers: total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/users/:id',auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Admin
 */
router.put('/users/:id',auth, adminAuth, async (req, res) => {
  try {
    const { name, email, phoneNumber, role, walletBalance, referralCode } = req.body;
    
    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (phoneNumber) userFields.phoneNumber = phoneNumber;
    if (role) userFields.role = role;
    if (walletBalance !== undefined) userFields.walletBalance = walletBalance;
    if (referralCode) userFields.referralCode = referralCode;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT /api/admin/users/:id/add-money
 * @desc    Add money to user wallet
 * @access  Admin
 */
router.put('/users/:id/add-money',auth, adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: 'Please provide a valid amount' });
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Find user and update wallet balance
      const user = await User.findById(req.params.id).session(session);
      
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ msg: 'User not found' });
      }
      
      // Update wallet balance
      user.walletBalance += parseFloat(amount);
      await user.save({ session });
      
      // Create transaction record
      const transaction = new Transaction({
        userId: user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'completed',
        reference: `ADMIN-${Date.now()}`,
        gateway: 'admin-deposit'
      });
      
      await transaction.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        msg: `Successfully added ${amount} to ${user.name}'s wallet`,
        currentBalance: user.walletBalance,
        transaction
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


/**
 * @route   PUT /api/admin/users/:id/deduct-money
 * @desc    Deduct money from user wallet
 * @access  Admin
 */
router.put('/users/:id/deduct-money', auth, adminAuth, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: 'Please provide a valid amount' });
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Find user and update wallet balance
      const user = await User.findById(req.params.id).session(session);
      
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ msg: 'User not found' });
      }
      
      // Check if user has sufficient balance
      if (user.walletBalance < parseFloat(amount)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          msg: 'Insufficient balance', 
          currentBalance: user.walletBalance,
          requestedDeduction: parseFloat(amount)
        });
      }
      
      // Update wallet balance
      user.walletBalance -= parseFloat(amount);
      await user.save({ session });
      
      // Create transaction record
      const transaction = new Transaction({
        userId: user._id,
        type: 'withdrawal',
        amount: parseFloat(amount),
        status: 'completed',
        reference: `ADMIN-DEDUCT-${Date.now()}`,
        gateway: 'admin-deduction',
        metadata: {
          reason: reason || 'Administrative deduction',
          adminId: req.user.id,
          previousBalance: user.walletBalance + parseFloat(amount)
        }
      });
      
      await transaction.save({ session });
      
      // Optional: Send notification to user
      try {
        if (user.phoneNumber) {
          const formattedPhone = user.phoneNumber.replace(/^\+/, '');
          const message = `DATAMART: GHS${amount.toFixed(2)} has been deducted from your wallet. Your new balance is GHS${user.walletBalance.toFixed(2)}. Reason: ${reason || 'Administrative adjustment'}.`;
          
          await sendSMS(formattedPhone, message, {
            useCase: 'transactional',
            senderID: 'Bundle'
          });
        }
      } catch (smsError) {
        console.error('Failed to send deduction SMS:', smsError.message);
        // Continue with the transaction even if SMS fails
      }
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        msg: `Successfully deducted ${amount} from ${user.name}'s wallet`,
        currentBalance: user.walletBalance,
        transaction
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete('/users/:id',auth, adminAuth, async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Check if user exists
      const user = await User.findById(req.params.id).session(session);
      
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ msg: 'User not found' });
      }
      
      // Delete related records
      await Transaction.deleteMany({ userId: req.params.id }).session(session);
      await DataPurchase.deleteMany({ userId: req.params.id }).session(session);
      await ReferralBonus.deleteMany({ 
        $or: [
          { userId: req.params.id },
          { referredUserId: req.params.id }
        ]
      }).session(session);
      
      // Delete user
      await User.findByIdAndDelete(req.params.id).session(session);
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({ msg: 'User and related data deleted' });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/orders
 * @desc    Get all data purchase orders
 * @access  Admin
 */
router.get('/orders',auth, adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      status = '',
      network = '',
      startDate = '',
      endDate = '',
      phoneNumber = ''
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    if (network) filter.network = network;
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber };
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1); // Include end date until midnight
        filter.createdAt.$lte = endDateObj;
      }
    }
    
    const orders = await DataPurchase.find(filter)
      .populate('userId', 'name email phoneNumber')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await DataPurchase.countDocuments(filter);
    
    // Calculate total revenue from filtered orders
    const revenue = await DataPurchase.aggregate([
      { $match: filter },
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    res.json({
      orders,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalOrders: total,
      totalRevenue: revenue.length > 0 ? revenue[0].total : 0
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/orders/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    
    // Validate status
    if (!['pending', 'waiting', 'processing', 'failed', 'shipped', 'delivered', 'completed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Start a transaction for safety
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // First try to find by geonetReference (primary reference for orders)
      let order = await DataPurchase.findOne({ geonetReference: orderId })
        .populate('userId', 'name email phoneNumber walletBalance')
        .session(session);
      
      // If not found, try by MongoDB _id
      if (!order && mongoose.Types.ObjectId.isValid(orderId)) {
        order = await DataPurchase.findById(orderId)
          .populate('userId', 'name email phoneNumber walletBalance')
          .session(session);
      }
      
      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ msg: `Order with ID/Reference ${orderId} not found` });
      }
      
      const previousStatus = order.status;
      
      // Log the status change for audit trail
      console.log(`Order ${orderId} status change: ${previousStatus} -> ${status} by admin ${req.user.id}`);
      
      // Process refund if status is being changed to failed
      if (status === 'failed' && previousStatus !== 'failed') {
        // Only process refund if the order was previously not failed
        // Find the user and update their wallet balance
        const user = await User.findById(order.userId._id).session(session);
        
        if (user) {
          // Add the refund amount to the user's wallet balance
          user.walletBalance += order.price;
          await user.save({ session });
          
          // Create refund transaction record
          const transaction = new Transaction({
            userId: user._id,
            type: 'refund',
            amount: order.price,
            status: 'completed',
            reference: `REFUND-${order._id}-${Date.now()}`,
            gateway: 'wallet-refund',
            metadata: {
              orderId: order._id,
              geonetReference: order.geonetReference,
              previousStatus,
              adminId: req.user.id
            }
          });
          
          await transaction.save({ session });
          
          console.log(`Refunded ${order.price} to user ${user._id} for order ${order._id}`);
          
          // Send refund SMS to the user
          try {
            // Format phone number for SMS if needed
            const formatPhoneForSms = (phone) => {
              // Remove the '+' if it exists or format as needed
              return phone.replace(/^\+/, '');
            };
            
            if (user.phoneNumber) {
              const userPhone = formatPhoneForSms(user.phoneNumber);
              const refundMessage = `DATAMART: Your order for ${order.capacity}GB ${order.network} data bundle (Ref: ${order.geonetReference}) could not be processed. Your account has been refunded with GHS${order.price.toFixed(2)}. Thank you for choosing DATAMART.`;
              
              await sendSMS(userPhone, refundMessage, {
                useCase: 'transactional',
                senderID: 'Bundle'
              });
            }
          } catch (smsError) {
            console.error('Failed to send refund SMS:', smsError.message);
            // Continue even if SMS fails
          }
        }
      }
      
      // Update the order status
      order.status = status;
      order.processedBy = req.user.id;
      order.updatedAt = Date.now();
      
      // Add status history for tracking
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      
      order.statusHistory.push({
        status,
        changedAt: new Date(),
        changedBy: req.user.id,
        previousStatus
      });
      
      await order.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        success: true,
        msg: 'Order status updated successfully',
        order: {
          id: order._id,
          geonetReference: order.geonetReference,
          status: order.status,
          previousStatus,
          updatedAt: order.updatedAt
        }
      });
    } catch (txError) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw txError;
    }
  } catch (err) {
    console.error(`Error updating order ${req.params.id} status:`, err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server Error while updating order status',
      error: err.message
    });
  }
});

/**
 * @route   POST /api/admin/orders/bulk-status-update
 * @desc    Bulk update order statuses with improved error handling
 * @access  Admin
 */
router.post('/orders/bulk-status-update', auth, adminAuth, async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ msg: 'Please provide an array of order IDs' });
    }
    
    if (!status || !['pending', 'waiting', 'processing', 'failed', 'shipped', 'delivered', 'completed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Results tracking
    const results = {
      success: [],
      failed: [],
      notFound: []
    };
    
    // Process orders in batches to avoid overwhelming the database
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < orderIds.length; i += batchSize) {
      batches.push(orderIds.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      // Process each batch with a new session
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        for (const orderId of batch) {
          // First try to find by geonetReference
          let order = await DataPurchase.findOne({ geonetReference: orderId })
            .session(session);
          
          // If not found, try by MongoDB _id
          if (!order && mongoose.Types.ObjectId.isValid(orderId)) {
            order = await DataPurchase.findById(orderId)
              .session(session);
          }
          
          if (!order) {
            results.notFound.push(orderId);
            continue;
          }
          
          const previousStatus = order.status;
          
          // Skip if status is already the target status
          if (previousStatus === status) {
            results.success.push({
              id: order._id,
              geonetReference: order.geonetReference,
              status,
              message: 'Status already set (no change needed)'
            });
            continue;
          }
          
          // Process refund if status is being changed to failed
          if (status === 'failed' && previousStatus !== 'failed') {
            try {
              // Only process refund if the order was previously not failed
              const user = await User.findById(order.userId).session(session);
              
              if (user) {
                // Add the refund amount to the user's wallet balance
                user.walletBalance += order.price;
                await user.save({ session });
                
                // Create refund transaction record
                const transaction = new Transaction({
                  userId: user._id,
                  type: 'refund',
                  amount: order.price,
                  status: 'completed',
                  reference: `REFUND-${order._id}-${Date.now()}`,
                  gateway: 'wallet-refund',
                  metadata: {
                    orderId: order._id,
                    geonetReference: order.geonetReference,
                    previousStatus,
                    bulkUpdate: true,
                    adminId: req.user.id
                  }
                });
                
                await transaction.save({ session });
              }
            } catch (refundError) {
              console.error(`Refund error for order ${orderId}:`, refundError.message);
              results.failed.push({
                id: order._id,
                geonetReference: order.geonetReference,
                error: 'Refund processing failed'
              });
              continue;
            }
          }
          
          // Update the order status
          order.status = status;
          order.processedBy = req.user.id;
          order.updatedAt = Date.now();
          
          // Add status history for tracking
          if (!order.statusHistory) {
            order.statusHistory = [];
          }
          
          order.statusHistory.push({
            status,
            changedAt: new Date(),
            changedBy: req.user.id,
            previousStatus,
            bulkUpdate: true
          });
          
          await order.save({ session });
          
          results.success.push({
            id: order._id,
            geonetReference: order.geonetReference,
            previousStatus,
            status
          });
        }
        
        // Commit the transaction for this batch
        await session.commitTransaction();
        session.endSession();
      } catch (batchError) {
        // If an error occurs in this batch, abort its transaction
        await session.abortTransaction();
        session.endSession();
        console.error('Error processing batch:', batchError.message);
        
        // Mark all orders in this batch as failed
        batch.forEach(orderId => {
          if (!results.success.some(s => s.id.toString() === orderId || s.geonetReference === orderId) && 
              !results.notFound.includes(orderId)) {
            results.failed.push({
              id: orderId,
              error: 'Batch transaction error'
            });
          }
        });
      }
    }
    
    // Send response with detailed results
    res.json({
      msg: `Bulk update processed. Success: ${results.success.length}, Failed: ${results.failed.length}, Not Found: ${results.notFound.length}`,
      results
    });
  } catch (err) {
    console.error('Bulk update error:', err.message);
    res.status(500).json({ 
      success: false,
      msg: 'Server Error during bulk update',
      error: err.message
    });
  }
});

// Schema update to track status history
// Add this to your schema.js file to track order status changes
/*
const DataPurchaseSchema = new mongoose.Schema({
  // ... existing fields
  
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'waiting', 'processing', 'failed', 'shipped', 'delivered', 'completed'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    previousStatus: String,
    bulkUpdate: Boolean
  }]
});
*/

router.put('/inventory/:network/toggle', auth, adminAuth, async (req, res) => {
  try {
    const { network } = req.params;
    
    // Find the inventory item
    let inventoryItem = await DataInventory.findOne({ network });
    
    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      inventoryItem = new DataInventory({
        network,
        inStock: false, // Set to false since we're toggling from non-existent (assumed true)
        skipGeonettech: false // Add default value
      });
    } else {
      // Toggle existing item
      inventoryItem.inStock = !inventoryItem.inStock;
      inventoryItem.updatedAt = Date.now();
    }
    
    await inventoryItem.save();
    
    res.json({ 
      network: inventoryItem.network, 
      inStock: inventoryItem.inStock,
      skipGeonettech: inventoryItem.skipGeonettech || false,
      message: `${network} is now ${inventoryItem.inStock ? 'in stock' : 'out of stock'}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT /api/admin/inventory/:network/toggle-geonettech
 * @desc    Toggle Geonettech API for specific network
 * @access  Admin
 */
router.put('/inventory/:network/toggle-geonettech', auth, adminAuth, async (req, res) => {
  try {
    const { network } = req.params;
    
    // Find the inventory item
    let inventoryItem = await DataInventory.findOne({ network });
    
    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      inventoryItem = new DataInventory({
        network,
        inStock: true, // Default to in stock
        skipGeonettech: true // Set to true since we're toggling from non-existent (assumed false)
      });
    } else {
      // Toggle existing item
      inventoryItem.skipGeonettech = !inventoryItem.skipGeonettech;
      inventoryItem.updatedAt = Date.now();
    }
    
    await inventoryItem.save();
    
    res.json({ 
      network: inventoryItem.network, 
      inStock: inventoryItem.inStock,
      skipGeonettech: inventoryItem.skipGeonettech,
      message: `${network} Geonettech API is now ${inventoryItem.skipGeonettech ? 'disabled (orders will be pending)' : 'enabled (orders will be processed)'}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/inventory
 * @desc    Get all inventory items with current status
 * @access  Admin
 */
router.get('/inventory', auth, adminAuth, async (req, res) => {
  try {
    const inventoryItems = await DataInventory.find({}).sort({ network: 1 });
    
    // Predefined networks
    const NETWORKS = ["YELLO", "TELECEL", "AT_PREMIUM", "airteltigo", "at"];
    
    // Create response with all networks (create missing ones with defaults)
    const inventory = NETWORKS.map(network => {
      const existingItem = inventoryItems.find(item => item.network === network);
      
      if (existingItem) {
        return {
          network: existingItem.network,
          inStock: existingItem.inStock,
          skipGeonettech: existingItem.skipGeonettech || false,
          updatedAt: existingItem.updatedAt
        };
      } else {
        return {
          network,
          inStock: true, // Default to in stock
          skipGeonettech: false, // Default to API enabled
          updatedAt: null
        };
      }
    });
    
    res.json({
      inventory,
      totalNetworks: NETWORKS.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/inventory/:network
 * @desc    Get specific network inventory status
 * @access  Admin
 */
router.get('/inventory/:network', auth, adminAuth, async (req, res) => {
  try {
    const { network } = req.params;
    
    const inventoryItem = await DataInventory.findOne({ network });
    
    if (!inventoryItem) {
      return res.json({
        network,
        inStock: true, // Default to in stock
        skipGeonettech: false, // Default to API enabled
        updatedAt: null,
        message: 'Network not found in inventory - showing defaults'
      });
    }
    
    res.json({
      network: inventoryItem.network,
      inStock: inventoryItem.inStock,
      skipGeonettech: inventoryItem.skipGeonettech || false,
      updatedAt: inventoryItem.updatedAt
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with pagination, filtering and sorting
 * @access  Admin
 */
router.get('/transactions', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      type = '',
      status = '',
      gateway = '',
      startDate = '',
      endDate = '',
      search = '',
      phoneNumber = '' // Add phoneNumber parameter
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (gateway) filter.gateway = gateway;
    
    // Search by reference or userId
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        filter.userId = search;
      } else {
        filter.reference = { $regex: search, $options: 'i' };
      }
    }

    // Phone number search - use aggregation to find users by phone
    let userIdsByPhone = [];
    if (phoneNumber) {
      const users = await User.find({
        phoneNumber: { $regex: phoneNumber, $options: 'i' }
      }).select('_id');
      
      userIdsByPhone = users.map(user => user._id);
      
      if (userIdsByPhone.length > 0) {
        filter.userId = { $in: userIdsByPhone };
      } else {
        // No users with this phone number, return empty result
        return res.json({
          transactions: [],
          totalPages: 0,
          currentPage: parseInt(page),
          totalTransactions: 0,
          amountByType: {}
        });
      }
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1); // Include end date until midnight
        filter.createdAt.$lte = endDateObj;
      }
    }
    
    const transactions = await Transaction.find(filter)
      .populate('userId', 'name email phoneNumber')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Transaction.countDocuments(filter);
    
    // Calculate total transaction amount for filtered transactions
    const totalAmount = await Transaction.aggregate([
      { $match: filter },
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Format the totals by type (deposit, payment, etc.)
    const amountByType = {};
    totalAmount.forEach(item => {
      amountByType[item._id] = item.total;
    });
    
    res.json({
      transactions,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalTransactions: total,
      amountByType
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
/**
 * @route   GET /api/admin/transactions/:id
 * @desc    Get transaction details by ID
 * @access  Admin
 */
router.get('/transactions/:id', auth, adminAuth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email phoneNumber');
    
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/verify-paystack/:reference
 * @desc    Verify payment status from Paystack
 * @access  Admin
 */
router.get('/verify-paystack/:reference', auth, adminAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    
    // First check if transaction exists in our database
    const transaction = await Transaction.findOne({ reference })
      .populate('userId', 'name email phoneNumber');
    
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction reference not found in database' });
    }
    
    // Only verify Paystack transactions
    if (transaction.gateway !== 'paystack') {
      return res.status(400).json({ 
        msg: 'This transaction was not processed through Paystack',
        transaction
      });
    }
    
    // Verify with Paystack API
    try {
      const paystackResponse = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const paystackData = paystackResponse.data;
      
      // Update transaction status based on Paystack response
      if (paystackData.status && paystackData.data.status === 'success') {
        // Update transaction in database if needed
        if (transaction.status !== 'completed') {
          transaction.status = 'completed';
          transaction.metadata = {
            ...transaction.metadata,
            paystackVerification: paystackData.data
          };
          await transaction.save();
        }
        
        return res.json({
          transaction,
          paystackVerification: paystackData.data,
          verified: true,
          message: 'Payment was successfully verified on Paystack'
        });
      } else {
        // Update transaction in database if needed
        if (transaction.status !== 'failed') {
          transaction.status = 'failed';
          transaction.metadata = {
            ...transaction.metadata,
            paystackVerification: paystackData.data
          };
          await transaction.save();
        }
        
        return res.json({
          transaction,
          paystackVerification: paystackData.data,
          verified: false,
          message: 'Payment verification failed on Paystack'
        });
      }
    } catch (verifyError) {
      console.error('Paystack verification error:', verifyError.message);
      return res.status(500).json({
        msg: 'Error verifying payment with Paystack',
        error: verifyError.message,
        transaction
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT /api/admin/transactions/:id/update-status
 * @desc    Manually update transaction status
 * @access  Admin
 */
router.put('/transactions/:id/update-status', auth, adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!['pending', 'completed', 'failed', 'processing', 'refunded'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    // Update transaction fields
    transaction.status = status;
    transaction.updatedAt = Date.now();
    
    // Add admin notes if provided
    if (adminNotes) {
      transaction.metadata = {
        ...transaction.metadata,
        adminNotes,
        updatedBy: req.user.id,
        updateDate: new Date()
      };
    }
    
    await transaction.save();
    
    res.json({
      msg: 'Transaction status updated successfully',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
});

router.put('/users/:id/toggle-status', auth, adminAuth, async (req, res) => {
  try {
    const { disableReason } = req.body;
    const userId = req.params.id;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Get current admin for tracking
    const admin = await User.findById(req.user.id).select('name');
    
    // Toggle the isDisabled status
    user.isDisabled = !user.isDisabled;
    
    // Update related fields
    if (user.isDisabled) {
      // Disabling the account
      user.disableReason = disableReason || 'Administrative action';
      user.disabledAt = new Date();
      user.disabledBy = req.user.id;
    } else {
      // Re-enabling the account
      user.disableReason = null;
      user.disabledAt = null;
      user.enabledBy = req.user.id;
      user.enabledAt = new Date();
    }
    
    await user.save();
    
    // Send notification SMS to the user
    try {
      if (user.phoneNumber) {
        const formattedPhone = user.phoneNumber.replace(/^\+/, '');
        let message;
        
        if (user.isDisabled) {
          message = `DATAMART: Your account has been disabled. Reason: ${user.disableReason}. Contact support for assistance.`;
        } else {
          message = `DATAMART: Your account has been re-enabled. You can now access all platform features. Thank you for choosing DATAMART.`;
        }
        
        await sendSMS(formattedPhone, message, {
          useCase: 'transactional',
          senderID: 'Bundle'
        });
      }
    } catch (smsError) {
      console.error('Failed to send account status SMS:', smsError.message);
      // Continue even if SMS fails
    }
    
    return res.json({
      success: true,
      message: user.isDisabled ? 'User account has been disabled' : 'User account has been enabled',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isDisabled: user.isDisabled,
        disableReason: user.disableReason,
        disabledAt: user.disabledAt,
        disabledBy: admin ? admin.name : req.user.id
      }
    });
    
  } catch (err) {
    console.error('Toggle user status error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
});

router.get('/daily-summary', auth, adminAuth, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    // Create date range for the specified date (full day)
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    // Query filter for the date range
    const dateFilter = {
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    };
    
    // Get total orders for the day
    const totalOrders = await DataPurchase.countDocuments(dateFilter);
    
    // Get total revenue from completed orders
    const revenueAgg = await DataPurchase.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
    
    // Get total deposits
    const depositsAgg = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'deposit', status: 'completed' } },
      { $group: { _id: null, totalDeposits: { $sum: '$amount' } } }
    ]);
    const totalDeposits = depositsAgg.length > 0 ? depositsAgg[0].totalDeposits : 0;
    
    // Get total data capacity sold for each network & capacity
    const capacityByNetworkAgg = await DataPurchase.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      { 
        $group: { 
          _id: {
            network: '$network',
            capacity: '$capacity'
          },
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' }
        }
      },
      { $sort: { '_id.network': 1, '_id.capacity': 1 } }
    ]);
    
    // Format the capacity data for easier frontend consumption
    const capacityData = capacityByNetworkAgg.map(item => ({
      network: item._id.network,
      capacity: item._id.capacity,
      count: item.count,
      totalGB: item.totalCapacity
    }));
    
    // Get summary by network
    const networkSummaryAgg = await DataPurchase.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      { 
        $group: { 
          _id: '$network',
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalRevenue: { $sum: '$price' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const networkSummary = networkSummaryAgg.map(item => ({
      network: item._id,
      count: item.count,
      totalGB: item.totalCapacity,
      revenue: item.totalRevenue
    }));
    
    // Get total capacity for all networks
    const totalCapacityAgg = await DataPurchase.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      { $group: { _id: null, totalGB: { $sum: '$capacity' } } }
    ]);
    const totalCapacity = totalCapacityAgg.length > 0 ? totalCapacityAgg[0].totalGB : 0;
    
    // Get order statuses summary
    const statusSummaryAgg = await DataPurchase.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const statusSummary = statusSummaryAgg.map(item => ({
      status: item._id,
      count: item.count
    }));
    
    // Count unique customers for the day
    const uniqueCustomersAgg = await DataPurchase.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$userId' } },
      { $count: 'uniqueCustomers' }
    ]);
    const uniqueCustomers = uniqueCustomersAgg.length > 0 ? uniqueCustomersAgg[0].uniqueCustomers : 0;
    
    // Compile the complete response
    res.json({
      date,
      summary: {
        totalOrders,
        totalRevenue,
        totalDeposits,
        totalCapacityGB: totalCapacity,
        uniqueCustomers
      },
      networkSummary,
      capacityDetails: capacityData,
      statusSummary
    });
    
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: err.message
    });
  }
});

router.get('/user-orders/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Invalid user ID' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Fetch orders for the user
    const orders = await DataPurchase.find({ userId })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await DataPurchase.countDocuments({ userId });
    
    // Calculate total spent by the user
    const totalSpent = await DataPurchase.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    res.json({
      orders,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalOrders: total,
      totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
    });
  } catch (err) {
    console.error('Error fetching user orders:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/dashboard/statistics
 * @desc    Get admin dashboard statistics
 * @access  Admin
 */
router.get('/dashboard/statistics', auth, adminAuth, async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get total wallet balance across all users
    const walletBalance = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$walletBalance' } } }
    ]);
    const totalWalletBalance = walletBalance.length > 0 ? walletBalance[0].total : 0;
    
    // Get total completed orders
    const completedOrders = await DataPurchase.countDocuments({ status: 'completed' });
    
    // Get total revenue from completed orders
    const revenue = await DataPurchase.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;
    
    // Get total by network
    const networkStats = await DataPurchase.aggregate([
      { $match: { status: 'completed' } },
      { 
        $group: { 
          _id: '$network',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    
    // Get recent orders
    const recentOrders = await DataPurchase.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email');
    
    res.json({
      userStats: {
        totalUsers,
        totalWalletBalance
      },
      orderStats: {
        totalOrders: await DataPurchase.countDocuments(),
        completedOrders,
        pendingOrders: await DataPurchase.countDocuments({ status: 'pending' }),
        failedOrders: await DataPurchase.countDocuments({ status: 'failed' })
      },
      financialStats: {
        totalRevenue,
        averageOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0
      },
      networkStats,
      recentOrders
    });
  } catch (err) {
    console.error('Error fetching dashboard statistics:', err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;