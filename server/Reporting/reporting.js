const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, DataPurchase, Transaction, OrderReport } = require('../schema/schema');

// Enhanced logging function (reusing from your existing code)
const logOperation = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
};

// =====================================
// ORDER REPORT ROUTES AND CONTROLLERS
// =====================================

// Create a new report for an order that is completed but not received
router.post('/create', async (req, res) => {
  try {
    const { purchaseId, reason, userId } = req.body;
    
    logOperation('ORDER_REPORT_CREATE_REQUEST', {
      userId,
      purchaseId,
      reason: reason.substring(0, 20) + '...',
      timestamp: new Date()
    });
    
    // Validate required fields
    if (!purchaseId || !reason || !userId) {
      logOperation('ORDER_REPORT_VALIDATION_ERROR', {
        missingFields: {
          purchaseId: !purchaseId,
          reason: !reason,
          userId: !userId
        }
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }
    
    // Check if the purchase exists and belongs to the user
    const purchase = await DataPurchase.findOne({ 
      _id: purchaseId, 
      userId: userId,
      status: "completed" // Only completed orders can be reported
    });
    
    if (!purchase) {
      logOperation('ORDER_REPORT_PURCHASE_NOT_FOUND', { purchaseId, userId });
      return res.status(404).json({ 
        status: 'error', 
        message: "No completed order found with this ID" 
      });
    }
    
    // Check if there's already an active report for this purchase
    const existingReport = await OrderReport.findOne({
      purchaseId: purchaseId,
      status: { $ne: "resolved" } // Any status that's not resolved
    });
    
    if (existingReport) {
      logOperation('ORDER_REPORT_DUPLICATE', {
        purchaseId,
        existingReportId: existingReport._id,
        existingStatus: existingReport.status
      });
      
      return res.status(400).json({
        status: 'error',
        message: "An active report already exists for this order",
        reportId: existingReport._id
      });
    }
    
    // First get purchase details to include order date information
    const purchaseDetails = await DataPurchase.findById(purchaseId);
    if (!purchaseDetails) {
      logOperation('ORDER_REPORT_PURCHASE_DETAILS_NOT_FOUND', { purchaseId });
      return res.status(404).json({ 
        status: 'error', 
        message: "Order details not found" 
      });
    }
    
    // Create a new report with order date information
    const newReport = new OrderReport({
      userId,
      purchaseId,
      reason,
      orderDate: purchaseDetails.createdAt, // Store the original order date
      orderDetails: {
        phoneNumber: purchaseDetails.phoneNumber,
        network: purchaseDetails.network,
        capacity: purchaseDetails.capacity,
        price: purchaseDetails.price,
        geonetReference: purchaseDetails.geonetReference,
        purchaseDate: purchaseDetails.createdAt
      }
    });
    
    await newReport.save();
    
    logOperation('ORDER_REPORT_CREATED', {
      reportId: newReport._id,
      purchaseId,
      userId,
      timestamp: new Date()
    });
    
    return res.status(201).json({
      status: 'success',
      message: "Order report submitted successfully",
      reportId: newReport._id
    });
  } catch (error) {
    logOperation('ORDER_REPORT_CREATE_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while creating report",
      details: error.message
    });
  }
});

// Get all reports for a user
router.get('/my-reports/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    logOperation('USER_REPORTS_REQUEST', { userId });
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logOperation('USER_REPORTS_INVALID_ID', { userId });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }
    
    const reports = await OrderReport.find({ userId })
      .populate({
        path: 'purchaseId',
        select: 'phoneNumber network capacity price createdAt status'
      })
      .sort({ createdAt: -1 }); // Newest first
    
    // Format the reports to include additional order date information
    const formattedReports = reports.map(report => {
      const reportObj = report.toObject();
      
      // Calculate days since order was placed
      let daysSinceOrder = null;
      let orderDate = null;
      
      // Use either the cached orderDate or the purchase date from the relationship
      if (report.orderDate) {
        orderDate = report.orderDate;
      } else if (report.purchaseId && report.purchaseId.createdAt) {
        orderDate = report.purchaseId.createdAt;
      } else if (report.orderDetails && report.orderDetails.purchaseDate) {
        orderDate = report.orderDetails.purchaseDate;
      }
      
      if (orderDate) {
        daysSinceOrder = Math.floor((Date.now() - new Date(orderDate)) / (1000 * 60 * 60 * 24));
        reportObj.orderDate = orderDate;
        reportObj.formattedOrderDate = new Date(orderDate).toLocaleString();
        reportObj.daysSinceOrder = daysSinceOrder;
      }
      
      return reportObj;
    });
    
    logOperation('USER_REPORTS_FOUND', {
      userId,
      count: reports.length,
      reportIds: reports.map(r => r._id)
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        reports: formattedReports,
        count: formattedReports.length
      }
    });
  } catch (error) {
    logOperation('USER_REPORTS_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while fetching reports",
      details: error.message
    });
  }
});

