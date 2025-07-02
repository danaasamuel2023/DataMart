const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { 
  User, 
  DataPurchase, 
  OrderReport, 
  ReportSettings, 
  ReportAnalytics 
} = require('../schema/schema');

// =================
// MIDDLEWARE FUNCTIONS
// =================

// Authentication middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, 'DatAmArt');
    
    // Get user from database
    const user = await User.findById(decoded.id || decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication server error'
    });
  }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'reporter') {
      return res.status(403).json({
        success: false,
        message: 'Admin or Reporter access required'
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization server error'
    });
  }
};

// Strict admin-only middleware for sensitive operations
const requireStrictAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization server error'
    });
  }
};

// =================
// HELPER FUNCTIONS
// =================

// Helper function to check if user can report an order
const canReportOrder = async (purchase, settings) => {
  const now = new Date();
  const purchaseDate = new Date(purchase.createdAt);
  
  // Check reporting mode
  switch (settings.reportTimeLimit) {
    case "no_reporting":
      return false;
      
    case "same_day":
      const timeDiff = (now - purchaseDate) / (1000 * 60 * 60); // hours
      return timeDiff <= settings.reportTimeLimitHours;
      
    case "specific_days":
      const daysDiff = (now - purchaseDate) / (1000 * 60 * 60 * 24); // days
      return daysDiff <= settings.allowedReportDays;
      
    case "all_time":
      return true;
      
    default:
      return false;
  }
};

// Helper function to check user's daily report limit
const checkDailyReportLimit = async (userId, settings) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayReports = await OrderReport.countDocuments({
    userId: userId,
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  return todayReports < settings.maxReportsPerUserPerDay;
};

// Helper function to check user's total report limit
const checkTotalReportLimit = async (userId, settings) => {
  const totalReports = await OrderReport.countDocuments({ userId: userId });
  return totalReports < settings.maxReportsPerUser;
};

// Helper function to update analytics
const updateReportAnalytics = async (reportReason = null, purchaseData = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await ReportAnalytics.findOne({ date: today });
  
  if (!analytics) {
    analytics = new ReportAnalytics({ date: today });
  }
  
  const reportHour = new Date().getHours();
  
  analytics.totalReports += 1;
  analytics.reportsByStatus.pending += 1;
  
  // Update reports by reason
  if (reportReason) {
    if (!analytics.reportsByReason.has(reportReason)) {
      analytics.reportsByReason.set(reportReason, 0);
    }
    analytics.reportsByReason.set(reportReason, analytics.reportsByReason.get(reportReason) + 1);
    
    // Special tracking for "Data not received" reports
    if (reportReason === "Data not received") {
      // Track by hour
      if (!analytics.dataNotReceivedByHour.has(reportHour.toString())) {
        analytics.dataNotReceivedByHour.set(reportHour.toString(), 0);
      }
      analytics.dataNotReceivedByHour.set(
        reportHour.toString(), 
        analytics.dataNotReceivedByHour.get(reportHour.toString()) + 1
      );
      
      // Track by network if purchase data available
      if (purchaseData && purchaseData.network) {
        if (!analytics.dataNotReceivedByNetwork.has(purchaseData.network)) {
          analytics.dataNotReceivedByNetwork.set(purchaseData.network, 0);
        }
        analytics.dataNotReceivedByNetwork.set(
          purchaseData.network, 
          analytics.dataNotReceivedByNetwork.get(purchaseData.network) + 1
        );
      }
    }
  }
  
  // Track all reports by hour
  if (!analytics.reportsByHour.has(reportHour.toString())) {
    analytics.reportsByHour.set(reportHour.toString(), 0);
  }
  analytics.reportsByHour.set(
    reportHour.toString(), 
    analytics.reportsByHour.get(reportHour.toString()) + 1
  );
  
  await analytics.save();
};

// =================
// USER ROUTES
// =================

// Get report settings and check if reporting is enabled
router.get('/settings/public', async (req, res) => {
  try {
    const settings = await ReportSettings.findOne().select(
      'isReportingEnabled reportTimeLimit reportTimeLimitHours allowedReportDays allowedReportReasons maxReportsPerUserPerDay'
    );
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Report settings not configured'
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching report settings',
      error: error.message
    });
  }
});

// Check if user can report a specific order
router.post('/check', async (req, res) => {
  try {
    const { phoneNumber, userId } = req.body;
    
    if (!phoneNumber || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and user ID are required'
      });
    }
    
    // Get report settings
    const settings = await ReportSettings.findOne();
    if (!settings || !settings.isReportingEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Reporting is currently disabled'
      });
    }
    
    // Find the purchase
    const purchase = await DataPurchase.findOne({ 
      phoneNumber: phoneNumber,
      userId: userId 
    }).sort({ createdAt: -1 });
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this phone number'
      });
    }
    
    // Check if order can be reported based on time limit
    const canReport = await canReportOrder(purchase, settings);
    if (!canReport) {
      let message = 'Reporting is not allowed for this order';
      
      switch (settings.reportTimeLimit) {
        case "no_reporting":
          message = 'Reporting is currently disabled';
          break;
        case "same_day":
          message = `You can only report orders within ${settings.reportTimeLimitHours} hours of purchase`;
          break;
        case "specific_days":
          message = `You can only report orders within ${settings.allowedReportDays} day(s) of purchase`;
          break;
      }
      
      return res.status(403).json({
        success: false,
        message: message
      });
    }
    
    // Check if already reported
    const existingReport = await OrderReport.findOne({ 
      purchaseId: purchase._id,
      userId: userId 
    });
    
    if (existingReport) {
      return res.json({
        success: true,
        canReport: false,
        message: 'Order already reported',
        existingReport: {
          reportId: existingReport.reportId,
          status: existingReport.status,
          createdAt: existingReport.createdAt
        }
      });
    }
    
    // Check daily limit
    const withinDailyLimit = await checkDailyReportLimit(userId, settings);
    if (!withinDailyLimit) {
      return res.status(429).json({
        success: false,
        message: `You have reached the daily limit of ${settings.maxReportsPerUserPerDay} reports`
      });
    }
    
    // Check total limit
    const withinTotalLimit = await checkTotalReportLimit(userId, settings);
    if (!withinTotalLimit) {
      return res.status(429).json({
        success: false,
        message: `You have reached the maximum limit of ${settings.maxReportsPerUser} reports`
      });
    }
    
    res.json({
      success: true,
      canReport: true,
      purchase: {
        id: purchase._id,
        phoneNumber: purchase.phoneNumber,
        network: purchase.network,
        capacity: purchase.capacity,
        price: purchase.price,
        status: purchase.status,
        createdAt: purchase.createdAt
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking report eligibility',
      error: error.message
    });
  }
});

