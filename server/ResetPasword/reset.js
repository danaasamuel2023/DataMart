const express = require('express');
const router = express.Router();
const axios = require('axios');
const { User } = require('../schema/schema'); 
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || 'DatAmArt';

// mNotify SMS configuration
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY || 'w3rGWhv4e235nDwYvD5gVDyrW',
  SENDER_ID: 'DataMartGH',
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

/**
 * Format phone number to Ghana format for mNotify
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phone) => {
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
 * Send SMS notification using mNotify
 * @param {string} to - Recipient phone number
 * @param {string} message - Message to send
 * @returns {Promise<Object>} - SMS API response
 */
const sendSMS = async (to, message) => {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    // Validate phone number
    if (!formattedPhone || formattedPhone.length < 12) {
      throw new Error('Invalid phone number format');
    }
    
    // Construct SMS API URL
    const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${SMS_CONFIG.SENDER_ID}`;
    
    // Send SMS request
    const response = await axios.get(url);
    
    // Log the full response for debugging
    console.log('mNotify SMS API Response:', {
      status: response.status,
      data: response.data,
      dataType: typeof response.data
    });
    
    // Handle different response formats
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
    
    if (isNaN(responseCode)) {
      console.error('Could not parse mNotify response code from:', response.data);
      if (response.status === 200) {
        return { success: true, message: 'SMS sent (assumed successful)', rawResponse: response.data };
      }
      throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
    }
    
    // Handle response codes
    switch (responseCode) {
      case 1000:
        console.log('SMS sent successfully to:', formattedPhone);
        return { success: true, message: 'SMS sent successfully', code: responseCode };
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
        return { success: true, message: 'SMS scheduled for later delivery', code: responseCode };
      case 1008:
        throw new Error('Empty message');
      case 1011:
        throw new Error('Numeric Sender IDs are not allowed');
      case 1012:
        throw new Error('Sender ID is not registered. Please contact support at senderids@mnotify.com');
      default:
        throw new Error(`Unknown response code: ${responseCode}`);
    }
  } catch (error) {
    if (error.response) {
      console.error('mNotify SMS API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error('mNotify SMS Error:', error.message);
    return { success: false, error: error.message };
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
    
    // Send OTP via SMS using mNotify
    const message = `Your DataMartGH password reset code is: ${otp}. This code is valid for 10 minutes. If you didn't request this, please ignore.`;
    const smsResult = await sendSMS(user.phoneNumber, message);
    
    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      return res.status(500).json({ 
        message: 'Failed to send verification code via SMS',
        error: 'SMS service error. Please try again later.'
      });
    }
    
    // For privacy, only show last 4 digits of phone number
    const maskedPhoneNumber = user.phoneNumber.replace(/\d(?=\d{4})/g, '*');
    
    res.status(200).json({
      message: 'Password reset code sent successfully',
      phoneNumber: maskedPhoneNumber,
      otpExpiry,
      expiresInMinutes: 10
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      message: 'Error processing password reset request',
      error: 'An error occurred. Please try again later.'
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
    
    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password too weak',
        details: { newPassword: 'Password must be at least 6 characters long' }
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
    
    // Send success SMS notification using mNotify
    const message = `Your DataMartGH password has been successfully reset. If you did not perform this action, please contact support immediately.`;
    await sendSMS(user.phoneNumber, message);
    
    res.status(200).json({
      message: 'Password reset successful',
      success: true,
      loginRedirect: '/login'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Error resetting password',
      error: 'An error occurred. Please try again later.'
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
    
    // Check if there's an existing OTP that hasn't expired
    if (user.resetPasswordOTP && user.resetPasswordOTPExpiry && new Date() < user.resetPasswordOTPExpiry) {
      const remainingMinutes = Math.ceil((user.resetPasswordOTPExpiry - new Date()) / 60000);
      return res.status(429).json({
        message: 'Previous code is still valid',
        details: `Your previous code is still valid for ${remainingMinutes} more minutes. Please check your SMS.`
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
    
    // Send OTP via SMS using mNotify
    const message = `Your new DataMartGH password reset code is: ${otp}. This code is valid for 10 minutes.`;
    const smsResult = await sendSMS(user.phoneNumber, message);
    
    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      return res.status(500).json({ 
        message: 'Failed to send verification code via SMS',
        error: 'SMS service error. Please try again later.'
      });
    }
    
    // For privacy, only show last 4 digits of phone number
    const maskedPhoneNumber = user.phoneNumber.replace(/\d(?=\d{4})/g, '*');
    
    res.status(200).json({
      message: 'New password reset code sent successfully',
      phoneNumber: maskedPhoneNumber,
      otpExpiry,
      expiresInMinutes: 10
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      message: 'Error sending new verification code',
      error: 'An error occurred. Please try again later.'
    });
  }
});

// Optional: Add route to verify OTP without resetting password
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: {
          phoneNumber: !phoneNumber ? 'Phone number is required' : null,
          otp: !otp ? 'Verification code is required' : null
        }
      });
    }
    
    // Find user by phone number WITH the reset password fields
    const user = await User.findOne({ phoneNumber }).select('+resetPasswordOTP +resetPasswordOTPExpiry');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if OTP exists
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ 
        message: 'No password reset code found',
        details: 'Please request a password reset code first'
      });
    }
    
    // Check if OTP is expired
    if (new Date() > user.resetPasswordOTPExpiry) {
      return res.status(400).json({ 
        message: 'Verification code has expired',
        details: 'Please request a new password reset code'
      });
    }
    
    // Verify OTP
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    res.status(200).json({
      message: 'Verification code is valid',
      success: true,
      canResetPassword: true
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      message: 'Error verifying code',
      error: 'An error occurred. Please try again later.'
    });
  }
});

module.exports = router;