// Get a single report details
router.get('/details/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userId } = req.query; // Optional: to verify ownership
    
    logOperation('REPORT_DETAILS_REQUEST', {
      reportId,
      userId,
      timestamp: new Date()
    });
    
    // Build the query
    const query = { _id: reportId };
    if (userId) {
      query.userId = userId;
    }
    
    const report = await OrderReport.findOne(query)
      .populate({
        path: 'purchaseId',
        select: 'phoneNumber network capacity price status geonetReference createdAt'
      })
      .populate({
        path: 'userId',
        select: 'name email phoneNumber'
      });
      
    if (!report) {
      logOperation('REPORT_DETAILS_NOT_FOUND', { reportId, userId });
      return res.status(404).json({
        status: 'error',
        message: "Report not found"
      });
    }
    
    // Format report to include order date information
    const reportObj = report.toObject();
    
    // Determine order date from multiple possible sources (prioritize cached data)
    let orderDate = null;
    
    if (report.orderDate) {
      // Use the dedicated orderDate field if available
      orderDate = report.orderDate;
    } else if (report.purchaseId && report.purchaseId.createdAt) {
      // Fall back to the purchase relationship
      orderDate = report.purchaseId.createdAt;
    } else if (report.orderDetails && report.orderDetails.purchaseDate) {
      // Fall back to cached order details
      orderDate = report.orderDetails.purchaseDate;
    }
    
    if (orderDate) {
      const daysSinceOrder = Math.floor((Date.now() - new Date(orderDate)) / (1000 * 60 * 60 * 24));
      
      reportObj.orderDate = orderDate;
      reportObj.formattedOrderDate = new Date(orderDate).toLocaleString();
      reportObj.daysSinceOrder = daysSinceOrder;
      
      // Add a human-readable description of time elapsed
      if (daysSinceOrder === 0) {
        reportObj.timeElapsed = "Today";
      } else if (daysSinceOrder === 1) {
        reportObj.timeElapsed = "Yesterday";
      } else if (daysSinceOrder < 7) {
        reportObj.timeElapsed = `${daysSinceOrder} days ago`;
      } else if (daysSinceOrder < 30) {
        const weeks = Math.floor(daysSinceOrder / 7);
        reportObj.timeElapsed = `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      } else {
        const months = Math.floor(daysSinceOrder / 30);
        reportObj.timeElapsed = `${months} ${months === 1 ? 'month' : 'months'} ago`;
      }
    }
    
    // Add information about the order details (use cached data if relationship is missing)
    if (!report.purchaseId && report.orderDetails) {
      reportObj.orderInfo = report.orderDetails;
    }
    
    logOperation('REPORT_DETAILS_FOUND', {
      reportId: report._id,
      purchaseId: report.purchaseId ? report.purchaseId._id : null,
      status: report.status,
      orderDate: orderDate
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        report: reportObj
      }
    });
  } catch (error) {
    logOperation('REPORT_DETAILS_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while fetching report details",
      details: error.message
    });
  }
});

// ADMIN ENDPOINTS

// Get all reports (admin only)
router.get('/admin/all', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;
    const adminId = req.query.adminId; // For verification
    
    logOperation('ADMIN_ALL_REPORTS_REQUEST', {
      adminId,
      status,
      page,
      limit,
      startDate,
      endDate,
      timestamp: new Date()
    });
    
    // Verify admin role if needed (you might want to add middleware for this)
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        logOperation('ADMIN_UNAUTHORIZED_ACCESS', { adminId });
        return res.status(403).json({
          status: 'error',
          message: "Unauthorized: Admin access required"
        });
      }
    }
    
    // Build filter
    const filter = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      filter.status = status;
    }
    
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
    
    logOperation('ADMIN_REPORTS_FILTER', filter);
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Count total matching reports for pagination
    const totalReports = await OrderReport.countDocuments(filter);
    
    // Fetch reports with pagination
    const reports = await OrderReport.find(filter)
      .populate({
        path: 'userId',
        select: 'name email phoneNumber'
      })
      .populate({
        path: 'purchaseId',
        select: 'phoneNumber network capacity price status geonetReference createdAt'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    logOperation('ADMIN_REPORTS_FOUND', {
      totalReports,
      returnedCount: reports.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReports / parseInt(limit))
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        reports,
        pagination: {
          total: totalReports,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReports / parseInt(limit)),
          perPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logOperation('ADMIN_REPORTS_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while fetching reports",
      details: error.message
    });
  }
});

// Update report status (admin only)
router.put('/admin/update/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes, resolution, adminId } = req.body;
    
    logOperation('ADMIN_UPDATE_REPORT_REQUEST', {
      reportId,
      adminId,
      status,
      resolution,
      adminNotesLength: adminNotes ? adminNotes.length : 0,
      timestamp: new Date()
    });
    
    // Verify admin role if needed
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        logOperation('ADMIN_UNAUTHORIZED_UPDATE', { adminId });
        return res.status(403).json({
          status: 'error',
          message: "Unauthorized: Admin access required"
        });
      }
    }
    
    const report = await OrderReport.findById(reportId);
    
    if (!report) {
      logOperation('ADMIN_UPDATE_REPORT_NOT_FOUND', { reportId });
      return res.status(404).json({
        status: 'error',
        message: "Report not found"
      });
    }
    
    // Store old status for logging
    const oldStatus = report.status;
    
    // Update the report
    report.status = status || report.status;
    report.adminNotes = adminNotes || report.adminNotes;
    report.resolution = resolution || report.resolution;
    report.updatedAt = Date.now();
    
    await report.save();
    
    logOperation('ADMIN_UPDATE_REPORT_SUCCESS', {
      reportId,
      oldStatus,
      newStatus: report.status,
      updatedAt: report.updatedAt
    });
    
    // If resolving the report as a refund, you might want to create a refund transaction here
    // or mark it for refund processing
    if (report.status === 'resolved' && report.resolution === 'refund') {
      logOperation('REPORT_REFUND_REQUIRED', {
        reportId,
        purchaseId: report.purchaseId
      });
      
      // Additional refund processing logic would go here
      // This would likely involve creating a refund transaction
      // and updating user wallet balance
    }
    
    return res.status(200).json({
      status: 'success',
      message: "Report updated successfully",
      data: {
        report
      }
    });
  } catch (error) {
    logOperation('ADMIN_UPDATE_REPORT_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while updating report",
      details: error.message
    });
  }
});

// Get report statistics (admin only)
router.get('/admin/stats', async (req, res) => {
  try {
    const { adminId } = req.query;
    
    logOperation('ADMIN_REPORT_STATS_REQUEST', {
      adminId,
      timestamp: new Date()
    });
    
    // Verify admin role if needed
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        logOperation('ADMIN_UNAUTHORIZED_STATS', { adminId });
        return res.status(403).json({
          status: 'error',
          message: "Unauthorized: Admin access required"
        });
      }
    }
    
    // Get total count of reports by status
    const statusCounts = await OrderReport.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format status counts into an object
    const statusStats = {};
    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });
    
    // Calculate total reports
    const totalReports = await OrderReport.countDocuments();
    
    // Get reports created in the last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    const last24HoursCount = await OrderReport.countDocuments({
      createdAt: { $gte: last24Hours }
    });
    
    // Get reports created in the last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysCount = await OrderReport.countDocuments({
      createdAt: { $gte: last7Days }
    });
    
    // Get reports by network type
    const networkStats = await OrderReport.aggregate([
      {
        $lookup: {
          from: 'datapurchases',
          localField: 'purchaseId',
          foreignField: '_id',
          as: 'purchase'
        }
      },
      { $unwind: '$purchase' },
      {
        $group: {
          _id: '$purchase.network',
          count: { $sum: 1 }
        }
      }
    ]);
    
    logOperation('ADMIN_REPORT_STATS_GENERATED', {
      totalReports,
      statusStats,
      last24HoursCount,
      last7DaysCount,
      networkStats
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        totalReports,
        statusStats,
        recentActivity: {
          last24Hours: last24HoursCount,
          last7Days: last7DaysCount
        },
        networkStats: networkStats.map(item => ({
          network: item._id,
          count: item.count,
          percentage: Math.round((item.count / totalReports) * 100)
        }))
      }
    });
  } catch (error) {
    logOperation('ADMIN_REPORT_STATS_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while fetching report statistics",
      details: error.message
    });
  }
});

// Process refunds for resolved reports (admin endpoint)
router.post('/admin/process-refund/:reportId', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { reportId } = req.params;
    const { adminId } = req.body;
    
    logOperation('ADMIN_PROCESS_REFUND_REQUEST', {
      reportId,
      adminId,
      timestamp: new Date()
    });
    
    // Verify admin role
    if (adminId) {
      const admin = await User.findById(adminId).session(session);
      if (!admin || admin.role !== 'admin') {
        logOperation('ADMIN_UNAUTHORIZED_REFUND', { adminId });
        return res.status(403).json({
          status: 'error',
          message: "Unauthorized: Admin access required"
        });
      }
    }
    
    // Get the report with related purchase
    const report = await OrderReport.findById(reportId).session(session);
    
    if (!report) {
      logOperation('ADMIN_REFUND_REPORT_NOT_FOUND', { reportId });
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: "Report not found"
      });
    }
    
    // Ensure report is in the right state to be refunded
    if (report.status !== 'resolved' || report.resolution !== 'refund') {
      logOperation('ADMIN_REFUND_INVALID_STATUS', {
        reportId,
        status: report.status,
        resolution: report.resolution
      });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: "Report must be resolved with refund resolution to process refund"
      });
    }
    
    // Get the related purchase
    const purchase = await DataPurchase.findById(report.purchaseId).session(session);
    
    if (!purchase) {
      logOperation('ADMIN_REFUND_PURCHASE_NOT_FOUND', {
        reportId,
        purchaseId: report.purchaseId
      });
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: "Related purchase not found"
      });
    }
    
    // Get the user
    const user = await User.findById(report.userId).session(session);
    
    if (!user) {
      logOperation('ADMIN_REFUND_USER_NOT_FOUND', {
        reportId,
        userId: report.userId
      });
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: "User not found"
      });
    }
    
    // Create a refund transaction
    const refundTransaction = new Transaction({
      userId: user._id,
      type: 'refund',
      amount: purchase.price, // Refund the full purchase price
      status: 'completed',
      reference: `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      gateway: 'wallet'
    });
    
    await refundTransaction.save({ session });
    
    // Update user's wallet balance
    const oldBalance = user.walletBalance;
    user.walletBalance += purchase.price;
    await user.save({ session });
    
    // Update purchase status if needed
    if (purchase.status !== 'refunded') {
      purchase.status = 'refunded';
      await purchase.save({ session });
    }
    
    // Update report to indicate refund is processed
    report.adminNotes = (report.adminNotes || '') + `\nRefund processed on ${new Date().toISOString()}`;
    await report.save({ session });
    
    logOperation('ADMIN_REFUND_PROCESSED', {
      reportId,
      purchaseId: purchase._id,
      userId: user._id,
      refundAmount: purchase.price,
      oldBalance,
      newBalance: user.walletBalance,
      refundTransactionId: refundTransaction._id
    });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    return res.status(200).json({
      status: 'success',
      message: "Refund processed successfully",
      data: {
        refundTransaction,
        newWalletBalance: user.walletBalance
      }
    });
  } catch (error) {
    // Rollback transaction
    await session.abortTransaction();
    session.endSession();
    
    logOperation('ADMIN_PROCESS_REFUND_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while processing refund",
      details: error.message
    });
  }
});

