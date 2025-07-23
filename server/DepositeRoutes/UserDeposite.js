const express = require('express');
const router = express.Router();
const { Transaction, User } = require('../schema/schema');
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Import authentication middleware
const auth = require('../middlewareUser/middleware');

// Paystack configuration
const PAYSTACK_SECRET_KEY = 'sk_live_0fba72fb9c4fc71200d2e0cdbb4f2b37c1de396c'; 
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// mNotify SMS configuration
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY || 'w3rGWhv4e235nDwYvD5gVDyrW',
  SENDER_ID: 'DataMartGH',
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

/**
 * Format phone number to Ghana format
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
 * Send SMS notification
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
    console.log('SMS API Full Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      dataType: typeof response.data
    });
    
    // Handle different response formats
    let responseCode;
    
    // If response.data is already a number
    if (typeof response.data === 'number') {
      responseCode = response.data;
    } 
    // If response.data is a string that might contain a number
    else if (typeof response.data === 'string') {
      // Try to extract number from string
      const match = response.data.match(/\d+/);
      if (match) {
        responseCode = parseInt(match[0]);
      } else {
        // If the response is "1000" or similar
        responseCode = parseInt(response.data.trim());
      }
    }
    // If response.data is an object with a code property
    else if (typeof response.data === 'object' && response.data.code) {
      responseCode = parseInt(response.data.code);
    }
    
    // Check if we got a valid response code
    if (isNaN(responseCode)) {
      console.error('Could not parse SMS response code from:', response.data);
      // If response status is 200, assume success
      if (response.status === 200) {
        return { success: true, message: 'SMS sent (assumed successful)', rawResponse: response.data };
      }
      throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
    }
    
    // Handle response codes
    switch (responseCode) {
      case 1000:
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
    // If it's an axios error, provide more details
    if (error.response) {
      console.error('SMS API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error('SMS Error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send deposit confirmation SMS
 * @param {Object} user - User object
 * @param {number} amount - Deposited amount
 * @param {number} newBalance - New wallet balance
 */
