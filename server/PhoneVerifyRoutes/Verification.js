const express = require('express');
const { body, validationResult } = require('express-validator');
const { PhoneVerification, TextVerifiedService } = require('../PhoneVerificationSchema/verification');

const router = express.Router();

/**
 * Phone Verification Controller and Routes with Refund Support
 * =================================================== 
 */

/**
 * @route   GET /api/verifications/services
 * @desc    Get list of available verification services
 * @access  Public
 */
router.get('/services', async (req, res) => {
  try {
    const services = await TextVerifiedService.getServiceList('verification');
    res.status(200).json(services);
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ error: 'Failed to fetch available services' });
  }
});

/**
 * @route   GET /api/verifications/history
 * @desc    List user's verification history
 * @access  Public
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Build query
    const query = { userId };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Count total documents
    const total = await PhoneVerification.countDocuments(query);
    
    // Find verifications with pagination
    const verifications = await PhoneVerification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      verifications: verifications.map(v => ({
        id: v._id,
        textVerifiedId: v.textVerifiedId,
        phoneNumber: v.phoneNumber,
        serviceName: v.serviceName,
        status: v.status,
        createdAt: v.createdAt,
        expiresAt: v.expiresAt,
        verificationCode: v.verificationCode || null,
        totalCost: v.totalCost,
        paymentStatus: v.paymentStatus
      }))
    });
  } catch (error) {
    console.error('Error getting verification history:', error);
    res.status(500).json({ error: 'Failed to fetch verification history' });
  }
});

/**
 * @route   POST /api/verifications/webhook
 * @desc    Handle TextVerified webhook callbacks
 * @access  Public (with webhook authentication)
 */
router.post(
  '/webhook',
  (req, res, next) => {
    // You can add webhook authentication logic here
    // For example, verifying a signature or an API key
    next();
  },
//   WebhookHandler.handleSmsWebhook
);

/**
 * @route   POST /api/verifications
 * @desc    Initialize a new phone verification
 * @access  Public
 */
router.post(
    '/',
    [
      body('serviceName').notEmpty().withMessage('Service name is required'),
      body('capability').optional().isIn(['sms', 'voice']).withMessage('Capability must be either sms or voice'),
      body('areaCodeSelectOption').optional().isArray().withMessage('Area code selection must be an array'),
      body('carrierSelectOption').optional().isArray().withMessage('Carrier selection must be an array'),
      body('serviceNotListedName').optional().isString().withMessage('Service not listed name must be a string')
    ],
    async (req, res) => {
      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
  
        const { serviceName, capability, areaCodeSelectOption, carrierSelectOption, serviceNotListedName } = req.body;
        
        // Get userId from request body
        const userId = req.body.userId;
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }
        
        // Find the user to check their wallet balance
        const { User } = require('../schema/schema'); // Adjust the path as needed
        const user = await User.findById(userId);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user has sufficient balance (21 GH₵)
        const verificationCost = 21; // Cost in Ghana Cedis
        
        if (user.walletBalance < verificationCost) {
          return res.status(400).json({ 
            error: 'Insufficient wallet balance', 
            required: verificationCost,
            current: user.walletBalance
          });
        }
        
        // At this point, user has sufficient balance
        // The wallet deduction is handled inside TextVerifiedService.createVerification
       // Update this section in your verification.js route handler
try {
  // Create verification
  const verification = await TextVerifiedService.createVerification({
    userId,
    serviceName,
    capability: capability || 'sms',
    areaCodeSelectOption,
    carrierSelectOption,
    serviceNotListedName
  });
  
  // Return verification details
  res.status(201).json({
    success: true,
    verificationId: verification._id,
    // Rest of your success response...
  });
} catch (verificationError) {
  console.error('Error in verification creation:', verificationError);
  
  // Handle specific error for insufficient balance
  if (verificationError.message && verificationError.message.includes('Insufficient wallet balance')) {
    return res.status(400).json({ 
      error: 'Insufficient wallet balance',
      message: verificationError.message
    });
  }
  
  // Handle "out of stock" errors from TextVerified API
  if (verificationError.response && 
      verificationError.response.data && 
      verificationError.response.data.errorCode === 'Unavailable') {
    return res.status(400).json({ 
      error: 'Service unavailable',
      errorCode: 'Unavailable',
      message: `The service "${serviceName}" is currently out of stock or unavailable. Please try another service.`
    });
  }
  
  // Handle other errors
  return res.status(500).json({ 
    error: 'Failed to initialize phone verification',
    message: verificationError.message
  });
}
      } catch (error) {
        console.error('Error initializing verification:', error);
        res.status(500).json({ error: 'Failed to initialize phone verification' });
      }
    }
  );