// Submit a new report
// Fixed submit report endpoint with proper reportId generation
router.post('/submit', async (req, res) => {
  try {
    console.log('Submit report request received:', req.body);
    
    const { phoneNumber, reportReason, customReason, description, userId } = req.body;
    
    // Enhanced validation
    if (!phoneNumber || !reportReason || !userId) {
      console.log('Validation failed - missing required fields:', {
        phoneNumber: !!phoneNumber,
        reportReason: !!reportReason,
        userId: !!userId
      });
      return res.status(400).json({
        success: false,
        message: 'Phone number, report reason, and user ID are required'
      });
    }

    // Validate userId format (if using MongoDB ObjectId)
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid userId format:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    // Get report settings with error handling
    let settings;
    try {
      settings = await ReportSettings.findOne();
      console.log('Report settings loaded:', settings ? 'Found' : 'Not found');
    } catch (settingsError) {
      console.error('Error loading report settings:', settingsError);
      return res.status(500).json({
        success: false,
        message: 'Error loading report configuration'
      });
    }
    
    if (!settings || !settings.isReportingEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Reporting is currently disabled'
      });
    }
    
    // Validate report reason
    if (!settings.allowedReportReasons.includes(reportReason) && reportReason !== 'Other') {
      console.log('Invalid report reason:', reportReason);
      return res.status(400).json({
        success: false,
        message: 'Invalid report reason'
      });
    }
    
    // Find the purchase with error handling
    let purchase;
    try {
      purchase = await DataPurchase.findOne({ 
        phoneNumber: phoneNumber,
        userId: userId 
      }).sort({ createdAt: -1 });
      console.log('Purchase lookup result:', purchase ? `Found: ${purchase._id}` : 'Not found');
    } catch (purchaseError) {
      console.error('Error finding purchase:', purchaseError);
      return res.status(500).json({
        success: false,
        message: 'Error finding purchase record'
      });
    }
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this phone number'
      });
    }
    
    // Check if order can be reported
    const canReport = await canReportOrder(purchase, settings);
    if (!canReport) {
      let message = 'Reporting is not allowed for this order';
      
      switch (settings.reportTimeLimit) {
        case "no_reporting":
          message = 'Reporting is currently disabled';
          break;
        case "same_day":
          message = `You can only report orders within ${settings.reportTimeLimitHours} hours of purchase`;
          break;
        case "specific_days":
          message = `You can only report orders within ${settings.allowedReportDays} day(s) of purchase`;
          break;
      }
      
      return res.status(403).json({
        success: false,
        message: message
      });
    }
    
    // Check if already reported
    let existingReport;
    try {
      existingReport = await OrderReport.findOne({ 
        purchaseId: purchase._id,
        userId: userId 
      });
      console.log('Existing report check:', existingReport ? `Found: ${existingReport.reportId}` : 'None');
    } catch (existingReportError) {
      console.error('Error checking existing reports:', existingReportError);
      return res.status(500).json({
        success: false,
        message: 'Error checking existing reports'
      });
    }
    
    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: 'Order already reported',
        reportId: existingReport.reportId
      });
    }
    
    // Check limits
    try {
      const withinDailyLimit = await checkDailyReportLimit(userId, settings);
      if (!withinDailyLimit) {
        return res.status(429).json({
          success: false,
          message: `You have reached the daily limit of ${settings.maxReportsPerUserPerDay} reports`
        });
      }
      
      const withinTotalLimit = await checkTotalReportLimit(userId, settings);
      if (!withinTotalLimit) {
        return res.status(429).json({
          success: false,
          message: `You have reached the maximum limit of ${settings.maxReportsPerUser} reports`
        });
      }
    } catch (limitError) {
      console.error('Error checking limits:', limitError);
      return res.status(500).json({
        success: false,
        message: 'Error checking report limits'
      });
    }
    
    // Generate reportId manually before creating the report
    let reportId;
    try {
      const reportCount = await OrderReport.countDocuments();
      reportId = `RPT${String(reportCount + 1).padStart(6, '0')}`;
      console.log('Generated reportId:', reportId);
      
      // Check if reportId already exists (race condition protection)
      const existingReportId = await OrderReport.findOne({ reportId: reportId });
      if (existingReportId) {
        // If exists, use timestamp to make it unique
        reportId = `RPT${String(reportCount + 1).padStart(6, '0')}_${Date.now().toString().slice(-4)}`;
        console.log('ReportId existed, using fallback:', reportId);
      }
    } catch (reportIdError) {
      console.error('Error generating reportId:', reportIdError);
      return res.status(500).json({
        success: false,
        message: 'Error generating report ID'
      });
    }
    
    // Create the report with explicit reportId
    let report;
    try {
      report = new OrderReport({
        reportId: reportId, // Explicitly set the reportId
        userId: userId,
        purchaseId: purchase._id,
        phoneNumber: phoneNumber,
        reportReason: reportReason,
        customReason: reportReason === 'Other' ? customReason : null,
        description: description || null
      });
      
      console.log('Creating report with data:', {
        reportId: report.reportId,
        userId: report.userId,
        purchaseId: report.purchaseId,
        phoneNumber: report.phoneNumber,
        reportReason: report.reportReason
      });
      
      await report.save();
      console.log('Report created successfully:', report.reportId);
    } catch (reportError) {
      console.error('Error creating report:', reportError);
      
      // Provide more specific error messages
      if (reportError.name === 'ValidationError') {
        const validationErrors = Object.keys(reportError.errors).map(key => ({
          field: key,
          message: reportError.errors[key].message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation error creating report',
          errors: validationErrors
        });
      }
      
      if (reportError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Report ID conflict. Please try again.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error creating report record',
        error: reportError.message
      });
    }
    
    // Update analytics with error handling
    try {
      await updateReportAnalytics(reportReason, purchase);
      console.log('Analytics updated successfully');
    } catch (analyticsError) {
      console.error('Error updating analytics (non-critical):', analyticsError);
      // Don't fail the request if analytics update fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        reportId: report.reportId,
        status: report.status,
        createdAt: report.createdAt
      }
    });
    
  } catch (error) {
    console.error('Unhandled error in submit report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});
// Get user's reports
router.post('/my-reports', async (req, res) => {
  try {
    const { userId, page = 1, limit = 10, status } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const query = { userId: userId };
    if (status) {
      query.status = status;
    }
    
    const reports = await OrderReport.find(query)
      .populate('purchaseId', 'network capacity price geonetReference')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const total = await OrderReport.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        reports: reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// Get specific report details
router.post('/details', async (req, res) => {
  try {
    const { reportId, userId } = req.body;
    
    if (!reportId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and user ID are required'
      });
    }
    
    const report = await OrderReport.findOne({ 
      reportId: reportId,
      userId: userId 
    })
    .populate('purchaseId', 'network capacity price geonetReference status')
    .populate('resolution.resolvedBy', 'name')
    .populate('adminNotes.addedBy', 'name');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching report details',
      error: error.message
    });
  }
});

// =================
// ADMIN ROUTES
// =================

// Get/Update report settings (Admin only)
router.get('/admin/settings', authenticateToken, requireStrictAdmin, async (req, res) => {
  try {
    let settings = await ReportSettings.findOne().populate('updatedBy', 'name');
    
    if (!settings) {
      // Create default settings if none exist
      settings = new ReportSettings({
        updatedBy: req.user._id
      });
      await settings.save();
      await settings.populate('updatedBy', 'name');
    }
    
    res.json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching report settings',
      error: error.message
    });
  }
});

