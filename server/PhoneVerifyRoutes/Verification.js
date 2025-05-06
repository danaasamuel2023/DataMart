const express = require('express');
const { body, validationResult } = require('express-validator');
const { PhoneVerification, TextVerifiedService } = require('../PhoneVerificationSchema/verification');

const router = express.Router();

/**
 * Phone Verification Controller and Routes in one file
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
        totalCost: v.totalCost
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
// Updated POST route for creating a new verification with wallet balance check
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
            textVerifiedId: verification.textVerifiedId,
            phoneNumber: verification.phoneNumber,
            expiresAt: verification.expiresAt,
            status: verification.status,
            totalCost: verification.totalCost,
            walletDeduction: verificationCost,
            remainingBalance: user.walletBalance - verificationCost // Show the updated balance in response
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
      
      // Update verification status based on API state if needed
      if (apiDetails.state && verification.status !== 'verified') {
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
    
    res.status(200).json({
      success: true,
      message: 'Verification cancelled successfully',
      details: result
    });
  } catch (error) {
    console.error('Error cancelling verification:', error);
    res.status(500).json({ error: 'Failed to cancel verification' });
  }
});

module.exports = router;