/**
 * @route   GET /api/verifications/:id
 * @desc    Get verification details
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.query.userId; // Get userId from query parameter
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log(`[GET /:id] Fetching verification ${id} for user ${userId}`);
      
      // First check our local database
      const verification = await PhoneVerification.findById(id);
      
      if (!verification) {
        console.log(`[GET /:id] Verification ${id} not found in database`);
        return res.status(404).json({ error: 'Verification not found' });
      }
      
      // Make sure the user can only access their own verifications
      if (verification.userId.toString() !== userId) {
        console.log(`[GET /:id] Unauthorized access attempt for ${id}`);
        return res.status(403).json({ error: 'Unauthorized access to verification' });
      }
      
      console.log(`[GET /:id] Found verification ${id}, textVerifiedId: ${verification.textVerifiedId}`);
      
      // Get latest details from TextVerified API
      const apiDetails = await TextVerifiedService.getVerificationDetails(verification.textVerifiedId);
      console.log(`[GET /:id] API state for ${verification.textVerifiedId}: ${apiDetails.state}`);
      
      // If verification is not verified, check for SMS messages
      if (verification.status !== 'verified') {
        console.log(`[GET /:id] Verification not verified, checking for SMS messages`);
        
        try {
          const messages = await TextVerifiedService.listSms(verification.textVerifiedId);
          
          if (messages && messages.length > 0) {
            console.log(`[GET /:id] Found ${messages.length} messages for ${verification.textVerifiedId}`);
            // Verification record should have been updated within the listSms method
          } else {
            console.log(`[GET /:id] No messages found for ${verification.textVerifiedId}`);
          }
          
          // Refresh verification data after potential update from listSms
          const refreshedVerification = await PhoneVerification.findById(id);
          if (refreshedVerification) {
            verification.status = refreshedVerification.status;
            verification.verificationCode = refreshedVerification.verificationCode;
            verification.messageDetails = refreshedVerification.messageDetails;
          }
        } catch (smsError) {
          console.error(`[GET /:id] Error fetching SMS:`, smsError);
          // Continue despite error
        }
      }
      
      // Check if verification has expired without a code and process refund if needed
      const needsRefund = apiDetails.state === 'expired' && 
                          !verification.verificationCode && 
                          verification.status !== 'refunded' &&
                          verification.paymentStatus !== 'refunded';
      
      if (needsRefund) {
        console.log(`[GET /:id] Verification expired without code, processing refund`);
        try {
          // Process refund asynchronously, don't wait for it to complete to respond
          TextVerifiedService.processRefundForExpiredVerification(id)
            .then(result => {
              console.log(`[GET /:id] Refund processed:`, result);
            })
            .catch(error => {
              console.error(`[GET /:id] Error processing refund:`, error);
            });
            
          // Mark verification as pending refund for the current response
          verification.status = 'refunded';
        } catch (refundError) {
          console.error(`[GET /:id] Error initiating refund:`, refundError);
        }
      }
      
      // Update verification status based on API state if needed
      if (apiDetails.state && verification.status !== 'verified' && verification.status !== 'refunded') {
        const mappedStatus = mapApiStateToStatus(apiDetails.state);
        
        if (mappedStatus !== verification.status) {
          console.log(`[GET /:id] Updating status from ${verification.status} to ${mappedStatus} based on API state`);
          verification.status = mappedStatus;
          await verification.save();
        }
      }
      
      // Format response
      console.log(`[GET /:id] Returning verification details, status: ${verification.status}, code: ${verification.verificationCode ? 'Present' : 'None'}`);
      
      // Return combined data
      res.status(200).json({
        success: true,
        verification: {
          id: verification._id,
          textVerifiedId: verification.textVerifiedId,
          phoneNumber: verification.phoneNumber,
          serviceName: verification.serviceName,
          capability: verification.capability || 'sms',
          status: verification.status,
          createdAt: verification.createdAt,
          expiresAt: verification.expiresAt,
          verificationCode: verification.verificationCode || null,
          messageDetails: verification.messageDetails || null,
          totalCost: verification.totalCost,
          paymentStatus: verification.paymentStatus,
          apiDetails: {
            state: apiDetails.state,
            number: apiDetails.number,
            canReactivate: apiDetails.reactivate?.canReactivate || false,
            canReport: apiDetails.report?.canReport || false,
            canCancel: apiDetails.cancel?.canCancel || false
          }
        }
      });
    } catch (error) {
      console.error('Error getting verification details:', error);
      res.status(500).json({ error: 'Failed to fetch verification details' });
    }
  });
  
  // Helper function to map TextVerified API states to our status values
  function mapApiStateToStatus(apiState) {
    switch (apiState) {
      case 'active':
      case 'verificationPending': 
        return 'active';
      case 'verified': 
        return 'verified';
      case 'canceled': 
        return 'canceled';
      case 'expired': 
        return 'expired';
      default: 
        return 'failed';
    }
  }
  
/**
 * @route   GET /api/verifications/:id/code
 * @desc    Get verification code (polls until code is received or timeout)
 * @access  Public
 */