router.put('/admin/settings', authenticateToken, requireStrictAdmin, async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedBy = req.user._id;
    updates.updatedAt = new Date();
    
    let settings = await ReportSettings.findOne();
    
    if (!settings) {
      settings = new ReportSettings(updates);
    } else {
      Object.assign(settings, updates);
    }
    
    await settings.save();
    await settings.populate('updatedBy', 'name');
    
    res.json({
      success: true,
      message: 'Report settings updated successfully',
      data: settings
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating report settings',
      error: error.message
    });
  }
});

// Get all reports (Admin/Reporter)
router.get('/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const priority = req.query.priority;
    const assignedTo = req.query.assignedTo;
    const search = req.query.search;
    
    const query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    
    if (search) {
      query.$or = [
        { reportId: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { reportReason: { $regex: search, $options: 'i' } }
      ];
    }
    
    const reports = await OrderReport.find(query)
      .populate('userId', 'name email phoneNumber')
      .populate('purchaseId', 'network capacity price geonetReference status')
      .populate('assignedTo', 'name')
      .populate('resolution.resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await OrderReport.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        reports: reports,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// Update report status (Admin/Reporter)
// Fixed update report status endpoint
router.put('/admin/reports/:reportId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNote, priority, assignedTo } = req.body;
    
    console.log('Update report status request:', {
      reportId,
      status,
      priority,
      adminNote,
      assignedTo
    });
    
    // Find report by reportId (the human-readable ID like RPT000001)
    const report = await OrderReport.findOne({ reportId: reportId });
    
    if (!report) {
      console.log('Report not found with reportId:', reportId);
      
      // Try to find by MongoDB _id as fallback
      const reportById = await OrderReport.findById(reportId);
      if (!reportById) {
        console.log('Report not found with _id either:', reportId);
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      // Use the report found by _id
      report = reportById;
      console.log('Found report by _id instead:', report.reportId);
    }
    
    console.log('Found report:', {
      _id: report._id,
      reportId: report.reportId,
      currentStatus: report.status,
      currentPriority: report.priority
    });
    
    // Update status
    if (status && status !== report.status) {
      // Validate status
      const validStatuses = ['pending', 'under_review', 'investigating', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }
      
      report.status = status;
      report.lastStatusChange = new Date();
      console.log('Status updated to:', status);
    }
    
    // Update priority
    if (priority && priority !== report.priority) {
      // Validate priority
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid priority value'
        });
      }
      
      report.priority = priority;
      console.log('Priority updated to:', priority);
    }
    
    // Update assigned user
    if (assignedTo) {
      report.assignedTo = assignedTo;
      console.log('Assigned to:', assignedTo);
    }
    
    // Add admin note
    if (adminNote && adminNote.trim()) {
      report.adminNotes.push({
        note: adminNote.trim(),
        addedBy: req.user._id,
        addedAt: new Date()
      });
      console.log('Admin note added');
    }
    
    // Update the updatedAt timestamp
    report.updatedAt = new Date();
    
    // Save the report
    try {
      await report.save();
      console.log('Report saved successfully');
    } catch (saveError) {
      console.error('Error saving report:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Error saving report changes',
        error: saveError.message
      });
    }
    
    // Populate the report with user details for response
    await report.populate([
      { path: 'userId', select: 'name email phoneNumber' },
      { path: 'purchaseId', select: 'network capacity price geonetReference status' },
      { path: 'assignedTo', select: 'name' },
      { path: 'adminNotes.addedBy', select: 'name' }
    ]);
    
    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
    
  } catch (error) {
    console.error('Error in update report status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report',
      error: error.message
    });
  }
});

