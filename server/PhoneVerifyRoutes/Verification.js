const express = require('express');
const { body, validationResult } = require('express-validator');
const { PhoneVerification, TextVerifiedService, WebhookHandler } = require('../PhoneVerificationSchema/verification');

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
      
      // Get userId from localStorage (as mentioned in your note)
      const userId = req.body.userId; // You should pass this from the client
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
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
        totalCost: verification.totalCost
      });
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
    
    // First check our local database
    const verification = await PhoneVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    // Make sure the user can only access their own verifications
    if (verification.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to verification' });
    }
    
    // Get latest details from TextVerified API
    const apiDetails = await TextVerifiedService.getVerificationDetails(verification.textVerifiedId);
    
    // Check if there are new SMS messages
    if (verification.status !== 'verified') {
      const messages = await TextVerifiedService.listSms(verification.textVerifiedId);
      
      if (messages && messages.length > 0) {
        // We have a verification code
        verification.status = 'verified';
        verification.verificationCode = messages[0].body;
        verification.messageDetails = {
          messageId: messages[0].id,
          receivedAt: new Date(messages[0].receivedAt),
          content: messages[0].body
        };
        await verification.save();
      }
    }
    
    // Return combined data
    res.status(200).json({
      success: true,
      verification: {
        id: verification._id,
        textVerifiedId: verification.textVerifiedId,
        phoneNumber: verification.phoneNumber,
        serviceName: verification.serviceName,
        status: verification.status,
        createdAt: verification.createdAt,
        expiresAt: verification.expiresAt,
        verificationCode: verification.verificationCode || null,
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
    
    // Find verification
    const verification = await PhoneVerification.findById(id);
    
    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    // Make sure the user can only access their own verifications
    if (verification.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to verification' });
    }
    
    // If already verified, return code
    if (verification.status === 'verified' && verification.verificationCode) {
      return res.status(200).json({
        success: true,
        verificationCode: verification.verificationCode,
        receivedAt: verification.messageDetails?.receivedAt
      });
    }
    
    // Otherwise poll for the code
    const maxAttempts = parseInt(req.query.attempts || 12);
    const interval = parseInt(req.query.interval || 5000);
    
    const code = await TextVerifiedService.pollForVerification(
      verification.textVerifiedId, 
      maxAttempts, 
      interval
    );
    
    if (code) {
      return res.status(200).json({
        success: true,
        verificationCode: code,
        status: 'verified'
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Verification code not received yet',
        status: verification.status
      });
    }
  } catch (error) {
    console.error('Error getting verification code:', error);
    res.status(500).json({ error: 'Failed to get verification code' });
  }
});

/**
 * @route   POST /api/verifications/:id/reactivate
 * @desc    Reactivate a verification
 * @access  Public
 */
router.post('/:id/reactivate', async (req, res) => {
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
    
    // Reactivate verification
    const result = await TextVerifiedService.reactivateVerification(verification.textVerifiedId);
    
    res.status(200).json({
      success: true,
      message: 'Verification reactivated successfully',
      details: result
    });
  } catch (error) {
    console.error('Error reactivating verification:', error);
    res.status(500).json({ error: 'Failed to reactivate verification' });
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
  WebhookHandler.handleSmsWebhook
);

module.exports = router;