router.get('/:id/code', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.query.userId; // Get userId from query parameter
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log(`[GET /:id/code] Fetching code for verification ${id}, user ${userId}`);
      
      // Find verification
      const verification = await PhoneVerification.findById(id);
      
      if (!verification) {
        console.log(`[GET /:id/code] Verification ${id} not found`);
        return res.status(404).json({ error: 'Verification not found' });
      }
      
      // Make sure the user can only access their own verifications
      if (verification.userId.toString() !== userId) {
        console.log(`[GET /:id/code] Unauthorized access attempt for ${id}`);
        return res.status(403).json({ error: 'Unauthorized access to verification' });
      }
      
      // If already verified, return code
      if (verification.status === 'verified' && verification.verificationCode) {
        console.log(`[GET /:id/code] Already verified with code: ${verification.verificationCode}`);
        return res.status(200).json({
          success: true,
          verificationCode: verification.verificationCode,
          receivedAt: verification.messageDetails?.receivedAt,
          status: 'verified'
        });
      }
      
      // If already refunded, return the refund status
      if (verification.status === 'refunded' || verification.paymentStatus === 'refunded') {
        console.log(`[GET /:id/code] Verification has been refunded`);
        return res.status(200).json({
          success: false,
          message: 'Verification has expired without code and was refunded',
          status: 'refunded'
        });
      }
      
      // Check the current API state before attempting to poll
      try {
        const apiDetails = await TextVerifiedService.getVerificationDetails(verification.textVerifiedId);
        console.log(`[GET /:id/code] API state: ${apiDetails.state} for ${verification.textVerifiedId}`);
        
        // If the API shows verification is already complete but we don't have the code
        if (apiDetails.state === 'verified') {
          console.log(`[GET /:id/code] API shows verified state but we don't have the code, fetching SMS`);
          try {
            const messages = await TextVerifiedService.listSms(verification.textVerifiedId);
            
            if (messages && messages.length > 0) {
              const code = messages[0].parsedCode || messages[0].body;
              console.log(`[GET /:id/code] Retrieved code from SMS: ${code}`);
              
              // Get the updated verification with the code
              const updatedVerification = await PhoneVerification.findById(id);
              
              return res.status(200).json({
                success: true,
                verificationCode: updatedVerification.verificationCode || code,
                status: 'verified'
              });
            }
          } catch (smsError) {
            console.error(`[GET /:id/code] Error fetching SMS for verified state:`, smsError);
          }
        }
        
        // If the API state is expired and there's no code, process refund
        if (apiDetails.state === 'expired' && !verification.verificationCode) {
          console.log(`[GET /:id/code] Verification expired without code, processing refund`);
          
          try {
            // Process refund (don't wait for completion to respond to the request)
            TextVerifiedService.processRefundForExpiredVerification(id)
              .then(result => {
                console.log(`[GET /:id/code] Refund processed:`, result);
              })
              .catch(error => {
                console.error(`[GET /:id/code] Error processing refund:`, error);
              });
            
            return res.status(200).json({
              success: false,
              message: 'Verification has expired without code and is being refunded',
              status: 'refunded'
            });
          } catch (refundError) {
            console.error(`[GET /:id/code] Error initiating refund:`, refundError);
          }
        }
        
        // If the API state indicates verification is no longer active
        if (apiDetails.state !== 'active' && apiDetails.state !== 'verificationPending') {
          const mappedStatus = mapApiStateToStatus(apiDetails.state);
          console.log(`[GET /:id/code] Verification not active, state: ${apiDetails.state}, mapped to: ${mappedStatus}`);
          
          // Update our verification status
          if (verification.status !== mappedStatus) {
            verification.status = mappedStatus;
            await verification.save();
            console.log(`[GET /:id/code] Updated status to ${mappedStatus}`);
          }
          
          return res.status(200).json({
            success: false,
            message: `Verification is in state: ${mappedStatus}`,
            status: mappedStatus
          });
        }
      } catch (apiError) {
        console.error(`[GET /:id/code] Error checking API state:`, apiError);
        // Continue to polling despite error
      }
      
      // Try an immediate check for SMS before polling
      try {
        console.log(`[GET /:id/code] Checking for SMS before polling`);
        const messages = await TextVerifiedService.listSms(verification.textVerifiedId);
        
        if (messages && messages.length > 0) {
          // Get the updated verification with the code
          const updatedVerification = await PhoneVerification.findById(id);
          
          if (updatedVerification && updatedVerification.verificationCode) {
            console.log(`[GET /:id/code] Found code immediately: ${updatedVerification.verificationCode}`);
            return res.status(200).json({
              success: true,
              verificationCode: updatedVerification.verificationCode,
              status: 'verified'
            });
          }
        }
      } catch (smsError) {
        console.error(`[GET /:id/code] Error checking SMS before polling:`, smsError);
      }
      
      // Only do a single poll attempt per API call to avoid timeout
      const maxAttempts = parseInt(req.query.attempts || 1);
      const interval = parseInt(req.query.interval || 2000);
      
      console.log(`[GET /:id/code] Polling with ${maxAttempts} attempts, ${interval}ms interval`);
      
      const code = await TextVerifiedService.pollForVerification(
        verification.textVerifiedId, 
        maxAttempts, 
        interval
      );
      
      if (code) {
        console.log(`[GET /:id/code] Poll successful, found code: ${code}`);
        return res.status(200).json({
          success: true,
          verificationCode: code,
          status: 'verified'
        });
      } else {
        // Get the latest verification state after polling
        const updatedVerification = await PhoneVerification.findById(id);
        
        console.log(`[GET /:id/code] No code from poll, current status: ${updatedVerification.status}`);
        
        // If it's expired now, initiate a refund
        if (updatedVerification.status === 'expired' && !updatedVerification.verificationCode) {
          console.log(`[GET /:id/code] Verification expired after polling, processing refund`);
          
          try {
            // Process refund asynchronously
            TextVerifiedService.processRefundForExpiredVerification(id)
              .then(result => {
                console.log(`[GET /:id/code] Refund processed after polling:`, result);
              })
              .catch(error => {
                console.error(`[GET /:id/code] Error processing refund after polling:`, error);
              });
            
            return res.status(200).json({
              success: false,
              message: 'Verification has expired without code and is being refunded',
              status: 'refunded'
            });
          } catch (refundError) {
            console.error(`[GET /:id/code] Error initiating refund after polling:`, refundError);
          }
        }
        
        return res.status(200).json({
          success: false,
          message: 'Verification code not received yet',
          status: updatedVerification.status
        });
      }
    } catch (error) {
      console.error('Error getting verification code:', error);
      res.status(500).json({ error: 'Failed to get verification code' });
    }
  });