// Fixed resolve report endpoint
router.put('/admin/reports/:reportId/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolutionType, amount, description, adminNote } = req.body;
    
    console.log('Resolve report request:', {
      reportId,
      resolutionType,
      amount,
      description,
      adminNote
    });
    
    // Find report by reportId (the human-readable ID like RPT000001)
    let report = await OrderReport.findOne({ reportId: reportId });
    
    if (!report) {
      console.log('Report not found with reportId:', reportId);
      
      // Try to find by MongoDB _id as fallback
      report = await OrderReport.findById(reportId);
      if (!report) {
        console.log('Report not found with _id either:', reportId);
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      console.log('Found report by _id instead:', report.reportId);
    }
    
    // Validate resolution type
    const validResolutionTypes = ['refund', 'resend', 'compensation', 'no_action'];
    if (!validResolutionTypes.includes(resolutionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution type'
      });
    }
    
    // Update resolution
    report.resolution = {
      type: resolutionType,
      amount: (resolutionType === 'refund' || resolutionType === 'compensation') ? 
              (amount ? parseFloat(amount) : null) : null,
      description: description || `Report resolved with ${resolutionType}`,
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    };
    
    report.status = 'resolved';
    report.lastStatusChange = new Date();
    report.updatedAt = new Date();
    
    // Add admin note
    if (adminNote && adminNote.trim()) {
      report.adminNotes.push({
        note: adminNote.trim(),
        addedBy: req.user._id,
        addedAt: new Date()
      });
    }
    
    // Save the report
    try {
      await report.save();
      console.log('Report resolved and saved successfully');
    } catch (saveError) {
      console.error('Error saving resolved report:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Error saving report resolution',
        error: saveError.message
      });
    }
    
    // Handle refund if resolution type is refund
    if (resolutionType === 'refund' && amount) {
      try {
        const user = await User.findById(report.userId);
        if (user) {
          user.walletBalance += parseFloat(amount);
          await user.save();
          console.log('Refund processed for user:', user._id, 'Amount:', amount);
          
          // Create refund transaction if Transaction model exists
          try {
            const refundTransaction = new Transaction({
              userId: report.userId,
              type: 'refund',
              amount: parseFloat(amount),
              status: 'completed',
              reference: `REFUND_${report.reportId}_${Date.now()}`,
              gateway: 'system',
              description: `Refund for report ${report.reportId}`
            });
            await refundTransaction.save();
            console.log('Refund transaction created');
          } catch (transactionError) {
            console.warn('Transaction model not available or error creating transaction:', transactionError.message);
          }
        } else {
          console.error('User not found for refund:', report.userId);
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        // Don't fail the whole request if refund fails
      }
    }
    
    // Populate the report with user details for response
    await report.populate([
      { path: 'userId', select: 'name email phoneNumber' },
      { path: 'purchaseId', select: 'network capacity price geonetReference status' },
      { path: 'resolution.resolvedBy', select: 'name' },
      { path: 'adminNotes.addedBy', select: 'name' }
    ]);
    
    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });
    
  } catch (error) {
    console.error('Error in resolve report:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving report',
      error: error.message
    });
  }
});
// Resolve report (Admin/Reporter)
router.put('/admin/reports/:reportId/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolutionType, amount, description, adminNote } = req.body;
    
    const report = await OrderReport.findOne({ reportId: reportId });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Update resolution
    report.resolution = {
      type: resolutionType,
      amount: amount || null,
      description: description,
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    };
    
    report.status = 'resolved';
    report.lastStatusChange = new Date();
    
    // Add admin note
    if (adminNote) {
      report.adminNotes.push({
        note: adminNote,
        addedBy: req.user._id
      });
    }
    
    await report.save();
    
    // Handle refund if resolution type is refund
    if (resolutionType === 'refund' && amount) {
      const user = await User.findById(report.userId);
      if (user) {
        user.walletBalance += amount;
        await user.save();
        
        // Create refund transaction if Transaction model exists
        try {
          const Transaction = require('../schema/schema').Transaction;
          const refundTransaction = new Transaction({
            userId: report.userId,
            type: 'refund',
            amount: amount,
            status: 'completed',
            reference: `REFUND_${report.reportId}_${Date.now()}`,
            gateway: 'system'
          });
          await refundTransaction.save();
        } catch (transactionError) {
          console.warn('Transaction model not available:', transactionError.message);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving report',
      error: error.message
    });
  }
});