const sendDepositSMS = async (user, amount, newBalance) => {
  try {
    const message = `Hello ${user.name}! Your DataMartGH account has been credited with GHS ${amount.toFixed(2)}. Your new balance is GHS ${newBalance.toFixed(2)}. Thank you for choosing DataMartGH!`;
    
    const result = await sendSMS(user.phoneNumber, message);
    
    if (result.success) {
      console.log(`Deposit SMS sent to ${user.phoneNumber}`);
    } else {
      console.error(`Failed to send deposit SMS to ${user.phoneNumber}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Send Deposit SMS Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send transfer received SMS
 * @param {Object} recipient - Recipient user object
 * @param {Object} sender - Sender user object
 * @param {number} amount - Transfer amount
 * @param {number} newBalance - Recipient's new balance
 */
const sendTransferReceivedSMS = async (recipient, sender, amount, newBalance) => {
  try {
    const message = `Hi ${recipient.name}! You've received GHS ${amount.toFixed(2)} from ${sender.name || sender.email} on DataMartGH. Your new balance is GHS ${newBalance.toFixed(2)}. Keep enjoying DataMartGH services!`;
    
    const result = await sendSMS(recipient.phoneNumber, message);
    
    if (result.success) {
      console.log(`Transfer SMS sent to ${recipient.phoneNumber}`);
    } else {
      console.error(`Failed to send transfer SMS to ${recipient.phoneNumber}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Send Transfer SMS Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send transfer sent SMS (optional - for sender confirmation)
 * @param {Object} sender - Sender user object
 * @param {Object} recipient - Recipient user object
 * @param {number} amount - Transfer amount
 * @param {number} newBalance - Sender's new balance
 */
const sendTransferSentSMS = async (sender, recipient, amount, newBalance) => {
  try {
    const message = `Dear ${sender.name}, you've successfully sent GHS ${amount.toFixed(2)} to ${recipient.name || recipient.email} on DataMartGH. Your remaining balance is GHS ${newBalance.toFixed(2)}. Thank you!`;
    
    const result = await sendSMS(sender.phoneNumber, message);
    
    if (result.success) {
      console.log(`Transfer confirmation SMS sent to ${sender.phoneNumber}`);
    } else {
      console.error(`Failed to send transfer confirmation SMS to ${sender.phoneNumber}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Send Transfer Sent SMS Error:', error);
    return { success: false, error: error.message };
  }
};

// Initiate Deposit
router.post('/deposit', async (req, res) => {
  try {
    const { userId, amount, totalAmountWithFee, email } = req.body;

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid deposit details' 
      });
    }

    // Find user to get their email and check account status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Check if user's account is disabled
    if (user.isDisabled) {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled',
        message: 'Your account has been disabled. Deposits are not allowed.',
        disableReason: user.disableReason || 'No reason provided'
      });
    }

    // Generate a unique transaction reference
    const reference = `DEP-${crypto.randomBytes(10).toString('hex')}-${Date.now()}`;

    // Get current balance for tracking
    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore + parseFloat(amount); // Will be the balance after successful deposit

    // Create a pending transaction with balance tracking
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount: parseFloat(amount), // This is the BASE amount WITHOUT fee that will be added to wallet
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter, // This will be the expected balance after completion
      status: 'pending',
      reference,
      gateway: 'paystack',
      description: `Wallet deposit via Paystack`
    });

    await transaction.save();

    // Initiate Paystack payment with the total amount including fee
    // Fixed: Parse amount to float, multiply by 100, then round to integer
    const paystackAmount = totalAmountWithFee ? 
      Math.round(parseFloat(totalAmountWithFee) * 100) : // If provided, use total with fee
      Math.round(parseFloat(amount) * 100); // Fallback to base amount if no total provided
    
    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: email || user.email,
        amount: paystackAmount, // Convert to pesewas (smallest currency unit for GHS)
        currency: 'GHS',
        reference,
        callback_url: `https://www.datamartgh.shop/payment/callback?reference=${reference}`
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Return Paystack payment URL
    return res.json({
      success: true,
      message: 'Deposit initiated',
      paystackUrl: paystackResponse.data.data.authorization_url,
      reference
    });

  } catch (error) {
    console.error('Deposit Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// FIXED: Added transaction locking mechanism using processing field
// Process a successful payment and update user wallet with balance tracking
async function processSuccessfulPayment(reference) {
  // Use findOneAndUpdate with proper conditions to prevent race conditions
  const transaction = await Transaction.findOneAndUpdate(
    { 
      reference, 
      status: 'pending',
      processing: { $ne: true } // Only update if not already being processed
    },
    { 
      $set: { 
        processing: true  // Mark as being processed to prevent double processing
      } 
    },
    { new: true }
  );

  if (!transaction) {
    console.log(`Transaction ${reference} not found or already processed/processing`);
    return { success: false, message: 'Transaction not found or already processed' };
  }

  try {
    // Update user's wallet balance
    const user = await User.findById(transaction.userId);
    if (!user) {
      console.error(`User not found for transaction ${reference}`);
      // Release the processing lock
      transaction.processing = false;
      await transaction.save();
      return { success: false, message: 'User not found' };
    }

    // Verify the balanceBefore matches current user balance (for integrity check)
    if (Math.abs(user.walletBalance - transaction.balanceBefore) > 0.01) {
      console.warn(`Balance mismatch for user ${user._id}. Expected: ${transaction.balanceBefore}, Actual: ${user.walletBalance}`);
      // Update transaction with correct balances
      transaction.balanceBefore = user.walletBalance;
      transaction.balanceAfter = user.walletBalance + transaction.amount;
    }

    // Update user balance
    const previousBalance = user.walletBalance;
    user.walletBalance += transaction.amount;
    await user.save();

    // Update transaction with final status and correct balances
    transaction.status = 'completed';
    transaction.balanceBefore = previousBalance;
    transaction.balanceAfter = user.walletBalance;
    transaction.processing = false;
    await transaction.save();

    console.log(`Transaction ${reference} completed. User ${user._id} balance: ${previousBalance} -> ${user.walletBalance}`);
    
    // Send SMS notification for successful deposit
    await sendDepositSMS(user, transaction.amount, user.walletBalance);
    
    return { success: true, message: 'Deposit successful', newBalance: user.walletBalance };
  } catch (error) {
    // If there's an error, release the processing lock
    transaction.processing = false;
    transaction.status = 'failed';
    await transaction.save();
    throw error;
  }
}

// Paystack webhook handler
router.post('/paystack/webhook', async (req, res) => {
  try {
    // Log incoming webhook
    console.log('Webhook received:', JSON.stringify({
      headers: req.headers['x-paystack-signature'],
      event: req.body.event,
      reference: req.body.data?.reference
    }));

    const secret = PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify Paystack signature
    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference } = event.data;
      console.log(`Processing successful payment for reference: ${reference}`);

      const result = await processSuccessfulPayment(reference);
      return res.json({ message: result.message });
    } else {
      console.log(`Unhandled event type: ${event.event}`);
      return res.json({ message: 'Event received' });
    }

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify payment endpoint for client-side verification
router.get('/verify-payment', async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ 
        success: false, 
        error: 'Reference is required' 
      });
    }

    // Find the transaction in our database
    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    // If transaction is already completed, we can return success
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified and completed',
        data: {
          reference,
          amount: transaction.amount,
          status: transaction.status,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          balanceChange: transaction.balanceAfter - transaction.balanceBefore
        }
      });
    }

    // If transaction is still pending, verify with Paystack
    if (transaction.status === 'pending') {
      try {
        // Verify the transaction status with Paystack
        const paystackResponse = await axios.get(
          `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const { data } = paystackResponse.data;

        // If payment is successful
        if (data.status === 'success') {
          // Process the payment using our common function
          const result = await processSuccessfulPayment(reference);
          
          if (result.success) {
            // Get updated transaction for accurate balance info
            const updatedTransaction = await Transaction.findOne({ reference });
            
            return res.json({
              success: true,
              message: 'Payment verified successfully',
              data: {
                reference,
                amount: updatedTransaction.amount,
                status: 'completed',
                balanceBefore: updatedTransaction.balanceBefore,
                balanceAfter: updatedTransaction.balanceAfter,
                balanceChange: updatedTransaction.balanceAfter - updatedTransaction.balanceBefore,
                newBalance: result.newBalance
              }
            });
          } else {
            return res.json({
              success: false,
              message: result.message,
              data: {
                reference,
                amount: transaction.amount,
                status: transaction.status
              }
            });
          }
        } else {
          return res.json({
            success: false,
            message: 'Payment not completed',
            data: {
              reference,
              amount: transaction.amount,
              status: data.status
            }
          });
        }
      } catch (error) {
        console.error('Paystack verification error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to verify payment with Paystack'
        });
      }
    }

    // For failed or other statuses
    return res.json({
      success: false,
      message: `Payment status: ${transaction.status}`,
      data: {
        reference,
        amount: transaction.amount,
        status: transaction.status
      }
    });
  } catch (error) {
    console.error('Verification Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Add this at the top of your file with other requires
const { v4: uuidv4 } = require('uuid'); // You'll need to install this: npm install uuid

/**
 * @route   POST /api/payment/transfer
 * @desc    Transfer money from user wallet to another user with balance tracking
 * @access  Private (requires authentication)
 */
router.post('/transfer', auth, async (req, res) => {
  // Start a mongoose session for transaction integrity
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { recipient, amount, description, pin } = req.body;
    const senderId = req.user.id;
    
    // Validate input
    if (!recipient || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Invalid transfer details. Recipient and amount are required.'
      });
    }
    
    // Convert amount to number
    const transferAmount = parseFloat(amount);
    
    if (isNaN(transferAmount) || transferAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Amount must be a positive number.'
      });
    }
    
    // Find sender
    const sender = await User.findById(senderId).session(session);
    if (!sender) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Sender account not found'
      });
    }
    
    // Check if sender's account is disabled
    if (sender.isDisabled) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        error: 'Account is disabled',
        message: 'Your account has been disabled. Transfers are not allowed.',
        disableReason: sender.disableReason || 'No reason provided'
      });
    }
    
    // Store sender's balance before transaction
    const senderBalanceBefore = sender.walletBalance;
    
    // Check sender's balance
    if (senderBalanceBefore < transferAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        currentBalance: senderBalanceBefore,
        requiredAmount: transferAmount
      });
    }
    
    // Find recipient by email or phone number
    let recipientUser = null;
    
    // Check if recipient is email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    
    if (emailRegex.test(recipient)) {
      recipientUser = await User.findOne({ email: recipient.toLowerCase() }).session(session);
    } else if (phoneRegex.test(recipient)) {
      // Clean phone number format
      const cleanPhone = recipient.replace(/[\s\-\(\)]/g, '');
      recipientUser = await User.findOne({ phoneNumber: cleanPhone }).session(session);
    } else {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient format. Please provide a valid email or phone number.'
      });
    }
    
    if (!recipientUser) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Recipient not found',
        message: 'No user found with the provided email or phone number.'
      });
    }
    
    // Check if recipient's account is disabled
    if (recipientUser.isDisabled) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        error: 'Recipient account is disabled',
        message: 'The recipient account has been disabled and cannot receive transfers.'
      });
    }
    
    // Prevent self-transfer
    if (senderId === recipientUser._id.toString()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to yourself'
      });
    }
    
    // Store recipient's balance before transaction
    const recipientBalanceBefore = recipientUser.walletBalance;
    
    // Generate unique reference
    const reference = `TRF-${uuidv4()}`;
    
    // Calculate balances after transaction
    const senderBalanceAfter = senderBalanceBefore - transferAmount;
    const recipientBalanceAfter = recipientBalanceBefore + transferAmount;
    
    // Create both transactions with proper balance tracking
    const transactionMetadata = {
      senderId: sender._id,
      senderName: sender.name,
      senderEmail: sender.email,
      recipientId: recipientUser._id,
      recipientName: recipientUser.name,
      recipientEmail: recipientUser.email,
      description: description || `Transfer to ${recipientUser.name || recipientUser.email}`
    };
    
    // Create sender transaction record (debit) with balance tracking
    const senderTransaction = new Transaction({
      userId: senderId,
      type: 'transfer',
      amount: transferAmount, // Positive amount for consistency
      balanceBefore: senderBalanceBefore,
      balanceAfter: senderBalanceAfter,
      status: 'completed',
      reference: `${reference}-DEBIT`,
      gateway: 'wallet',
      description: `Transfer to ${recipientUser.name || recipientUser.email}`,
      metadata: {
        ...transactionMetadata,
        transferType: 'sent',
        transferDirection: 'debit'
      }
    });
    
    // Create recipient transaction record (credit) with balance tracking
    const recipientTransaction = new Transaction({
      userId: recipientUser._id,
      type: 'transfer',
      amount: transferAmount,
      balanceBefore: recipientBalanceBefore,
      balanceAfter: recipientBalanceAfter,
      status: 'completed',
      reference: `${reference}-CREDIT`,
      gateway: 'wallet',
      description: `Transfer from ${sender.name || sender.email}`,
      metadata: {
        ...transactionMetadata,
        transferType: 'received',
        transferDirection: 'credit'
      }
    });
    
    // Update balances
    sender.walletBalance = senderBalanceAfter;
    recipientUser.walletBalance = recipientBalanceAfter;
    
    // Save everything within the transaction
    await sender.save({ session });
    await recipientUser.save({ session });
    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Send SMS notifications (outside of database transaction)
    try {
      await sendTransferReceivedSMS(recipientUser, sender, transferAmount, recipientUser.walletBalance);
      await sendTransferSentSMS(sender, recipientUser, transferAmount, sender.walletBalance);
    } catch (smsError) {
      console.error('SMS Error (non-blocking):', smsError);
      // Don't fail the transfer if SMS fails
    }
    
    // Log successful transfer
    console.log(`Transfer successful: ${sender.email} -> ${recipientUser.email}, Amount: ${transferAmount}, Reference: ${reference}`);
    
    // Return success response with balance information
    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        reference: reference,
        amount: transferAmount,
        recipient: {
          id: recipientUser._id,
          username: recipientUser.name,
          email: recipientUser.email,
          identifier: recipient
        },
        sender: {
          id: sender._id,
          username: sender.name,
          email: sender.email,
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderBalanceAfter,
          newBalance: senderBalanceAfter
        },
        balanceChange: {
          sender: senderBalanceAfter - senderBalanceBefore,
          recipient: recipientBalanceAfter - recipientBalanceBefore
        },
        description: description || `Transfer to ${recipientUser.name || recipientUser.email}`,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    
    console.error('Transfer Error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        error: 'Transfer processing conflict',
        message: 'A temporary issue occurred. Please try again.'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Transfer failed',
      message: 'An error occurred while processing the transfer. Please try again.'
    });
  } finally {
    // End session
    session.endSession();
  }
});

/**
 * @route   GET /api/payment/validate-recipient
 * @desc    Validate recipient before transfer
 * @access  Private (requires authentication)
 */
router.get('/validate-recipient', auth, async (req, res) => {
  try {
    const { identifier } = req.query;
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Recipient identifier is required'
      });
    }
    
    // Check if identifier is email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    
    let user = null;
    
    if (emailRegex.test(identifier)) {
      user = await User.findOne({ email: identifier.toLowerCase() })
        .select('name email phoneNumber isDisabled');
    } else if (phoneRegex.test(identifier)) {
      const cleanPhone = identifier.replace(/[\s\-\(\)]/g, '');
      user = await User.findOne({ phoneNumber: cleanPhone })
        .select('name email phoneNumber isDisabled');
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid identifier format. Please provide a valid email or phone number.'
      });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the provided identifier.'
      });
    }
    
    if (user.isDisabled) {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled',
        message: 'This account is disabled and cannot receive transfers.'
      });
    }
    
    // Don't send sensitive information
    res.json({
      success: true,
      data: {
        username: user.name,
        identifier: identifier,
        isValid: true
      }
    });
    
  } catch (error) {
    console.error('Validate Recipient Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: 'Unable to validate recipient. Please try again.'
    });
  }
});

/**
 * @route   GET /api/payment/transfer-history
 * @desc    Get user's transfer history with balance tracking
 * @access  Private (requires authentication)
 */
router.get('/transfer-history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type = 'all' } = req.query;
    
    // Build filter
    const filter = {
      userId: userId,
      type: 'transfer'
    };
    
    // Filter by transfer type (sent/received)
    if (type === 'sent') {
      filter['metadata.transferDirection'] = 'debit';
    } else if (type === 'received') {
      filter['metadata.transferDirection'] = 'credit';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get transfers
    const transfers = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count
    const totalCount = await Transaction.countDocuments(filter);
    
    // Format transfers with balance information
    const formattedTransfers = transfers.map(transfer => ({
      id: transfer._id,
      type: transfer.metadata?.transferDirection === 'debit' ? 'sent' : 'received',
      amount: transfer.amount,
      balanceBefore: transfer.balanceBefore,
      balanceAfter: transfer.balanceAfter,
      balanceChange: transfer.balanceAfter - transfer.balanceBefore,
      description: transfer.description,
      reference: transfer.reference,
      status: transfer.status,
      createdAt: transfer.createdAt,
      metadata: transfer.metadata,
      otherParty: transfer.metadata?.transferDirection === 'debit' 
        ? {
            name: transfer.metadata?.recipientName,
            email: transfer.metadata?.recipientEmail
          }
        : {
            name: transfer.metadata?.senderName,
            email: transfer.metadata?.senderEmail
          }
    }));
    
    res.json({
      success: true,
      data: {
        transfers: formattedTransfers,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Transfer History Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer history'
    });
  }
});

// Get all transactions for a user with balance tracking
router.get('/user-transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, type, page = 1, limit = 10 } = req.query;
    
    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID' 
      });
    }
    
    // Build query filter
    const filter = { userId };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Add type filter if provided
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find transactions
    const transactions = await Transaction.find(filter)
      .populate('relatedPurchaseId', 'phoneNumber network capacity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);
    
    // Format transactions with balance information
    const formattedTransactions = transactions.map(tx => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      balanceChange: tx.balanceAfter - tx.balanceBefore,
      isCredit: (tx.balanceAfter - tx.balanceBefore) > 0,
      status: tx.status,
      reference: tx.reference,
      gateway: tx.gateway,
      description: tx.description,
      relatedPurchase: tx.relatedPurchaseId,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
      processing: tx.processing
    }));
    
    return res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Get Transactions Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify pending transaction by ID with balance information
router.post('/verify-pending-transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Check if transaction is pending
    if (transaction.status !== 'pending') {
      return res.json({
        success: false,
        message: `Transaction is already ${transaction.status}`,
        data: {
          transactionId,
          reference: transaction.reference,
          amount: transaction.amount,
          status: transaction.status,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          balanceChange: transaction.status === 'completed' ? transaction.balanceAfter - transaction.balanceBefore : 0
        }
      });
    }
    
    // Verify with Paystack
    try {
      const paystackResponse = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${transaction.reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const { data } = paystackResponse.data;
      
      // If payment is successful
      if (data.status === 'success') {
        // Process the payment using our common function
        const result = await processSuccessfulPayment(transaction.reference);
        
        if (result.success) {
          // Get updated transaction
          const updatedTransaction = await Transaction.findById(transactionId);
          
          return res.json({
            success: true,
            message: 'Transaction verified and completed successfully',
            data: {
              transactionId,
              reference: updatedTransaction.reference,
              amount: updatedTransaction.amount,
              status: 'completed',
              balanceBefore: updatedTransaction.balanceBefore,
              balanceAfter: updatedTransaction.balanceAfter,
              balanceChange: updatedTransaction.balanceAfter - updatedTransaction.balanceBefore,
              newBalance: result.newBalance
            }
          });
        } else {
          return res.json({
            success: false,
            message: result.message,
            data: {
              transactionId,
              reference: transaction.reference,
              amount: transaction.amount,
              status: transaction.status
            }
          });
        }
      } else if (data.status === 'failed') {
        // Mark transaction as failed
        transaction.status = 'failed';
        await transaction.save();
        
        return res.json({
          success: false,
          message: 'Payment failed',
          data: {
            transactionId,
            reference: transaction.reference,
            amount: transaction.amount,
            status: 'failed',
            balanceBefore: transaction.balanceBefore,
            balanceAfter: transaction.balanceBefore, // No change for failed transaction
            balanceChange: 0
          }
        });
      } else {
        // Still pending on Paystack side
        return res.json({
          success: false,
          message: `Payment status on gateway: ${data.status}`,
          data: {
            transactionId,
            reference: transaction.reference,
            amount: transaction.amount,
            status: transaction.status
          }
        });
      }
    } catch (error) {
      console.error('Paystack verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify payment with Paystack'
      });
    }
    
  } catch (error) {
    console.error('Verify Pending Transaction Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;