/**
 * @route   POST /api/verifications/:id/refund
 * @desc    Manually request a refund for a verification
 * @access  Public
 */
router.post('/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`[POST /:id/refund] Processing refund request for verification ${id}, user ${userId}`);
    
    // Find verification
    const verification = await PhoneVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    // Make sure the user can only access their own verifications
    if (verification.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to verification' });
    }
    
    // Check if already refunded
    if (verification.status === 'refunded' || verification.paymentStatus === 'refunded') {
      return res.status(400).json({ 
        error: 'Verification has already been refunded',
        verification: {
          id: verification._id,
          status: verification.status,
          paymentStatus: verification.paymentStatus
        }
      });
    }
    
    // Check if verification is verified
    if (verification.status === 'verified' && verification.verificationCode) {
      return res.status(400).json({ 
        error: 'Verification is already verified and cannot be refunded',
        verification: {
          id: verification._id,
          status: verification.status
        }
      });
    }
    
    // Process refund
    const refundResult = await TextVerifiedService.processRefundForExpiredVerification(id);
    
    // Return result
    if (refundResult.success) {
      return res.status(200).json({
        success: true,
        message: `Refunded ${verification.totalCost} GH₵ for verification`,
        refundAmount: verification.totalCost,
        newBalance: refundResult.newBalance,
        verification: {
          id: verification._id,
          status: 'refunded',
          paymentStatus: 'refunded'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: refundResult.message,
        verification: {
          id: verification._id,
          status: verification.status,
          paymentStatus: verification.paymentStatus
        }
      });
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * @route   GET /api/verifications/check-pending-refunds
 * @desc    Check and process all pending refunds (admin/cron endpoint)
 * @access  Restricted
 */
router.get('/check-pending-refunds', async (req, res) => {
  try {
    // This should be a protected endpoint, only accessible by admins or cron jobs
    // Add authentication/authorization middleware as needed
    
    console.log('[GET /check-pending-refunds] Starting batch refund check');
    
    // Process all pending refunds
    const results = await TextVerifiedService.checkAndProcessPendingRefunds();
    
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error checking pending refunds:', error);
    res.status(500).json({ error: 'Failed to check pending refunds' });
  }
});

/**
 * @route   POST /api/verifications/:id/report
 * @desc    Report a verification problem
 * @access  Public
 */
router.post('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find verification
    const verification = await PhoneVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    // Make sure the user can only access their own verifications
    if (verification.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to verification' });
    }
    
    // Report verification
    const result = await TextVerifiedService.reportVerification(verification.textVerifiedId);
    
    res.status(200).json({
      success: true,
      message: 'Verification reported successfully',
      details: result
    });
  } catch (error) {
    console.error('Error reporting verification:', error);
    res.status(500).json({ error: 'Failed to report verification' });
  }
});

/**
 * @route   POST /api/verifications/:id/cancel
 * @desc    Cancel a verification
 * @access  Public
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId; // Get userId from request body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find verification
    const verification = await PhoneVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    // Make sure the user can only access their own verifications
    if (verification.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to verification' });
    }
    
    // Cancel verification
    const result = await TextVerifiedService.cancelVerification(verification.textVerifiedId);
    
    // If cancellation was successful, process a refund
    if (result && result.success) {
      try {
        const refundResult = await TextVerifiedService.processRefundForExpiredVerification(id);
        
        if (refundResult.success) {
          return res.status(200).json({
            success: true,
            message: 'Verification cancelled and refunded successfully',
            refundAmount: verification.totalCost,
            newBalance: refundResult.newBalance
          });
        } else {
          return res.status(200).json({
            success: true,
            message: 'Verification cancelled successfully but refund failed',
            refundError: refundResult.message,
            details: result
          });
        }
      } catch (refundError) {
        console.error('Error processing refund after cancellation:', refundError);
        return res.status(200).json({
          success: true,
          message: 'Verification cancelled successfully but refund failed',
          refundError: refundError.message,
          details: result
        });
      }
    } else {
      res.status(200).json({
        success: true,
        message: 'Verification cancelled successfully',
        details: result
      });
    }
  } catch (error) {
    console.error('Error cancelling verification:', error);
    res.status(500).json({ error: 'Failed to cancel verification' });
  }
});

module.exports = router;