// Bulk update report status (Admin/Reporter)
// Enhanced bulk resolve reports route with better validation
router.put('/admin/reports/bulk/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportIds, resolutionType, amount, description, adminNote } = req.body;
    
    console.log('Bulk resolve request received:', {
      reportIds,
      resolutionType,
      amount,
      description,
      reportIdsCount: reportIds?.length
    });
    
    // Validate input
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report IDs array is required and cannot be empty'
      });
    }
    
    // Check for invalid reportIds (like "bulk")
    const invalidIds = reportIds.filter(id => {
      return !id || 
             typeof id !== 'string' || 
             id.trim() === '' || 
             id === 'bulk' || 
             id.length < 3; // reportIds should be at least 3 characters (like RPT000001)
    });
    
    if (invalidIds.length > 0) {
      console.error('Invalid report IDs found:', invalidIds);
      return res.status(400).json({
        success: false,
        message: `Invalid report IDs found: ${invalidIds.join(', ')}`
      });
    }
    
    if (!resolutionType) {
      return res.status(400).json({
        success: false,
        message: 'Resolution type is required for bulk resolve'
      });
    }
    
    // Validate resolution type
    const validResolutionTypes = ['refund', 'resend', 'compensation', 'no_action'];
    if (!validResolutionTypes.includes(resolutionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution type provided'
      });
    }
    
    // Validate amount for refund/compensation
    if ((resolutionType === 'refund' || resolutionType === 'compensation') && 
        (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required for refund or compensation'
      });
    }
    
    console.log('Validation passed, searching for reports...');
    
    // Find reports to resolve - use reportId field, not _id
    const reports = await OrderReport.find({ 
      reportId: { $in: reportIds } 
    }).populate('userId', 'walletBalance name email');
    
    console.log(`Found ${reports.length} reports out of ${reportIds.length} requested`);
    
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reports found with the provided IDs'
      });
    }
    
    // Check which reportIds were not found
    const foundReportIds = reports.map(r => r.reportId);
    const notFoundIds = reportIds.filter(id => !foundReportIds.includes(id));
    if (notFoundIds.length > 0) {
      console.warn('Some reports not found:', notFoundIds);
    }
    
    // Start session for transaction
    const session = await OrderReport.startSession();
    session.startTransaction();
    
    try {
      const now = new Date();
      const bulkOps = [];
      const refundTransactions = [];
      
      console.log('Processing reports for bulk resolution...');
      
      // Process each report
      for (const report of reports) {
        const resolutionData = {
          type: resolutionType,
          amount: (resolutionType === 'refund' || resolutionType === 'compensation') ? 
                  (amount ? parseFloat(amount) : null) : null,
          description: description || `Bulk resolution: ${resolutionType}`,
          resolvedBy: req.user._id,
          resolvedAt: now
        };
        
        const updateDoc = {
          status: 'resolved',
          lastStatusChange: now,
          resolution: resolutionData,
          updatedAt: now
        };
        
        // Add admin note
        const noteToAdd = adminNote || `Bulk resolved with ${resolutionType}`;
        const noteUpdate = {
          $push: {
            adminNotes: {
              note: noteToAdd,
              addedBy: req.user._id,
              addedAt: now
            }
          }
        };
        
        bulkOps.push({
          updateOne: {
            filter: { _id: report._id },
            update: { 
              $set: updateDoc,
              ...noteUpdate
            }
          }
        });
        
        // Handle refund logic
        if (resolutionType === 'refund' && amount && report.userId) {
          refundTransactions.push({
            userId: report.userId._id,
            amount: parseFloat(amount),
            reportId: report.reportId,
            userEmail: report.userId.email,
            userName: report.userId.name
          });
        }
      }
      
      console.log(`Executing bulk update for ${bulkOps.length} reports...`);
      
      // Execute bulk update
      const result = await OrderReport.bulkWrite(bulkOps, { session });
      
      console.log('Bulk update result:', {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });
      
      // Process refunds if any
      let refundResults = [];
      if (refundTransactions.length > 0) {
        console.log(`Processing ${refundTransactions.length} refunds...`);
        
        for (const refund of refundTransactions) {
          try {
            // Update user wallet balance
            const user = await User.findByIdAndUpdate(
              refund.userId,
              { $inc: { walletBalance: refund.amount } },
              { new: true, session }
            );
            
            if (user) {
              console.log(`Refund processed for user ${refund.userName}: GHS ${refund.amount}`);
              
              // Create transaction record if Transaction model exists
              try {
                const transaction = new Transaction({
                  userId: refund.userId,
                  type: 'refund',
                  amount: refund.amount,
                  status: 'completed',
                  reference: `BULK_REFUND_${refund.reportId}_${Date.now()}`,
                  gateway: 'system',
                  description: `Bulk refund for report ${refund.reportId}`
                });
                await transaction.save({ session });
                
                refundResults.push({
                  reportId: refund.reportId,
                  userId: refund.userId,
                  userName: refund.userName,
                  userEmail: refund.userEmail,
                  amount: refund.amount,
                  newBalance: user.walletBalance,
                  transactionCreated: true
                });
              } catch (transactionError) {
                console.warn('Transaction model not available:', transactionError.message);
                refundResults.push({
                  reportId: refund.reportId,
                  userId: refund.userId,
                  userName: refund.userName,
                  userEmail: refund.userEmail,
                  amount: refund.amount,
                  newBalance: user.walletBalance,
                  transactionCreated: false,
                  note: 'Refund processed but transaction record not created'
                });
              }
            } else {
              console.error(`User not found for refund: ${refund.userId}`);
            }
          } catch (refundError) {
            console.error(`Error processing refund for ${refund.reportId}:`, refundError);
          }
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      console.log('Bulk resolve transaction committed successfully');
      
      // Prepare response
      const responseData = {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        resolutionType: resolutionType,
        totalRequested: reportIds.length,
        reportsFound: reports.length,
        refunds: refundResults
      };
      
      if (notFoundIds.length > 0) {
        responseData.notFound = notFoundIds;
        responseData.warning = `${notFoundIds.length} report(s) not found: ${notFoundIds.join(', ')}`;
      }
      
      res.json({
        success: true,
        message: `Successfully resolved ${result.modifiedCount} reports with ${resolutionType}`,
        data: responseData
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    console.error('Bulk resolve error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk resolve',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Bulk resolve reports (Admin/Reporter)
router.put('/admin/reports/bulk/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportIds, resolutionType, amount, description, adminNote } = req.body;
    
    // Validate input
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report IDs array is required'
      });
    }
    
    if (!resolutionType) {
      return res.status(400).json({
        success: false,
        message: 'Resolution type is required for bulk resolve'
      });
    }
    
    // Validate resolution type
    const validResolutionTypes = ['refund', 'resend', 'compensation', 'no_action'];
    if (!validResolutionTypes.includes(resolutionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution type provided'
      });
    }
    
    // Find reports to resolve
    const reports = await OrderReport.find({ 
      reportId: { $in: reportIds } 
    }).populate('userId', 'walletBalance');
    
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reports found with the provided IDs'
      });
    }
    
    // Start session for transaction
    const session = await OrderReport.startSession();
    session.startTransaction();
    
    try {
      const now = new Date();
      const bulkOps = [];
      const refundTransactions = [];
      
      // Process each report
      for (const report of reports) {
        const resolutionData = {
          type: resolutionType,
          amount: (resolutionType === 'refund' || resolutionType === 'compensation') ? 
                  (amount ? parseFloat(amount) : null) : null,
          description: description || `Bulk resolution: ${resolutionType}`,
          resolvedBy: req.user._id,
          resolvedAt: now
        };
        
        const updateDoc = {
          status: 'resolved',
          lastStatusChange: now,
          resolution: resolutionData
        };
        
        // Add admin note
        const noteToAdd = adminNote || `Bulk resolved with ${resolutionType}`;
        const noteUpdate = {
          $push: {
            adminNotes: {
              note: noteToAdd,
              addedBy: req.user._id,
              addedAt: now
            }
          }
        };
        
        bulkOps.push({
          updateOne: {
            filter: { _id: report._id },
            update: { 
              $set: updateDoc,
              ...noteUpdate
            }
          }
        });
        
        // Handle refund logic
        if (resolutionType === 'refund' && amount && report.userId) {
          refundTransactions.push({
            userId: report.userId._id,
            amount: parseFloat(amount),
            reportId: report.reportId
          });
        }
      }
      
      // Execute bulk update
      const result = await OrderReport.bulkWrite(bulkOps, { session });
      
      // Process refunds if any
      let refundResults = [];
      if (refundTransactions.length > 0) {
        for (const refund of refundTransactions) {
          // Update user wallet balance
          const user = await User.findByIdAndUpdate(
            refund.userId,
            { $inc: { walletBalance: refund.amount } },
            { new: true, session }
          );
          
          if (user) {
            // Create transaction record if Transaction model exists
            try {
              const Transaction = require('../schema/schema').Transaction;
              const transaction = new Transaction({
                userId: refund.userId,
                type: 'refund',
                amount: refund.amount,
                status: 'completed',
                reference: `BULK_REFUND_${refund.reportId}_${Date.now()}`,
                gateway: 'system',
                description: `Bulk refund for report ${refund.reportId}`
              });
              await transaction.save({ session });
              
              refundResults.push({
                reportId: refund.reportId,
                userId: refund.userId,
                amount: refund.amount,
                newBalance: user.walletBalance
              });
            } catch (transactionError) {
              console.warn('Transaction model not available:', transactionError.message);
              refundResults.push({
                reportId: refund.reportId,
                userId: refund.userId,
                amount: refund.amount,
                newBalance: user.walletBalance,
                note: 'Refund processed but transaction record not created'
              });
            }
          }
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      
      res.json({
        success: true,
        message: `Successfully resolved ${result.modifiedCount} reports`,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          resolutionType: resolutionType,
          refunds: refundResults
        }
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    console.error('Bulk resolve error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk resolve',
      error: error.message
    });
  }
});

