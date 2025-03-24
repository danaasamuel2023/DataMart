const express = require('express');
const router = express.Router();
const { User, DataPurchase, Transaction, ReferralBonus,DataInventory } = require('../schema/schema');
const mongoose = require('mongoose');
const auth = require('../middlewareUser/middleware');
const adminAuth = require('../adminMiddleware/middleware');

// Middleware to check if user is admin


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
      limit = 10, 
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
    
    if (!['pending', 'completed', 'failed', 'processing', 'refunded'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Find the order first to get previous status and user info
    const order = await DataPurchase.findById(req.params.id)
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
                const refundMessage = `Your data order for ${order.dataAmount}${order.dataUnit} on ${order.network} could not be processed. Your account has been refunded with ₵${order.price}. Reference: ${order.reference}`;
                
                // Assuming you have a sendSMS function similar to the one in paste-2.txt
                // This would be imported or defined elsewhere in your application
                await sendSMS(userPhone, refundMessage, {
                  useCase: 'transactional',
                  senderID: 'YourCompany' // Replace with your actual sender ID
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
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
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

module.exports = router;