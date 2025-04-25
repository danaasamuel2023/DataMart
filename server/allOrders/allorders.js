const express = require('express');
const router = express.Router();
const { DataPurchase, Transaction } = require('../models/models'); // Adjust path as needed
const auth = require('../middleware/auth'); // Your auth middleware
const adminAuth = require('../middleware/adminAuth'); // Admin auth middleware

/**
 * @route   GET /api/orders
 * @desc    Get all orders with filtering options
 * @access  Admin only
 */
router.get('/', [auth, adminAuth], async (req, res) => {
  try {
    const { status, network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch orders with pagination
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
    // Get total count for pagination
    const total = await DataPurchase.countDocuments(filter);
    
    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/export/waiting
 * @desc    Export waiting orders with locking mechanism to prevent duplicates
 * @access  Admin only
 */
router.get('/export/waiting', [auth, adminAuth], async (req, res) => {
  const session = await DataPurchase.startSession();
  session.startTransaction();
  
  try {
    // Find waiting orders and mark them as being processed (atomically)
    const waitingOrders = await DataPurchase.find(
      { 
        status: 'waiting',
        // Ensure no other process is currently handling these orders
        processing: { $ne: true }
      },
      null,
      { session }
    );
    
    if (waitingOrders.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.json({ msg: 'No waiting orders available', orders: [] });
    }
    
    // Get order IDs for updating
    const orderIds = waitingOrders.map(order => order._id);
    
    // Mark these orders as being processed to prevent duplicate exports
    await DataPurchase.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { 
          processing: true,
          updatedAt: new Date()
        } 
      },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();
    
    // Return the waiting orders for processing
    res.json({
      orders: waitingOrders,
      count: waitingOrders.length
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error exporting waiting orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/bulk-update
 * @desc    Update multiple orders' status in bulk
 * @access  Admin only
 */
router.put('/bulk-update', [auth, adminAuth], async (req, res) => {
  try {
    const { orderIds, status, notes } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ msg: 'Order IDs are required' });
    }
    
    if (!status) {
      return res.status(400).json({ msg: 'Status is required' });
    }
    
    // Validate status value
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Update orders in bulk
    const updateResult = await DataPurchase.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { 
          status,
          processing: false, // Reset processing flag
          adminNotes: notes || '',
          updatedAt: new Date(),
          updatedBy: req.user.id
        } 
      }
    );
    
    // If updating to completed status, you might want to update associated transactions
    if (status === 'completed') {
      // Find related transactions and update them
      await Transaction.updateMany(
        { 
          reference: { $in: await DataPurchase.find({ _id: { $in: orderIds } }).distinct('geonetReference') },
          type: 'purchase',
          status: 'pending'
        },
        {
          $set: {
            status: 'completed',
            updatedAt: new Date()
          }
        }
      );
    }
    
    res.json({
      msg: 'Orders updated successfully',
      count: updateResult.modifiedCount,
      status
    });
  } catch (err) {
    console.error('Error updating orders in bulk:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/:id
 * @desc    Update a single order
 * @access  Admin only
 */
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { status, notes } = req.body;
    const orderId = req.params.id;
    
    // Find the order first
    const order = await DataPurchase.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Update the order
    order.status = status || order.status;
    order.adminNotes = notes || order.adminNotes;
    order.processing = false; // Reset processing flag
    order.updatedAt = new Date();
    order.updatedBy = req.user.id;
    
    await order.save();
    
    // If updating to completed status, update any associated transaction
    if (status === 'completed') {
      await Transaction.updateOne(
        { reference: order.geonetReference, type: 'purchase', status: 'pending' },
        {
          $set: {
            status: 'completed',
            updatedAt: new Date()
          }
        }
      );
    }
    
    res.json({
      msg: 'Order updated successfully',
      order
    });
  } catch (err) {
    console.error('Error updating order:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/dashboard-stats
 * @desc    Get order statistics for dashboard
 * @access  Admin only
 */
router.get('/dashboard-stats', [auth, adminAuth], async (req, res) => {
  try {
    // Get counts by status
    const statusCounts = await DataPurchase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get counts by network
    const networkCounts = await DataPurchase.aggregate([
      { $group: { _id: '$network', count: { $sum: 1 } } }
    ]);
    
    // Format the results
    const statsByStatus = {};
    statusCounts.forEach(item => {
      statsByStatus[item._id] = item.count;
    });
    
    const statsByNetwork = {};
    networkCounts.forEach(item => {
      statsByNetwork[item._id] = item.count;
    });
    
    // Total orders in the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrdersCount = await DataPurchase.countDocuments({
      createdAt: { $gte: last24Hours }
    });
    
    res.json({
      byStatus: statsByStatus,
      byNetwork: statsByNetwork,
      recentOrders: recentOrdersCount
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/status/waiting-to-processing
 * @desc    Bulk update all waiting orders to processing
 * @access  Admin only
 */
router.put('/status/waiting-to-processing', [auth, adminAuth], async (req, res) => {
  const session = await DataPurchase.startSession();
  session.startTransaction();
  
  try {
    // Find all waiting orders that are not already being processed
    const waitingOrders = await DataPurchase.find(
      { 
        status: 'waiting',
        processing: { $ne: true }
      },
      '_id',
      { session }
    );
    
    if (waitingOrders.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.json({ msg: 'No waiting orders to update', count: 0 });
    }
    
    const orderIds = waitingOrders.map(order => order._id);
    
    // Update all waiting orders to processing status
    const updateResult = await DataPurchase.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { 
          status: 'processing',
          processing: false, // Reset processing flag for future operations
          updatedAt: new Date(),
          updatedBy: req.user.id,
          adminNotes: 'Bulk updated from waiting to processing'
        } 
      },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: 'Successfully updated waiting orders to processing',
      count: updateResult.modifiedCount
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating waiting orders to processing:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;