// Bulk delete reports (Admin only - for testing/cleanup)
router.delete('/admin/reports/bulk/delete', authenticateToken, requireStrictAdmin, async (req, res) => {
  try {
    const { reportIds, confirmDelete } = req.body;
    
    // Safety check
    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message: 'confirmDelete must be set to true for bulk deletion'
      });
    }
    
    // Validate input
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report IDs array is required'
      });
    }
    
    // Additional safety: limit bulk delete to 50 reports at a time
    if (reportIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete more than 50 reports at once'
      });
    }
    
    // Delete reports
    const result = await OrderReport.deleteMany({ 
      reportId: { $in: reportIds } 
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} reports`,
      data: {
        deletedCount: result.deletedCount
      }
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk deletion',
      error: error.message
    });
  }
});

// Bulk export reports (Admin/Reporter)
router.post('/admin/reports/bulk/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      reportIds, 
      format = 'json', 
      includeUserDetails = true,
      includePurchaseDetails = true,
      includeAdminNotes = false
    } = req.body;
    
    // Build query
    let query = {};
    if (reportIds && Array.isArray(reportIds) && reportIds.length > 0) {
      query.reportId = { $in: reportIds };
    }
    
    // If no specific IDs provided, export all (with reasonable limit)
    const limit = reportIds ? reportIds.length : 1000;
    
    // Build population based on options
    let populateOptions = [];
    if (includeUserDetails) {
      populateOptions.push({ path: 'userId', select: 'name email phoneNumber' });
    }
    if (includePurchaseDetails) {
      populateOptions.push({ path: 'purchaseId', select: 'network capacity price geonetReference status' });
    }
    if (includeAdminNotes) {
      populateOptions.push({ path: 'adminNotes.addedBy', select: 'name' });
      populateOptions.push({ path: 'resolution.resolvedBy', select: 'name' });
    }
    
    // Fetch reports
    let reportsQuery = OrderReport.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Apply population
    populateOptions.forEach(option => {
      reportsQuery = reportsQuery.populate(option);
    });
    
    const reports = await reportsQuery.exec();
    
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reports found for export'
      });
    }
    
    // Format based on requested format
    let exportData;
    let contentType;
    let filename;
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'Report ID',
        'Status',
        'Priority',
        'Report Reason',
        'Phone Number',
        'Created At',
        'Last Status Change'
      ];
      
      if (includeUserDetails) {
        csvHeaders.push('User Name', 'User Email');
      }
      
      if (includePurchaseDetails) {
        csvHeaders.push('Network', 'Capacity (GB)', 'Price (GHS)');
      }
      
      if (includeAdminNotes) {
        csvHeaders.push('Admin Notes Count', 'Resolution Type', 'Resolution Amount');
      }
      
      const csvRows = [csvHeaders.join(',')];
      
      reports.forEach(report => {
        const row = [
          report.reportId,
          report.status,
          report.priority,
          `"${report.reportReason.replace(/"/g, '""')}"`,
          report.phoneNumber,
          report.createdAt.toISOString(),
          report.lastStatusChange ? report.lastStatusChange.toISOString() : ''
        ];
        
        if (includeUserDetails) {
          row.push(
            report.userId ? `"${report.userId.name.replace(/"/g, '""')}"` : '',
            report.userId ? report.userId.email : ''
          );
        }
        
        if (includePurchaseDetails) {
          row.push(
            report.purchaseId ? report.purchaseId.network : '',
            report.purchaseId ? report.purchaseId.capacity : '',
            report.purchaseId ? report.purchaseId.price : ''
          );
        }
        
        if (includeAdminNotes) {
          row.push(
            report.adminNotes ? report.adminNotes.length : 0,
            report.resolution ? report.resolution.type : '',
            report.resolution ? (report.resolution.amount || '') : ''
          );
        }
        
        csvRows.push(row.join(','));
      });
      
      exportData = csvRows.join('\n');
      contentType = 'text/csv';
      filename = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
      
    } else {
      // JSON format (default)
      exportData = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalReports: reports.length,
        filters: query,
        options: {
          includeUserDetails,
          includePurchaseDetails,
          includeAdminNotes
        },
        reports: reports
      }, null, 2);
      
      contentType = 'application/json';
      filename = `reports_export_${new Date().toISOString().split('T')[0]}.json`;
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(exportData));
    
    res.send(exportData);
    
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk export',
      error: error.message
    });
  }
});

