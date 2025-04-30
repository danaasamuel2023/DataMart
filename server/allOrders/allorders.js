const express = require('express');
const router = express.Router();
const { DataPurchase, Transaction } = require('../schema/schema');

const adminAuth = require('../adminMiddleware/middleware');
const XLSX = require('xlsx'); // You'll need to install this: npm install xlsx

/**
 * @route   GET /api/orders
 * @desc    Get all orders with filtering options
 * @access  Admin only
 */
router.get('/admin-orders',  adminAuth, async (req, res) => {
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
 * @route   GET /api/orders/export
 * @desc    Export orders as Excel file with filtering
 * @access  Admin only
 */
router.get('/export',  adminAuth, async (req, res) => {
  try {
    const { status, network, startDate, endDate } = req.query;
    
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
    
    // Get orders with populated user data
    const orders = await DataPurchase.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phoneNumber')
      .lean();
    
    if (orders.length === 0) {
      return res.status(404).json({ msg: 'No orders found with the specified criteria' });
    }
    
    // Format data for Excel
    const formattedData = orders.map(order => {
      return {
        'Order ID': order._id.toString(),
        'Reference': order.geonetReference || '',
        'Customer': order.userId ? order.userId.name : 'Unknown',
        'Email': order.userId ? order.userId.email : '',
        'Phone': order.userId ? order.userId.phoneNumber : '',
        'Network': order.network || '',
        'Plan': order.plan || '',
        'Amount': order.capacity || 0,
        'Status': order.status || '',
        'Created Date': order.createdAt ? new Date(order.createdAt).toLocaleString() : '',
        'Updated Date': order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '',
        'Notes': order.adminNotes || ''
      };
    });
    
    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    // Set column widths
    const maxWidth = Object.keys(formattedData[0]).reduce((acc, key) => {
      acc[key] = Math.max(key.length, 15); // Min width of 15
      return acc;
    }, {});
    
    // Generate excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send file
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting orders:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/time-range-update
 * @desc    Update all orders from a specific time range
 * @access  Admin only
 */
router.put('/time-range-update',  adminAuth, async (req, res) => {
  const session = await DataPurchase.startSession();
  session.startTransaction();
  
  try {
    const { 
      startTime, 
      endTime, 
      newStatus,
      currentStatuses = [],
      networks = []
    } = req.body;
    
    // Validate inputs
    if (!newStatus || (!startTime && !endTime)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        msg: 'New status and at least one time boundary (start or end) are required' 
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'processing', 'refunded', 'refund', 'delivered', 'on', 'waiting'];
    if (!validStatuses.includes(newStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    // Parse dates
    const filter = {};
    
    if (startTime || endTime) {
      filter.createdAt = {};
      
      if (startTime) {
        const startDate = new Date(startTime);
        if (isNaN(startDate.getTime())) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ msg: 'Invalid start time format' });
        }
        filter.createdAt.$gte = startDate;
      }
      
      if (endTime) {
        const endDate = new Date(endTime);
        if (isNaN(endDate.getTime())) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ msg: 'Invalid end time format' });
        }
        filter.createdAt.$lte = endDate;
      }
    }
    
    // Filter by current statuses if specified
    if (currentStatuses.length > 0) {
      filter.status = { $in: currentStatuses };
    }
    
    // Filter by networks if specified
    if (networks.length > 0) {
      filter.network = { $in: networks };
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
    
    // Update orders
    const updateResult = await DataPurchase.updateMany(
      filter,
      {
        $set: {
          status: newStatus,
          processing: false,
          adminNotes: `Bulk updated to ${newStatus} via time range update`,
          updatedAt: new Date(),
          updatedBy: req.user.id
        }
      },
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
    
    // Format response message
    let timeDescription = '';
    if (startTime && endTime) {
      timeDescription = `between ${new Date(startTime).toISOString()} and ${new Date(endTime).toISOString()}`;
    } else if (startTime) {
      timeDescription = `after ${new Date(startTime).toISOString()}`;
    } else if (endTime) {
      timeDescription = `before ${new Date(endTime).toISOString()}`;
    }
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} orders ${timeDescription} to status "${newStatus}"`,
      affected: affectedCount,
      updated: updateResult.modifiedCount,
      filter
    });
    
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating orders by time range:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/export/processing
 * @desc    Export and mark orders as processing (for external processing)
 * @access  Admin only
 */
router.get('/export/processing',  adminAuth, async (req, res) => {
  const session = await DataPurchase.startSession();
  session.startTransaction();
  
  try {
    const { status = 'waiting' } = req.query;
    
    // Find orders with the specified status that are not being processed
    const ordersToProcess = await DataPurchase.find(
      { 
        status,
        processing: { $ne: true }
      },
      null,
      { session }
    ).populate('userId', 'name email phoneNumber');
    
    if (ordersToProcess.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: `No ${status} orders available for processing` });
    }
    
    // Get order IDs
    const orderIds = ordersToProcess.map(order => order._id);
    
    // Mark these orders as being processed
    await DataPurchase.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { 
          status: 'processing',
          processing: true,
          adminNotes: `Exported for processing by ${req.user.id} on ${new Date().toISOString()}`,
          updatedAt: new Date(),
          updatedBy: req.user.id
        } 
      },
      { session }
    );
    
    // Format data for Excel
    const formattedData = ordersToProcess.map(order => {
      return {
        'Order ID': order._id.toString(),
        'Reference': order.geonetReference || '',
        'Customer': order.userId ? order.userId.name : 'Unknown',
        'Email': order.userId ? order.userId.email : '',
        'Phone': order.userId ? order.userId.phoneNumber : '',
        'Network': order.network || '',
        'Plan': order.plan || '',
        'Phone Number': order.phoneNumber || '',
        'Amount': order.amount || 0,
        'Previous Status': order.status || '',
        'Created Date': order.createdAt ? new Date(order.createdAt).toISOString() : '',
        'Notes': order.adminNotes || ''
      };
    });
    
    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Processing Orders');
    
    // Generate excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    await session.commitTransaction();
    session.endSession();
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${status}_to_processing_orders.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send file
    res.send(excelBuffer);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error exporting orders for processing:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/bulk-status-update
 * @desc    Update multiple orders' status in bulk
 * @access  Admin only
 */
router.put('/bulk-status-update',  adminAuth, async (req, res) => {
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
          adminNotes: notes || `Bulk updated to ${status} on ${new Date().toISOString()}`,
          updatedAt: new Date(),
          updatedBy: req.user.id
        } 
      }
    );
    
    // If updating to completed status, update associated transactions
    if (status === 'completed') {
      // Find related transactions and update them
      const references = await DataPurchase.find({ _id: { $in: orderIds } }).distinct('geonetReference');
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
          }
        );
      }
    }
    
    res.json({
      msg: `Successfully updated ${updateResult.modifiedCount} orders to "${status}"`,
      count: updateResult.modifiedCount,
      status
    });
  } catch (err) {
    console.error('Error updating orders in bulk:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;