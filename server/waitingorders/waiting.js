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
        // For startDate, set to the beginning of the day (00:00:00)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // For endDate, set to the end of the day (23:59:59)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
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
    console.error(`Error fetching ${req.params.status} orders:`, err.message);
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
    
    // Build filter object with status fixed to 'waiting'
    const filter = { status: 'waiting' };
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        // For startDate, set to the beginning of the day (00:00:00)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // For endDate, set to the end of the day (23:59:59)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch waiting orders with pagination
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
    
    // Build filter object with status fixed to 'pending'
    const filter = { status: 'pending' };
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
    
    // Fetch pending orders with pagination
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
    
    // Build filter object with status fixed to 'processing'
    const filter = { status: 'processing' };
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
    
    // Fetch processing orders with pagination
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
    
    // Build filter object with status fixed to 'completed'
    const filter = { status: 'completed' };
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
    
    // Fetch completed orders with pagination
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
    console.error('Error fetching completed orders:', err.message);
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
    
    // Build filter object with status fixed to 'on'
    const filter = { status: 'on' };
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
    
    // Fetch 'on' status orders with pagination
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
    console.error('Error fetching on status orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/update-status
 * @desc    Update status of orders
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
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Build filter object
    let filter = {};
    
    // If current status is specified, filter by it
    if (currentStatus && validStatuses.includes(currentStatus)) {
      filter.status = currentStatus;
    }
    
    // If specific order IDs are provided, use them
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter._id = { $in: orderIds };
    }
    
    // Additional filters
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Check how many orders will be affected
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No orders found matching the criteria', 
        filter 
      });
    }
    
    // Get user ID for record keeping, set to null if not available
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    // Update orders - use MongoDB update operation structure
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing', // Set processing flag based on new status
        adminNotes: notes || `Updated from '${currentStatus || 'previous status'}' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    // Only add updatedBy if we have a valid user ID
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    // Update orders
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    // If updating to completed status, update transactions as well
    if (newStatus === 'completed') {
      // Get all references
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      // Filter out empty references
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
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Build filter object
    let filter = { status: 'waiting' };
    
    // If specific order IDs are provided, use them
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'waiting' };
    }
    
    // Additional filters
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Check how many orders will be affected
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No waiting orders found matching the criteria', 
        filter 
      });
    }
    
    // Get user ID for record keeping, set to null if not available
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    // Update orders - use MongoDB update operation structure
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing', // Set processing flag based on new status
        adminNotes: notes || `Updated from 'waiting' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    // Only add updatedBy if we have a valid user ID
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    // Update orders
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    // If updating to completed status, update transactions as well
    if (newStatus === 'completed') {
      // Get all references
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      // Filter out empty references
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
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Build filter object
    let filter = { status: 'processing' };
    
    // If specific order IDs are provided, use them
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'processing' };
    }
    
    // Additional filters
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Check how many orders will be affected
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No processing orders found matching the criteria', 
        filter 
      });
    }
    
    // Get user ID for record keeping, set to null if not available
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    // Update orders - use MongoDB update operation structure
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: false, // Clear processing flag as we're changing status
        adminNotes: notes || `Updated from 'processing' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    // Only add updatedBy if we have a valid user ID
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    // Update orders
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    // If updating to completed status, update transactions as well
    if (newStatus === 'completed') {
      // Get all references
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      // Filter out empty references
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
    
    // Validate status
    const validStatuses = ['completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Build filter object
    let filter = { status: 'pending' };
    
    // If specific order IDs are provided, use them
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'pending' };
    }
    
    // Additional filters
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Check how many orders will be affected
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No pending orders found matching the criteria', 
        filter 
      });
    }
    
    // Get user ID for record keeping, set to null if not available
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    // Update orders - use MongoDB update operation structure
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing', // Set processing flag based on new status
        adminNotes: notes || `Updated from 'pending' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    // Only add updatedBy if we have a valid user ID
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    // Update orders
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    // If updating to completed status, update transactions as well
    if (newStatus === 'completed') {
      // Get all references
      const references = await DataPurchase.find(filter, 'geonetReference', { session })
        .distinct('geonetReference');
      
      // Filter out empty references
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
    
    // Validate status
    const validStatuses = ['pending', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Build filter object
    let filter = { status: 'completed' };
    
    // If specific order IDs are provided, use them
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter = { _id: { $in: orderIds }, status: 'completed' };
    }
    
    // Additional filters
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Check how many orders will be affected
    const affectedCount = await DataPurchase.countDocuments(filter);
    
    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        msg: 'No completed orders found matching the criteria', 
        filter 
      });
    }
    
    // Get user ID for record keeping, set to null if not available
    let updatedById = null;
    if (req.user && (req.user._id || req.user.id)) {
      updatedById = req.user._id || req.user.id;
    }
    
    // Update orders - use MongoDB update operation structure
    const updateOperation = {
      $set: {
        status: newStatus,
        processing: newStatus === 'processing', // Set processing flag based on new status
        adminNotes: notes || `Updated from 'completed' to '${newStatus}'`,
        updatedAt: new Date()
      }
    };
    
    // Only add updatedBy if we have a valid user ID
    if (updatedById) {
      updateOperation.$set.updatedBy = updatedById;
    }
    
    // Update orders
    const updateResult = await DataPurchase.updateMany(
      filter,
      updateOperation,
      { session }
    );
    
    // If moving from completed to another status, we may need to update related transactions as well
    // Get all references
    const references = await DataPurchase.find(filter, 'geonetReference', { session })
      .distinct('geonetReference');
    
    // Filter out empty references
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
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Get orders - only need phoneNumber and capacity fields
    const orders = await DataPurchase.find(filter, 'phoneNumber capacity')
      .sort({ createdAt: -1 })
      .lean();
    
    if (orders.length === 0) {
      return res.status(404).json({ msg: `No ${status} orders found with the specified criteria` });
    }
    
    // Format data for Excel - ONLY Phone Number and Capacity
    const formattedData = orders.map(order => {
      return {
        'Phone Number': order.phoneNumber || '',
        'Capacity': order.capacity || 0
      };
    });
    
    // Create workbook
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${status.charAt(0).toUpperCase() + status.slice(1)} Orders`);
    
    // Generate excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${status}_orders_export.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send file
    res.send(excelBuffer);
  } catch (err) {
    console.error(`Error exporting ${req.params.status} orders:`, err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/waiting/export
 * @desc    Export waiting orders as Excel file (Phone Number and Capacity only)
 * @access  Admin only
 */
router.get('/waiting/export', async (req, res) => {
  try {
    const { network, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = { status: 'waiting' };
    if (network) filter.network = network;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Get orders - only need phoneNumber and capacity fields
    const orders = await DataPurchase.find(filter, 'phoneNumber capacity')
      .sort({ createdAt: -1 })
      .lean();
    
    if (orders.length === 0) {
      return res.status(404).json({ msg: 'No waiting orders found with the specified criteria' });
    }
    
    // Format data for Excel - ONLY Phone Number and Capacity
    const formattedData = orders.map(order => {
      return {
        'Phone Number': order.phoneNumber || '',
        'Capacity': order.capacity || 0
      };
    });
    
    // Create workbook
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Waiting Orders');
    
    // Generate excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=waiting_orders_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send file
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting waiting orders:', err.message);
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
    
    // Validate orderIds
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ msg: 'No order IDs provided for export' });
    }
    
    // Get orders - only need phoneNumber and capacity fields
    const orders = await DataPurchase.find(
      { _id: { $in: orderIds } },
      'phoneNumber capacity'
    )
      .sort({ createdAt: -1 })
      .lean();
    
    if (orders.length === 0) {
      return res.status(404).json({ msg: 'No orders found with the specified IDs' });
    }
    
    // Format data for Excel - ONLY Phone Number and Capacity
    const formattedData = orders.map(order => {
      return {
        'Phone Number': order.phoneNumber || '',
        'Capacity': order.capacity || 0
      };
    });
    
    // Create workbook
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Orders');
    
    // Generate excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=selected_orders_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send file
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
    // Get today's date range (start of day to current time)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Build filter for today's date
    const todayFilter = {
      createdAt: {
        $gte: startOfDay,
        $lte: today
      }
    };
    
    // Get total orders count
    const totalOrders = await DataPurchase.countDocuments(todayFilter);
    
    // Get total orders amount (sum of price field)
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
    
    // Get orders by status
    const ordersByStatus = await DataPurchase.aggregate([
      { $match: todayFilter },
      { $group: {
          _id: "$status",
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Get orders by network
    const ordersByNetwork = await DataPurchase.aggregate([
      { $match: todayFilter },
      { $group: {
          _id: "$network",
          count: { $sum: 1 },
          amount: { $sum: "$price" }
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Get deposits information
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
    
    // Transform deposits data for easier consumption
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
    
    // Get new users count for today
    const newUsers = await User.countDocuments(todayFilter);
    
    // Prepare response
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