// Get report analytics (Admin/Reporter)
router.get('/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get analytics data
    const analytics = await ReportAnalytics.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    // Get current statistics
    const totalReports = await OrderReport.countDocuments();
    const pendingReports = await OrderReport.countDocuments({ status: { $in: ['pending', 'under_review', 'investigating'] } });
    const resolvedReports = await OrderReport.countDocuments({ status: 'resolved' });
    const rejectedReports = await OrderReport.countDocuments({ status: 'rejected' });
    
    // Calculate average resolution time
    const resolvedReportsWithTime = await OrderReport.find({
      status: 'resolved',
      'resolution.resolvedAt': { $exists: true }
    });
    
    let totalResolutionTime = 0;
    resolvedReportsWithTime.forEach(report => {
      const createdAt = new Date(report.createdAt);
      const resolvedAt = new Date(report.resolution.resolvedAt);
      totalResolutionTime += (resolvedAt - createdAt) / (1000 * 60 * 60); // hours
    });
    
    const averageResolutionTime = resolvedReportsWithTime.length > 0 
      ? totalResolutionTime / resolvedReportsWithTime.length 
      : 0;
    
    // Aggregate hourly data for "Data not received" reports
    const hourlyDataNotReceived = {};
    const hourlyAllReports = {};
    const networkIssues = {};
    
    analytics.forEach(day => {
      // Aggregate hourly data for "Data not received"
      if (day.dataNotReceivedByHour) {
        day.dataNotReceivedByHour.forEach((count, hour) => {
          hourlyDataNotReceived[hour] = (hourlyDataNotReceived[hour] || 0) + count;
        });
      }
      
      // Aggregate hourly data for all reports
      if (day.reportsByHour) {
        day.reportsByHour.forEach((count, hour) => {
          hourlyAllReports[hour] = (hourlyAllReports[hour] || 0) + count;
        });
      }
      
      // Aggregate network issues
      if (day.dataNotReceivedByNetwork) {
        day.dataNotReceivedByNetwork.forEach((count, network) => {
          networkIssues[network] = (networkIssues[network] || 0) + count;
        });
      }
    });
    
    // Find peak hours for "Data not received"
    const peakDataNotReceivedHours = Object.entries(hourlyDataNotReceived)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count: count,
        percentage: totalReports > 0 ? ((count / totalReports) * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Find most problematic hour overall
    const mostProblematicHour = Object.entries(hourlyAllReports)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)[0] || { hour: 0, count: 0 };
    
    // Find network with most "Data not received" issues
    const mostProblematicNetwork = Object.entries(networkIssues)
      .map(([network, count]) => ({
        network,
        count,
        percentage: totalReports > 0 ? ((count / totalReports) * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.count - a.count)[0] || { network: 'N/A', count: 0, percentage: 0 };
    
    // Generate insights
    const insights = {
      dataNotReceivedPeakHours: peakDataNotReceivedHours,
      mostProblematicHour: {
        hour: mostProblematicHour.hour,
        reportCount: mostProblematicHour.count,
        timeRange: `${mostProblematicHour.hour}:00 - ${mostProblematicHour.hour + 1}:00`
      },
      networkWithMostDataIssues: mostProblematicNetwork,
      hourlyBreakdown: {
        dataNotReceived: hourlyDataNotReceived,
        allReports: hourlyAllReports
      },
      recommendations: generateInsights(hourlyDataNotReceived, networkIssues, mostProblematicHour)
    };
    
    res.json({
      success: true,
      data: {
        summary: {
          totalReports,
          pendingReports,
          resolvedReports,
          rejectedReports,
          resolutionRate: totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(2) : 0,
          averageResolutionTime: averageResolutionTime.toFixed(2)
        },
        insights: insights,
        analytics: analytics
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

// Helper function to generate insights and recommendations
const generateInsights = (hourlyDataIssues, networkIssues, peakHour) => {
  const insights = [];
  
  // Peak hours analysis
  const peakHours = Object.entries(hourlyDataIssues)
    .filter(([hour, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (peakHours.length > 0) {
    const [topHour, topCount] = peakHours[0];
    insights.push({
      type: 'peak_hour',
      severity: topCount > 5 ? 'high' : topCount > 2 ? 'medium' : 'low',
      message: `Peak "Data not received" reports occur at ${topHour}:00 - ${parseInt(topHour) + 1}:00 (${topCount} reports)`,
      recommendation: `Monitor data delivery processes during ${topHour}:00 - ${parseInt(topHour) + 1}:00 period`
    });
  }
  
  // Network analysis
  const problematicNetworks = Object.entries(networkIssues)
    .filter(([network, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (problematicNetworks.length > 0) {
    const [topNetwork, topNetworkCount] = problematicNetworks[0];
    insights.push({
      type: 'network_issue',
      severity: topNetworkCount > 10 ? 'high' : topNetworkCount > 5 ? 'medium' : 'low',
      message: `${topNetwork} network has the most "Data not received" reports (${topNetworkCount} reports)`,
      recommendation: `Review data delivery process for ${topNetwork} network`
    });
  }
  
  // Time pattern analysis
  const morningIssues = Object.entries(hourlyDataIssues)
    .filter(([hour]) => parseInt(hour) >= 6 && parseInt(hour) <= 12)
    .reduce((sum, [, count]) => sum + count, 0);
    
  const eveningIssues = Object.entries(hourlyDataIssues)
    .filter(([hour]) => parseInt(hour) >= 18 && parseInt(hour) <= 23)
    .reduce((sum, [, count]) => sum + count, 0);
  
  if (morningIssues > eveningIssues * 1.5) {
    insights.push({
      type: 'time_pattern',
      severity: 'medium',
      message: `Morning hours (6AM-12PM) show significantly more data delivery issues`,
      recommendation: `Investigate system load and provider capacity during morning peak hours`
    });
  } else if (eveningIssues > morningIssues * 1.5) {
    insights.push({
      type: 'time_pattern',
      severity: 'medium',
      message: `Evening hours (6PM-11PM) show significantly more data delivery issues`,
      recommendation: `Check for network congestion during evening peak usage`
    });
  }
  
  return insights;
};

// Get detailed hourly analytics for "Data not received" reports
router.get('/admin/analytics/hourly', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const network = req.query.network;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          reportReason: "Data not received"
        }
      }
    ];
    
    // Add network filter if specified
    if (network) {
      pipeline[0].$match.network = network;
    }
    
    pipeline.push(
      {
        $lookup: {
          from: 'datapurchases',
          localField: 'purchaseId',
          foreignField: '_id',
          as: 'purchase'
        }
      },
      {
        $unwind: '$purchase'
      },
      {
        $addFields: {
          hour: { $hour: '$createdAt' },
          network: '$purchase.network'
        }
      },
      {
        $group: {
          _id: {
            hour: '$hour',
            network: '$network'
          },
          count: { $sum: 1 },
          reports: {
            $push: {
              reportId: '$reportId',
              phoneNumber: '$phoneNumber',
              createdAt: '$createdAt',
              status: '$status'
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.hour',
          totalCount: { $sum: '$count' },
          networks: {
            $push: {
              network: '$_id.network',
              count: '$count',
              reports: '$reports'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    );
    
    const hourlyData = await OrderReport.aggregate(pipeline);
    
    // Format data for 24-hour view
    const formattedData = Array.from({ length: 24 }, (_, hour) => {
      const data = hourlyData.find(item => item._id === hour);
      return {
        hour: hour,
        timeRange: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
        totalReports: data ? data.totalCount : 0,
        networks: data ? data.networks : [],
        severity: data && data.totalCount > 5 ? 'high' : data && data.totalCount > 2 ? 'medium' : 'low'
      };
    });
    
    // Calculate peak hours
    const peakHours = formattedData
      .filter(item => item.totalReports > 0)
      .sort((a, b) => b.totalReports - a.totalReports)
      .slice(0, 5);
    
    // Calculate network distribution
    const networkStats = {};
    formattedData.forEach(hourData => {
      hourData.networks.forEach(networkData => {
        if (!networkStats[networkData.network]) {
          networkStats[networkData.network] = {
            total: 0,
            hourlyBreakdown: {}
          };
        }
        networkStats[networkData.network].total += networkData.count;
        networkStats[networkData.network].hourlyBreakdown[hourData.hour] = networkData.count;
      });
    });
    
    res.json({
      success: true,
      data: {
        period: `${days} days`,
        network: network || 'All networks',
        hourlyBreakdown: formattedData,
        peakHours: peakHours,
        networkStats: networkStats,
        insights: {
          mostProblematicHour: peakHours[0] || null,
          quietestPeriod: formattedData
            .filter(item => item.totalReports === 0)
            .map(item => item.timeRange),
          networkMostAffected: Object.entries(networkStats)
            .sort((a, b) => b[1].total - a[1].total)[0]
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hourly analytics',
      error: error.message
    });
  }
});

module.exports = router;