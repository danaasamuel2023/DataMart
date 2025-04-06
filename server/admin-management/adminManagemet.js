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
    
    if (!['pending', 'completed', 'failed', 'processing', 'refunded','delivered'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Find the order by geonetReference instead of _id
    const order = await DataPurchase.findOne({ geonetReference: req.params.id })
      .populate('userId', 'name email phoneNumber walletBalance');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    const previousStatus = order.status;
    
    // Process refund if status is being changed to failed
    if (status === 'failed' && previousStatus !== 'failed') {
      try {
        // Start a transaction for the refund process
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
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
              gateway: 'wallet-refund'
            });
            
            await transaction.save({ session });
            
            console.log(`Refunded ${order.price} to user ${user._id} for order ${order._id}`);
            
            // Send refund SMS to the user
            try {
              // Format phone number for SMS if needed
              const formatPhoneForSms = (phone) => {
                // Remove the '+' if it exists or format as needed
                return phone.replace(/^\+233/, '');
              };
              
              if (user.phoneNumber) {
                const userPhone = formatPhoneForSms(user.phoneNumber);
                const refundMessage = `DATAMART: Your order for ${order.capacity}GB ${order.network} data bundle (Ref: ${order.geonetReference}) could not be processed. Your account has been refunded with GHS${order.price.toFixed(2)}. Thank you for choosing DATAMART.`;
                
                // Assuming you have a sendSMS function similar to the one in paste-2.txt
                // This would be imported or defined elsewhere in your application
                await sendSMS(userPhone, refundMessage, {
                  useCase: 'transactional',
                  senderID: 'Bundle' // Replace with your actual sender ID
                });
                
                console.log(`Refund SMS sent to ${userPhone} for order ${order._id}`);
              }
            } catch (smsError) {
              console.error('Failed to send refund SMS:', smsError.message);
              // Continue with the transaction even if SMS fails
            }
          } else {
            console.error(`User not found for refund: ${order.userId._id}`);
          }
          
          // Update the order status
          order.status = status;
          order.processedBy = req.user.id; // Assuming you store the admin ID who processed it
          order.updatedAt = Date.now();
          await order.save({ session });
          
          await session.commitTransaction();
          session.endSession();
          
        } catch (txError) {
          await session.abortTransaction();
          session.endSession();
          throw txError;
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError.message);
        return res.status(500).json({ msg: 'Error processing refund' });
      }
    } else {
      // Just update the status if not a refund scenario
      order.status = status;
      order.updatedAt = Date.now();
      await order.save();
    }
    
    res.json({
      msg: 'Order status updated successfully',
      order
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId' || err.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid order format' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get admin dashboard analytics
 * @access  Admin
 */
router.get('/analytics', async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();
    
    // Total orders
    const totalOrders = await DataPurchase.countDocuments();
    
    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRevenue = await DataPurchase.aggregate([
      { 
        $match: { 
          createdAt: { $gte: today },
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    // This month's revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthlyRevenue = await DataPurchase.aggregate([
      { 
        $match: { 
          createdAt: { $gte: firstDayOfMonth },
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    // Recent orders
    const recentOrders = await DataPurchase.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      totalUsers,
      totalOrders,
      todayRevenue: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
      monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
      recentOrders
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


router.put('/inventory/:network/toggle',auth, adminAuth, async (req, res) => {
  try {
    const { network } = req.params;
    
    // Find the inventory item
    let inventoryItem = await DataInventory.findOne({ network });
    
    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      inventoryItem = new DataInventory({
        network,
        inStock: false // Set to false since we're toggling from non-existent (assumed true)
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
      message: `${network} is now ${inventoryItem.inStock ? 'in stock' : 'out of stock'}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/check-availability
 * @desc    Check network availability
 * @access  Public
 */
router.get('/check-availability', async (req, res) => {
  try {
    const { network } = req.query;
    
    if (!network) {
      return res.status(400).json({ msg: 'Please provide network name' });
    }
    
    const inventoryItem = await DataInventory.findOne({ network });
    
    // If network doesn't exist in inventory or is marked as out of stock
    if (!inventoryItem || !inventoryItem.inStock) {
      return res.json({ 
        available: false, 
        message: `${network} data is currently out of stock` 
      });
    }
    
    // Network is available
    return res.json({ 
      available: true,
      message: `${network} data is available for purchase` 
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

module.exports = router;