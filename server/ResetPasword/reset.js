const express = require('express');

const router = express.Router();
const axios = require('axios');
const { User } = require('../schema/schema'); 
const bcrypt = require("bcryptjs");


const JWT_SECRET = process.env.JWT_SECRET || 'DatAmArt';
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY || 'QkNhS0l2ZUZNeUdweEtmYVRUREg';

// SMS sending function
const sendSMS = async (phoneNumber, message, options = {}) => {
  const {
    scheduleTime = null,
    useCase = null,
    senderID = 'Bundle'
  } = options;

  // Input validation
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  // Base parameters
  const params = {
    action: 'send-sms',
    api_key: ARKESEL_API_KEY,
    to: phoneNumber,
    from: senderID,
    sms: message
  };

  // Add optional parameters
  if (scheduleTime) {
    params.schedule = scheduleTime;
  }

  if (useCase && ['promotional', 'transactional'].includes(useCase)) {
    params.use_case = useCase;
  }

  try {
    const response = await axios.get('https://sms.arkesel.com/sms/api', {
      params,
      timeout: 10000 // 10 second timeout
    });

    // Map error codes to meaningful messages
    const errorCodes = {
      '100': 'Bad gateway request',
      '101': 'Wrong action',
      '102': 'Authentication failed',
      '103': 'Invalid phone number',
      '104': 'Phone coverage not active',
      '105': 'Insufficient balance',
      '106': 'Invalid Sender ID',
      '109': 'Invalid Schedule Time',
      '111': 'SMS contains spam word. Wait for approval'
    };

    if (response.data.code !== 'ok') {
      const errorMessage = errorCodes[response.data.code] || 'Unknown error occurred';
      throw new Error(`SMS sending failed: ${errorMessage}`);
    }

    console.log('SMS sent successfully:', {
      to: phoneNumber,
      status: response.data.code,
      balance: response.data.balance
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    // Handle specific error types
    if (error.response) {
      console.error('SMS API responded with error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('No response received from SMS API:', error.message);
    } else {
      console.error('SMS request setup error:', error.message);
    }

    return {
      success: false,
      error: {
        message: error.message,
        code: error.response?.data?.code,
        details: error.response?.data
      }
    };
  }
};


// Step 1: Request password reset by phone number (NO authentication required)
router.post('/request-password-reset', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        message: 'Phone number is required',
        details: { phoneNumber: 'Please provide your phone number' }
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        message: 'Invalid phone number format',
        details: { phoneNumber: 'Please enter a valid phone number' }
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this phone number' });
    }

    if (user.isDisabled) {
      return res.status(403).json({
        message: 'Account is disabled',
        disableReason: user.disableReason,
        disabledAt: user.disabledAt
      });
    }

    // Generate OTP (6-digit number)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration time (10 minutes from now)
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    
    // Save OTP to user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();
    
    // Send OTP via SMS
    const message = `Your Datamart password reset code is: ${otp}. Valid for 10 minutes.`;
    const smsResult = await sendSMS(user.phoneNumber, message, { useCase: 'transactional' });
    
    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      return res.status(500).json({ 
        message: 'Failed to send verification code via SMS',
        error: smsResult.error.message
      });
    }
    
    // For privacy, only show last 4 digits of phone number
    const maskedPhoneNumber = user.phoneNumber.replace(/(?=.{4}$)./g, '*');
    
    res.status(200).json({
      message: 'Password reset code sent successfully',
      phoneNumber: maskedPhoneNumber,
      otpExpiry
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      message: 'Error processing password reset request',
      error: error.message
    });
  }
});

// Step 2: Verify OTP and reset password (NO authentication required)
router.post('/reset-password', async (req, res) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;
    
    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: {
          phoneNumber: !phoneNumber ? 'Phone number is required' : null,
          otp: !otp ? 'Verification code is required' : null,
          newPassword: !newPassword ? 'New password is required' : null
        }
      });
    }
    
    // Find user by phone number WITH the reset password fields
    const user = await User.findOne({ phoneNumber }).select('+resetPasswordOTP +resetPasswordOTPExpiry');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if OTP exists and is valid
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ 
        message: 'No password reset was requested or it has expired',
        details: 'Please request a new password reset code'
      });
    }
    
    // Check if OTP is expired
    if (new Date() > user.resetPasswordOTPExpiry) {
      // Clear expired OTP data
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpiry = undefined;
      await user.save();
      
      return res.status(400).json({ 
        message: 'Verification code has expired',
        details: 'Please request a new password reset code'
      });
    }
    
    // Verify OTP
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    // Hash the new password before saving
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password with the hashed version
    user.password = hashedPassword;
    
    // Clear OTP data
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    user.lastPasswordReset = new Date();
    
    await user.save();
    
    // Send success SMS notification
    const message = 'Your Datamart password has been successfully reset. If you did not perform this action, please contact support immediately.';
    await sendSMS(user.phoneNumber, message, { useCase: 'transactional' });
    
    res.status(200).json({
      message: 'Password reset successful',
      loginRedirect: '/login'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Error resetting password',
      error: error.message
    });
  }
});
// Add route to resend OTP if expired or not received (NO authentication required)
router.post('/resend-password-reset-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        message: 'Phone number is required',
        details: { phoneNumber: 'Please provide your phone number' }
      });
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        message: 'Invalid phone number format',
        details: { phoneNumber: 'Please enter a valid phone number' }
      });
    }
    
    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this phone number' });
    }
    
    if (user.isDisabled) {
      return res.status(403).json({
        message: 'Account is disabled',
        disableReason: user.disableReason,
        disabledAt: user.disabledAt
      });
    }
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration time (10 minutes from now)
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    
    // Save OTP to user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();
    
    // Send OTP via SMS
    const message = `Your new DataHub password reset code is: ${otp}. Valid for 10 minutes.`;
    const smsResult = await sendSMS(user.phoneNumber, message, { useCase: 'transactional' });
    
    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      return res.status(500).json({ 
        message: 'Failed to send verification code via SMS',
        error: smsResult.error.message
      });
    }
    
    // For privacy, only show last 4 digits of phone number
    const maskedPhoneNumber = user.phoneNumber.replace(/(?=.{4}$)./g, '*');
    
    res.status(200).json({
      message: 'New password reset code sent successfully',
      phoneNumber: maskedPhoneNumber,
      otpExpiry
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      message: 'Error sending new verification code',
      error: error.message
    });
  }
});

module.exports = router;