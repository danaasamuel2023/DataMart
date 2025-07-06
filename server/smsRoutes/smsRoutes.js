const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { User, SMSHistory } = require('../schema/schema');
const auth = require('../middlewareUser/middleware');
const adminAuth = require('../adminMiddleware/middleware');

// mNotify Configuration from your existing setup
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY || 'w3rGWhv4e235nDwYvD5gVDyrW',
  SENDER_ID: 'DataMartGH',
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

// Batch configuration for large campaigns
const BATCH_CONFIG = {
  BATCH_SIZE: 500,              // Send 500 SMS per API call
  DELAY_BETWEEN_BATCHES: 2000,  // 2 second delay between batches
  MAX_RETRIES: 3,               // Retry failed batches 3 times
};

/**
 * Format phone number to Ghana format for mNotify (from your existing function)
 */
const formatPhoneNumberForMnotify = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If number starts with 0, replace with 233
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  
  // If number doesn't start with country code, add it
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  
  return cleaned;
};

/**
 * Send SMS using mNotify API (using your existing pattern)
 */
const sendBulkSMS = async (phoneNumbers, message, senderId = SMS_CONFIG.SENDER_ID) => {
  try {
    // Format all phone numbers
    const formattedNumbers = phoneNumbers.map(phone => formatPhoneNumberForMnotify(phone));
    
    // Remove duplicates
    const uniqueNumbers = [...new Set(formattedNumbers)];
    
    // mNotify expects comma-separated phone numbers
    const recipients = uniqueNumbers.join(',');
    
    // Construct SMS API URL for bulk SMS
    const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${recipients}&msg=${encodeURIComponent(message)}&sender_id=${senderId}`;
    
    // Send SMS request
    const response = await axios.get(url);
    
    // Log the response
    console.log('mNotify Bulk SMS Response:', {
      status: response.status,
      data: response.data,
      recipientCount: uniqueNumbers.length
    });
    
    // Parse response code (using your existing logic)
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
    
    // Handle response codes (using your existing pattern)
    switch (responseCode) {
      case 1000:
        return { 
          success: true, 
          message: 'SMS sent successfully', 
          code: responseCode,
          recipientCount: uniqueNumbers.length 
        };
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
        return { 
          success: true, 
          message: 'SMS scheduled for later delivery', 
          code: responseCode,
          recipientCount: uniqueNumbers.length 
        };
      case 1008:
        throw new Error('Empty message');
      default:
        throw new Error(`Unknown response code: ${responseCode}`);
    }
    
  } catch (error) {
    console.error('mNotify Bulk SMS Error:', error.message);
    return { 
      success: false, 
      error: error.message,
      recipientCount: 0 
    };
  }
};

/**
 * Get all users for SMS selection
 */
router.get('/sms/users', auth, adminAuth, async (req, res) => {
  try {
    const { role, approvalStatus, search, page = 1, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (approvalStatus && approvalStatus !== 'all') {
      query.approvalStatus = approvalStatus;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('name email phoneNumber role approvalStatus createdAt walletBalance')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const totalCount = await User.countDocuments(query);
    
    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalUsers: totalCount,
          hasMore: Number(page) * Number(limit) < totalCount
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching users for SMS:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

/**
 * Get user groups for group SMS
 */
router.get('/sms/groups', auth, adminAuth, async (req, res) => {
  try {
    // Aggregate users by role and approval status to create dynamic groups
    const groups = [];
    
    // Group by role
    const roleGroups = await User.aggregate([
      { $match: { role: { $ne: null } } }, // Filter out null values
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    roleGroups.forEach(group => {
      // Handle null or undefined group._id
      if (group._id) {
        const roleName = String(group._id);
        const displayName = roleName.charAt(0).toUpperCase() + roleName.slice(1);
        
        groups.push({
          id: `role_${group._id}`,
          name: `All ${displayName}s`,
          type: 'role',
          value: group._id,
          count: group.count,
          description: `All users with role: ${group._id}`
        });
      }
    });
    
    // Group by approval status
    const statusGroups = await User.aggregate([
      { $match: { approvalStatus: { $ne: null } } }, // Filter out null values
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
    ]);
    
    statusGroups.forEach(group => {
      // Handle null or undefined group._id
      if (group._id) {
        const statusName = String(group._id);
        const displayName = statusName.charAt(0).toUpperCase() + statusName.slice(1);
        
        groups.push({
          id: `status_${group._id}`,
          name: `${displayName} Users`,
          type: 'status',
          value: group._id,
          count: group.count,
          description: `All users with status: ${group._id}`
        });
      }
    });
    
    // Add custom groups
    groups.push({
      id: 'all_users',
      name: 'All Users',
      type: 'all',
      value: 'all',
      count: await User.countDocuments({}),
      description: 'Send to all registered users'
    });
    
    groups.push({
      id: 'active_last_7_days',
      name: 'Active in Last 7 Days',
      type: 'activity',
      value: '7days',
      count: await User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      description: 'Users who logged in within the last 7 days'
    });
    
    // Add wallet balance based groups
    groups.push({
      id: 'high_balance',
      name: 'High Balance Users (> 100 GHS)',
      type: 'balance',
      value: 'high',
      count: await User.countDocuments({ walletBalance: { $gte: 100 } }),
      description: 'Users with wallet balance above 100 GHS'
    });
    
    groups.push({
      id: 'low_balance',
      name: 'Low Balance Users (< 10 GHS)',
      type: 'balance',
      value: 'low',
      count: await User.countDocuments({ walletBalance: { $lt: 10 } }),
      description: 'Users with wallet balance below 10 GHS'
    });
    
    res.json({
      status: 'success',
      data: groups
    });
    
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch groups'
    });
  }
});

/**
 * Main SMS sending endpoint
 */
router.post('/sms/send', auth, adminAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      method, // 'quick' or 'group'
      userIds, // Array of user IDs for quick SMS
      groupIds, // Array of group IDs for group SMS
      message,
      senderId = SMS_CONFIG.SENDER_ID, // Default to DataMartGH
      isScheduled = false,
      scheduleDate
    } = req.body;
    
    // Validation
    if (!message || message.trim().length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Message content is required'
      });
    }
    
    if (!senderId || senderId.length > 11) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Sender ID must be provided and at most 11 characters'
      });
    }
    
    let recipients = [];
    let phoneNumbers = [];
    
    // Get recipients based on method
    if (method === 'quick') {
      if (!userIds || userIds.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: 'error',
          message: 'Please select at least one user'
        });
      }
      
      // Fetch selected users
      const users = await User.find({
        _id: { $in: userIds }
      }).select('name phoneNumber email').session(session);
      
      recipients = users.map(user => ({
        userId: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        status: 'pending'
      }));
      
      phoneNumbers = users.map(user => user.phoneNumber);
      
    } else if (method === 'group') {
      if (!groupIds || groupIds.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: 'error',
          message: 'Please select at least one group'
        });
      }
      
      // Build query based on selected groups
      const conditions = [];
      
      for (const groupId of groupIds) {
        if (groupId === 'all_users') {
          conditions.push({});
        } else if (groupId.startsWith('role_')) {
          const role = groupId.replace('role_', '');
          conditions.push({ role });
        } else if (groupId.startsWith('status_')) {
          const status = groupId.replace('status_', '');
          conditions.push({ approvalStatus: status });
        } else if (groupId === 'active_last_7_days') {
          conditions.push({
            lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          });
        } else if (groupId === 'high_balance') {
          conditions.push({ walletBalance: { $gte: 100 } });
        } else if (groupId === 'low_balance') {
          conditions.push({ walletBalance: { $lt: 10 } });
        }
      }
      
      // Build final query
      const query = conditions.length > 0 ? { $or: conditions } : {};
      
      // Fetch users based on groups
      const users = await User.find(query)
        .select('name phoneNumber email')
        .session(session);
      
      // Remove duplicates if user belongs to multiple selected groups
      const uniqueUsers = Array.from(new Map(users.map(user => [user._id.toString(), user])).values());
      
      recipients = uniqueUsers.map(user => ({
        userId: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        status: 'pending'
      }));
      
      phoneNumbers = uniqueUsers.map(user => user.phoneNumber);
    }
    
    if (phoneNumbers.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'No valid recipients found'
      });
    }
    
    // Create SMS history record
    const smsHistory = new SMSHistory({
      campaignId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentBy: req.user.id,
      recipients,
      message,
      senderId,
      method,
      groups: method === 'group' ? groupIds : [],
      totalRecipients: recipients.length,
      isScheduled,
      scheduledDate: isScheduled ? new Date(scheduleDate) : null,
      status: 'processing',
      creditsUsed: 0 // Will be updated after sending
    });
    
    await smsHistory.save({ session });
    
    console.log(`Sending SMS campaign ${smsHistory.campaignId}:`, {
      method,
      totalRecipients: phoneNumbers.length,
      senderId,
      isScheduled
    });
    
    // For large campaigns, process in batches
    if (phoneNumbers.length > BATCH_CONFIG.BATCH_SIZE) {
      // Process in background for large campaigns
      await session.commitTransaction();
      session.endSession();
      
      // Start batch processing
      processCampaignInBatches(smsHistory._id, phoneNumbers, message, senderId);
      
      return res.json({
        status: 'success',
        message: `Large SMS campaign initiated. ${phoneNumbers.length} messages will be sent in batches.`,
        data: {
          campaignId: smsHistory.campaignId,
          totalRecipients: phoneNumbers.length,
          totalBatches: Math.ceil(phoneNumbers.length / BATCH_CONFIG.BATCH_SIZE),
          estimatedTime: `${Math.ceil(phoneNumbers.length / BATCH_CONFIG.BATCH_SIZE * 2 / 60)} minutes`,
          status: 'processing'
        }
      });
    }
    
    // For smaller campaigns, send immediately
    const smsResult = await sendBulkSMS(phoneNumbers, message, senderId);
    
    // Update SMS history with result
    if (smsResult.success) {
      smsHistory.status = 'completed';
      smsHistory.totalSent = smsResult.recipientCount;
      smsHistory.creditsUsed = smsResult.recipientCount;
      smsHistory.mnotifyResponse = smsResult;
      
      // Update recipient statuses
      smsHistory.recipients = smsHistory.recipients.map(r => ({
        ...r.toObject(),
        status: 'sent'
      }));
    } else {
      smsHistory.status = 'failed';
      smsHistory.totalFailed = phoneNumbers.length;
      smsHistory.error = smsResult.error;
    }
    
    smsHistory.completedAt = new Date();
    await smsHistory.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    if (smsResult.success) {
      res.json({
        status: 'success',
        message: isScheduled ? 'SMS scheduled successfully' : 'SMS sent successfully',
        data: {
          campaignId: smsHistory.campaignId,
          totalRecipients: smsHistory.totalRecipients,
          totalSent: smsHistory.totalSent,
          creditsUsed: smsHistory.creditsUsed,
          senderId: senderId
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: `Failed to send SMS: ${smsResult.error}`,
        data: {
          campaignId: smsHistory.campaignId,
          error: smsResult.error
        }
      });
    }
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('SMS sending error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to send SMS. Please try again later.',
      error: error.message
    });
  }
});

/**
 * Process large campaigns in batches
 */
async function processCampaignInBatches(smsHistoryId, phoneNumbers, message, senderId) {
  try {
    const smsHistory = await SMSHistory.findById(smsHistoryId);
    if (!smsHistory) return;
    
    let totalSent = 0;
    let totalFailed = 0;
    const errors = [];
    
    // Process in batches
    for (let i = 0; i < phoneNumbers.length; i += BATCH_CONFIG.BATCH_SIZE) {
      const batch = phoneNumbers.slice(i, i + BATCH_CONFIG.BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i / BATCH_CONFIG.BATCH_SIZE) + 1}/${Math.ceil(phoneNumbers.length / BATCH_CONFIG.BATCH_SIZE)}`);
      
      try {
        const result = await sendBulkSMS(batch, message, senderId);
        
        if (result.success) {
          totalSent += result.recipientCount;
        } else {
          totalFailed += batch.length;
          errors.push(`Batch ${i / BATCH_CONFIG.BATCH_SIZE + 1}: ${result.error}`);
        }
        
        // Update progress
        smsHistory.totalSent = totalSent;
        smsHistory.totalFailed = totalFailed;
        await smsHistory.save();
        
      } catch (batchError) {
        console.error(`Batch error:`, batchError);
        totalFailed += batch.length;
        errors.push(`Batch ${i / BATCH_CONFIG.BATCH_SIZE + 1}: ${batchError.message}`);
      }
      
      // Delay between batches
      if (i + BATCH_CONFIG.BATCH_SIZE < phoneNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Update final status
    smsHistory.status = totalFailed === 0 ? 'completed' : 'completed_with_errors';
    smsHistory.totalSent = totalSent;
    smsHistory.totalFailed = totalFailed;
    smsHistory.creditsUsed = totalSent;
    smsHistory.completedAt = new Date();
    if (errors.length > 0) {
      smsHistory.errors = errors;
    }
    
    await smsHistory.save();
    
    console.log(`Campaign ${smsHistory.campaignId} completed:`, {
      totalSent,
      totalFailed,
      errors: errors.length
    });
    
  } catch (error) {
    console.error('Batch processing error:', error);
  }
}

