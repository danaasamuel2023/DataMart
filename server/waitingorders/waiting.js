const express = require('express');
const router = express.Router();
const { DataPurchase, Transaction, User } = require('../schema/schema');
const adminMiddleware = require('../adminMiddleware/middleware');
const mongoose = require('mongoose');

/**
 * @route   GET /api/orders/:status
 * @desc    Get orders by status with filtering options
 * @access  Admin only
 */
router.get('/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Build filter object
    const filter = { status };
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch orders with pagination - IMPORTANT: Sort by createdAt for consistent order numbering
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 }) // Ascending order for consistent numbering
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
    console.error(`Error fetching ${req.params.status} orders:`, err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   POST /api/orders/range-update-preview
 * @desc    Preview range update operation before execution
 * @access  Admin only
 */
router.post('/range-update-preview', async (req, res) => {
  try {
    const { 
      currentStatus, 
      newStatus, 
      upToOrderNumber, 
      fromOrderNumber,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    // Validate statuses
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(currentStatus) || !validStatuses.includes(newStatus)) {
      return res.status(400).json({ msg: 'Invalid status values' });
    }
    
    // Build base filter
    let filter = { status: currentStatus };
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    // Get all orders matching base criteria (sorted by creation date for consistent numbering)
    const allOrders = await DataPurchase.find(filter, '_id createdAt phoneNumber capacity')
      .sort({ createdAt: 1 });
    
    let affectedOrders = [];
    let rangeDescription = '';
    
    // Apply range filters
    if (upToOrderNumber && fromOrderNumber) {
      // Between range
      const startIndex = Math.max(0, fromOrderNumber - 1);
      const endIndex = Math.min(allOrders.length, upToOrderNumber);
      affectedOrders = allOrders.slice(startIndex, endIndex);
      rangeDescription = `Orders ${fromOrderNumber} to ${upToOrderNumber}`;
    } else if (upToOrderNumber) {
      // Up to order number
      const endIndex = Math.min(allOrders.length, upToOrderNumber);
      affectedOrders = allOrders.slice(0, endIndex);
      rangeDescription = `Orders 1 to ${upToOrderNumber}`;
    } else if (fromOrderNumber) {
      // From order number onwards
      const startIndex = Math.max(0, fromOrderNumber - 1);
      affectedOrders = allOrders.slice(startIndex);
      rangeDescription = `Orders ${fromOrderNumber} onwards`;
    } else {
      // All orders
      affectedOrders = allOrders;
      rangeDescription = 'All orders';
    }
    
    // Calculate some statistics
    const capacityBreakdown = affectedOrders.reduce((acc, order) => {
      acc[order.capacity] = (acc[order.capacity] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      count: affectedOrders.length,
      totalAvailable: allOrders.length,
      range: rangeDescription,
      currentStatus,
      newStatus,
      capacityBreakdown,
      sampleOrders: affectedOrders.slice(0, 5).map(order => ({
        phoneNumber: order.phoneNumber,
        capacity: order.capacity,
        createdAt: order.createdAt
      }))
    });
    
  } catch (err) {
    console.error('Error previewing range update:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/range-update
 * @desc    Execute range update operation
 * @access  Admin only
 */
router.put('/range-update', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      currentStatus, 
      newStatus, 
      upToOrderNumber, 
      fromOrderNumber,
      notes,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    // Validate statuses
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(currentStatus) || !validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status values' });
    }
    
    // Build base filter
    let filter = { status: currentStatus };
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    // Get all orders matching base criteria (sorted by creation date for consistent numbering)
    const allOrders = await DataPurchase.find(filter, '_id createdAt')
      .sort({ createdAt: 1 })
      .session(session);
    
    if (allOrders.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: `No ${currentStatus} orders found with the specified criteria` });
    }
    
    let orderIdsToUpdate = [];
    let rangeDescription = '';
    
    // Apply range filters to get specific order IDs
    if (upToOrderNumber && fromOrderNumber) {
      // Between range
      const startIndex = Math.max(0, fromOrderNumber - 1);
      const endIndex = Math.min(allOrders.length, upToOrderNumber);
      orderIdsToUpdate = allOrders.slice(startIndex, endIndex).map(order => order._id);
      rangeDescription = `orders ${fromOrderNumber} to ${upToOrderNumber}`;
    } else if (upToOrderNumber) {
      // Up to order number
      const endIndex = Math.min(allOrders.length, upToOrderNumber);
      orderIdsToUpdate = allOrders.slice(0, endIndex).map(order => order._id);
      rangeDescription = `orders 1 to ${upToOrderNumber}`;
    } else if (fromOrderNumber) {
      // From order number onwards
      const startIndex = Math.max(0, fromOrderNumber - 1);
      orderIdsToUpdate = allOrders.slice(startIndex).map(order => order._id);
      rangeDescription = `orders ${fromOrderNumber} onwards`;
    } else {
      // All orders
      orderIdsToUpdate = allOrders.map(order => order._id);
      rangeDescription = 'all orders';
    }
    
    if (orderIdsToUpdate.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: 'No orders found in the specified range' });
    }
    
    // Get user ID for record keeping
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    // Prepare update operation
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing',
        adminNotes: notes || `Range update: Updated ${rangeDescription} from '${currentStatus}' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    // Execute the update
    const updateResult = await DataPurchase.updateMany(
      { _id: { $in: orderIdsToUpdate } },
      updateOperation,
      { session }
    );
    
    // If updating to completed status, update related transactions
    if (newStatus === 'completed') {
      const references = await DataPurchase.find(
        { _id: { $in: orderIdsToUpdate } },
        'geonetReference',
        { session }
      ).distinct('geonetReference');
      
      const validReferences = references.filter(ref => ref);
      
      if (validReferences.length > 0) {
        await Transaction.updateMany(
          {
            reference: { $in: validReferences },
            type: 'purchase',
            status: 'pending'
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} ${rangeDescription} from '${currentStatus}' to '${newStatus}'`,
      affected: orderIdsToUpdate.length,
      updated: updateResult.modifiedCount,
      range: rangeDescription,
      currentStatus,
      newStatus
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error executing range update:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/waiting
 * @desc    Get all waiting orders with filtering options
 * @access  Admin only
 */
router.get('/waiting', async (req, res) => {
  try {
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'waiting' };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 }) // Consistent ordering
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
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
    console.error('Error fetching waiting orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/pending
 * @desc    Get all pending orders with filtering options
 * @access  Admin only
 */
router.get('/pending', async (req, res) => {
  try {
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'pending' };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
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
    console.error('Error fetching pending orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/processing
 * @desc    Get all processing orders with filtering options
 * @access  Admin only
 */
router.get('/processing', async (req, res) => {
  try {
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'processing' };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
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
    console.error('Error fetching processing orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/completed
 * @desc    Get all completed orders with filtering options
 * @access  Admin only
 */
router.get('/completed', async (req, res) => {
  try {
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'completed' };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
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
    console.error('Error fetching completed orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/failed
 * @desc    Get all failed orders with filtering options
 * @access  Admin only
 */
router.get('/failed', async (req, res) => {
  try {
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'failed' };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
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
    console.error('Error fetching failed orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/on
 * @desc    Get all 'on' status orders with filtering options
 * @access  Admin only
 */
router.get('/on', async (req, res) => {
  try {
    const { network, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filter = { status: 'on' };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email phoneNumber');
    
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
    console.error('Error fetching on status orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/update-status
 * @desc    Update status of orders (general endpoint)
 * @access  Admin only
 */
router.put('/update-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      orderIds, 
      currentStatus,
      newStatus, 
      notes,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    let filter = {};
    
    if (currentStatus && validStatuses.includes(currentStatus)) {
      filter.status = currentStatus;
    }
    
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter._id = { $in: orderIds };
    }
    
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No orders found matching the criteria', 
        filter 
      });
    }
    
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing',
        adminNotes: notes || `Updated from '${currentStatus || 'previous status'}' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    if (newStatus === 'completed') {
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      const validReferences = references.filter(ref => ref);
      
      if (validReferences.length > 0) {
        await Transaction.updateMany(
          {
            reference: { $in: validReferences },
            type: 'purchase',
            status: 'pending'
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} orders to status "${newStatus}"`,
      affected: affectedCount,
      updated: updateResult.modifiedCount,
      filter
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Individual status-specific update endpoints (keeping existing functionality)

/**
 * @route   PUT /api/orders/waiting/update-status
 * @desc    Update status of waiting orders
 * @access  Admin only
 */
router.put('/waiting/update-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      orderIds, 
      newStatus, 
      notes,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    let filter = { status: 'waiting' };
    
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'waiting' };
    }
    
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No waiting orders found matching the criteria', 
        filter 
      });
    }
    
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing',
        adminNotes: notes || `Updated from 'waiting' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    if (newStatus === 'completed') {
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      const validReferences = references.filter(ref => ref);
      
      if (validReferences.length > 0) {
        await Transaction.updateMany(
          {
            reference: { $in: validReferences },
            type: 'purchase',
            status: 'pending'
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} waiting orders to status "${newStatus}"`,
      affected: affectedCount,
      updated: updateResult.modifiedCount,
      filter
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating waiting orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/processing/update-status
 * @desc    Update status of processing orders
 * @access  Admin only
 */
router.put('/processing/update-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      orderIds, 
      newStatus, 
      notes,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    let filter = { status: 'processing' };
    
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'processing' };
    }
    
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No processing orders found matching the criteria', 
        filter 
      });
    }
    
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: false,
        adminNotes: notes || `Updated from 'processing' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    if (newStatus === 'completed') {
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      const validReferences = references.filter(ref => ref);
      
      if (validReferences.length > 0) {
        await Transaction.updateMany(
          {
            reference: { $in: validReferences },
            type: 'purchase',
            status: 'pending'
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} processing orders to status "${newStatus}"`,
      affected: affectedCount,
      updated: updateResult.modifiedCount,
      filter
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating processing orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/pending/update-status
 * @desc    Update status of pending orders
 * @access  Admin only
 */
router.put('/pending/update-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      orderIds, 
      newStatus, 
      notes,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    const validStatuses = ['completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    let filter = { status: 'pending' };
    
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'pending' };
    }
    
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No pending orders found matching the criteria', 
        filter 
      });
    }
    
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing',
        adminNotes: notes || `Updated from 'pending' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    if (newStatus === 'completed') {
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      const validReferences = references.filter(ref => ref);
      
      if (validReferences.length > 0) {
        await Transaction.updateMany(
          {
            reference: { $in: validReferences },
            type: 'purchase',
            status: 'pending'
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} pending orders to status "${newStatus}"`,
      affected: affectedCount,
      updated: updateResult.modifiedCount,
      filter
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating pending orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/completed/update-status
 * @desc    Update status of completed orders
 * @access  Admin only
 */
router.put('/completed/update-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      orderIds, 
      newStatus, 
      notes,
      network, 
      startDate, 
      endDate 
    } = req.body;
    
    const validStatuses = ['pending', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    let filter = { status: 'completed' };
    
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'completed' };
    }
    
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No completed orders found matching the criteria', 
        filter 
      });
    }
    
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing',
        adminNotes: notes || `Updated from 'completed' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    const references = await DataPurchase.find(filter, 'geonetReference', { session })
      .distinct('geonetReference');
    
    const validReferences = references.filter(ref => ref);
    
    if (validReferences.length > 0) {
      await Transaction.updateMany(
        {
          reference: { $in: validReferences },
          type: 'purchase',
          status: 'completed'
        },
        {
          $set: {
            status: newStatus === 'pending' ? 'pending' : 
                   newStatus === 'refunded' || newStatus === 'refund' ? 'refunded' : 
                   newStatus === 'failed' ? 'failed' : 'completed',
            updatedAt: new Date()
          }
        },
        { session }
      );
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} completed orders to status "${newStatus}"`,
      affected: affectedCount,
      updated: updateResult.modifiedCount,
      filter
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating completed orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/export/:status
 * @desc    Export orders by status as Excel file (Phone Number and Capacity only)
 * @access  Admin only
 */
router.get('/export/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { network, startDate, endDate } = req.query;
    
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    const filter = { status };
    if (network) filter.network = network;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await DataPurchase.find(filter, 'phoneNumber capacity')
      .sort({ createdAt: 1 })
      .lean();
    
    if (orders.length === 0) {
      return res.status(404).json({ msg: `No ${status} orders found with the specified criteria` });
    }
    
    const formattedData = orders.map(order => {
      return {
        'Phone Number': order.phoneNumber || '',
        'Capacity': order.capacity || 0
      };
    });
    
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${status.charAt(0).toUpperCase() + status.slice(1)} Orders`);
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    res.setHeader('Content-Disposition', `attachment; filename=${status}_orders_export.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(excelBuffer);
  } catch (err) {
    console.error(`Error exporting ${req.params.status} orders:`, err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   POST /api/orders/export-selected
 * @desc    Export selected orders as Excel file (Phone Number and Capacity only)
 * @access  Admin only
 */
router.post('/export-selected', async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ msg: 'No order IDs provided for export' });
    }
    
    const orders = await DataPurchase.find(
      { _id: { $in: orderIds } },
      'phoneNumber capacity'
    )
      .sort({ createdAt: 1 })
      .lean();
    
    if (orders.length === 0) {
      return res.status(404).json({ msg: 'No orders found with the specified IDs' });
    }
    
    const formattedData = orders.map(order => {
      return {
        'Phone Number': order.phoneNumber || '',
        'Capacity': order.capacity || 0
      };
    });
    
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Orders');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=selected_orders_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting selected orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/today
 * @desc    Get today's dashboard data
 * @access  Admin only
 */
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const todayFilter = {
      createdAt: {
        $gte: startOfDay,
        $lte: today
      }
    };
    
    const totalOrders = await DataPurchase.countDocuments(todayFilter);
    
    const ordersAggregate = await DataPurchase.aggregate([
      { $match: todayFilter },
      { $group: {
          _id: null,
          totalAmount: { $sum: "$price" },
          completedAmount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$price", 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$price", 0] } },
          failedAmount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, "$price", 0] } },
          waitingAmount: { $sum: { $cond: [{ $eq: ["$status", "waiting"] }, "$price", 0] } },
          processingAmount: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, "$price", 0] } },
          onAmount: { $sum: { $cond: [{ $eq: ["$status", "on"] }, "$price", 0] } }
      }}
    ]);
    
    const ordersTotalAmount = ordersAggregate.length > 0 ? ordersAggregate[0].totalAmount : 0;
    const ordersCompletedAmount = ordersAggregate.length > 0 ? ordersAggregate[0].completedAmount : 0;
    const ordersPendingAmount = ordersAggregate.length > 0 ? ordersAggregate[0].pendingAmount : 0;
    const ordersFailedAmount = ordersAggregate.length > 0 ? ordersAggregate[0].failedAmount : 0;
    const ordersWaitingAmount = ordersAggregate.length > 0 ? ordersAggregate[0].waitingAmount : 0;
    const ordersProcessingAmount = ordersAggregate.length > 0 ? ordersAggregate[0].processingAmount : 0;
    const ordersOnAmount = ordersAggregate.length > 0 ? ordersAggregate[0].onAmount : 0;
    
    const ordersByStatus = await DataPurchase.aggregate([
      { $match: todayFilter },
      { $group: {
          _id: "$status",
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    const ordersByNetwork = await DataPurchase.aggregate([
      { $match: todayFilter },
      { $group: {
          _id: "$network",
          count: { $sum: 1 },
          amount: { $sum: "$price" }
      }},
      { $sort: { count: -1 } }
    ]);
    
    const depositsFilter = {
      ...todayFilter,
      type: 'deposit'
    };
    
    const depositsAggregate = await Transaction.aggregate([
      { $match: depositsFilter },
      { $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
      }}
    ]);
    
    const deposits = {
      total: 0,
      totalAmount: 0,
      byStatus: {}
    };
    
    depositsAggregate.forEach(item => {
      deposits.total += item.count;
      deposits.totalAmount += item.totalAmount;
      deposits.byStatus[item._id] = {
        count: item.count,
        amount: item.totalAmount
      };
    });
    
    const newUsers = await User.countDocuments(todayFilter);
    
    const dashboardData = {
      date: today,
      orders: {
        total: totalOrders,
        totalAmount: ordersTotalAmount,
        completedAmount: ordersCompletedAmount,
        pendingAmount: ordersPendingAmount,
        failedAmount: ordersFailedAmount,
        waitingAmount: ordersWaitingAmount,
        processingAmount: ordersProcessingAmount,
        onAmount: ordersOnAmount,
        byStatus: ordersByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byNetwork: ordersByNetwork
      },
      deposits: deposits,
      newUsers: newUsers
    };
    
    res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching dashboard data:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;