// Add a route to count unread/pending reports for admin dashboard
router.get('/admin/pending-count', async (req, res) => {
  try {
    const { adminId } = req.query;
    
    logOperation('ADMIN_PENDING_REPORTS_COUNT_REQUEST', {
      adminId,
      timestamp: new Date()
    });
    
    // Verify admin role if needed
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        logOperation('ADMIN_UNAUTHORIZED_COUNT', { adminId });
        return res.status(403).json({
          status: 'error',
          message: "Unauthorized: Admin access required"
        });
      }
    }
    
    // Count pending reports
    const pendingCount = await OrderReport.countDocuments({ status: 'pending' });
    
    // Count reports in investigation
    const investigatingCount = await OrderReport.countDocuments({ status: 'investigating' });
    
    // Get the oldest pending report's date
    const oldestPending = await OrderReport.findOne({ status: 'pending' })
      .sort({ createdAt: 1 })
      .select('createdAt');
    
    logOperation('ADMIN_PENDING_REPORTS_COUNT_RESULT', {
      pendingCount,
      investigatingCount,
      oldestPendingDate: oldestPending ? oldestPending.createdAt : null
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        pendingCount,
        investigatingCount,
        totalRequiringAction: pendingCount + investigatingCount,
        oldestPendingDate: oldestPending ? oldestPending.createdAt : null
      }
    });
  } catch (error) {
    logOperation('ADMIN_PENDING_REPORTS_COUNT_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      status: 'error',
      message: "Server error while fetching pending reports count",
      details: error.message
    });
  }
});

module.exports = router;