/**
 * Get SMS history
 */
router.get('/sms/history', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    const history = await SMSHistory.find(query)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const totalCount = await SMSHistory.countDocuments(query);
    
    res.json({
      status: 'success',
      data: {
        history,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalRecords: totalCount
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch SMS history'
    });
  }
});

/**
 * Get SMS campaign details
 */
router.get('/sms/campaign/:campaignId', auth, adminAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await SMSHistory.findOne({ campaignId })
      .populate('sentBy', 'name email')
      .populate('recipients.userId', 'name email phoneNumber');
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    res.json({
      status: 'success',
      data: campaign
    });
    
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign details'
    });
  }
});

/**
 * Get SMS statistics
 */
router.get('/sms/stats', auth, adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalCampaigns,
      todayCampaigns,
      totalSmsSent,
      todaySmsSent,
      totalCreditsUsed
    ] = await Promise.all([
      SMSHistory.countDocuments({}),
      SMSHistory.countDocuments({ createdAt: { $gte: today } }),
      SMSHistory.aggregate([
        { $group: { _id: null, total: { $sum: '$totalSent' } } }
      ]),
      SMSHistory.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalSent' } } }
      ]),
      SMSHistory.aggregate([
        { $group: { _id: null, total: { $sum: '$creditsUsed' } } }
      ])
    ]);
    
    // Get campaigns by status
    const campaignsByStatus = await SMSHistory.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get top senders
    const topSenders = await SMSHistory.aggregate([
      {
        $group: {
          _id: '$sentBy',
          campaignCount: { $sum: 1 },
          totalSent: { $sum: '$totalSent' }
        }
      },
      { $sort: { totalSent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);
    
    res.json({
      status: 'success',
      data: {
        totalCampaigns,
        todayCampaigns,
        totalSmsSent: totalSmsSent[0]?.total || 0,
        todaySmsSent: todaySmsSent[0]?.total || 0,
        totalCreditsUsed: totalCreditsUsed[0]?.total || 0,
        campaignsByStatus: campaignsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topSenders: topSenders.map(sender => ({
          id: sender._id,
          name: sender.user.name,
          email: sender.user.email,
          campaignCount: sender.campaignCount,
          totalSent: sender.totalSent
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching SMS stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch SMS statistics'
    });
  }
});

/**
 * Check SMS balance (mock endpoint - implement actual mNotify balance check)
 */
router.get('/sms/balance', auth, adminAuth, async (req, res) => {
  try {
    // This should be implemented based on mNotify's balance check API
    // For now, returning a mock response
    
    // You can implement the actual balance check like this:
    // const url = `${SMS_CONFIG.BASE_URL}/balance?key=${SMS_CONFIG.API_KEY}`;
    // const response = await axios.get(url);
    
    res.json({
      status: 'success',
      data: {
        balance: 5000, // Mock balance
        currency: 'Credits',
        lastUpdated: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error checking SMS balance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check SMS balance'
    });
  }
});

/**
 * Get scheduled SMS campaigns
 */
router.get('/sms/scheduled', auth, adminAuth, async (req, res) => {
  try {
    const scheduledSMS = await SMSHistory.find({
      isScheduled: true,
      scheduledDate: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
    .populate('sentBy', 'name email')
    .sort({ scheduledDate: 1 });
    
    res.json({
      status: 'success',
      data: scheduledSMS
    });
    
  } catch (error) {
    console.error('Error fetching scheduled SMS:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch scheduled SMS'
    });
  }
});

/**
 * Cancel scheduled SMS campaign
 */
router.post('/sms/cancel/:campaignId', auth, adminAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await SMSHistory.findOne({ 
      campaignId,
      isScheduled: true,
      status: 'processing'
    });
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Scheduled campaign not found or already sent'
      });
    }
    
    // Update campaign status
    campaign.status = 'cancelled';
    campaign.cancelledBy = req.user.id;
    campaign.cancelledAt = new Date();
    await campaign.save();
    
    res.json({
      status: 'success',
      message: 'SMS campaign cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling SMS:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel SMS campaign'
    });
  }
});

module.exports = router;