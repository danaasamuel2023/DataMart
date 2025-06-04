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
  API_KEY: process.env.MNOTIFY_API_KEY || 'your_mnotify_api_key_here',
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

    // Create a pending transaction - store the original amount
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount, // This is the BASE amount WITHOUT fee that will be added to wallet
      status: 'pending',
      reference,
      gateway: 'paystack'
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
// Process a successful payment and update user wallet
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
    // Now safely update the transaction status
    transaction.status = 'completed';
    await transaction.save();
    console.log(`Transaction ${reference} marked as completed`);

    // Update user's wallet balance with the original amount (without fee)
    const user = await User.findById(transaction.userId);
    if (user) {
      const previousBalance = user.walletBalance;
      user.walletBalance += transaction.amount; 
      await user.save();
      console.log(`User ${user._id} wallet updated, new balance: ${user.walletBalance}`);
      
      // Send SMS notification for successful deposit
      await sendDepositSMS(user, transaction.amount, user.walletBalance);
      
      return { success: true, message: 'Deposit successful' };
    } else {
      console.error(`User not found for transaction ${reference}`);
      return { success: false, message: 'User not found' };
    }
  } catch (error) {
    // If there's an error, release the processing lock
    transaction.processing = false;
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
          status: transaction.status
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
            return res.json({
              success: true,
              message: 'Payment verified successfully',
              data: {
                reference,
                amount: transaction.amount,
                status: 'completed'
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

// Get all transactions for a user
router.get('/user-transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
    // Build query filter
    const filter = { userId };
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find transactions
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);
    
    return res.json({
      success: true,
      data: {
        transactions,
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

// Verify pending transaction by ID
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
          status: transaction.status
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
          return res.json({
            success: true,
            message: 'Transaction verified and completed successfully',
            data: {
              transactionId,
              reference: transaction.reference,
              amount: transaction.amount,
              status: 'completed'
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
            status: 'failed'
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

/**
 * @route   POST /api/payment/transfer
 * @desc    Transfer money from user wallet to another user
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
      return res.status(400).json({
        success: false,
        error: 'Invalid transfer details. Recipient and amount are required.'
      });
    }
    
    // Convert amount to number
    const transferAmount = parseFloat(amount);
    
    if (isNaN(transferAmount) || transferAmount <= 0) {
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
    
    // Check sender's balance (updated to use walletBalance)
    if (sender.walletBalance < transferAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        currentBalance: sender.walletBalance,
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
    
    // Generate unique reference for this transfer
    const reference = `TRF-${crypto.randomBytes(8).toString('hex')}-${Date.now()}`;
    
    // Create sender transaction record (debit)
    const senderTransaction = new Transaction({
      userId: senderId,
      type: 'transfer',
      amount: -transferAmount, // Negative for debit
      status: 'completed',
      reference,
      gateway: 'wallet'
    });
    
    // Create recipient transaction record (credit)
    const recipientTransaction = new Transaction({
      userId: recipientUser._id,
      type: 'transfer',
      amount: transferAmount, // Positive for credit
      status: 'completed',
      reference,
      gateway: 'wallet'
    });
    
    // Save both transactions
    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });
    
    // Update sender's wallet
    sender.walletBalance -= transferAmount;
    await sender.save({ session });
    
    // Update recipient's wallet
    recipientUser.walletBalance += transferAmount;
    await recipientUser.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Send SMS notifications (outside of database transaction)
    // Send to recipient about received money
    await sendTransferReceivedSMS(recipientUser, sender, transferAmount, recipientUser.walletBalance);
    
    // Optionally send confirmation to sender
    await sendTransferSentSMS(sender, recipientUser, transferAmount, sender.walletBalance);
    
    // Log successful transfer
    console.log(`Transfer successful: ${sender.email} -> ${recipientUser.email}, Amount: ${transferAmount}`);
    
    // Return success response
    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        reference,
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
          newBalance: sender.walletBalance
        },
        description: description || `Transfer to ${recipientUser.name || recipientUser.email}`,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    
    console.error('Transfer Error:', error);
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
 * @desc    Get user's transfer history
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
      filter.amount = { $lt: 0 }; // Negative amounts are debits (sent)
    } else if (type === 'received') {
      filter.amount = { $gt: 0 }; // Positive amounts are credits (received)
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
    
    // Format transfers with additional info
    const formattedTransfers = transfers.map(transfer => ({
      id: transfer._id,
      type: transfer.amount < 0 ? 'sent' : 'received',
      amount: Math.abs(transfer.amount),
      description: transfer.description,
      reference: transfer.reference,
      status: transfer.status,
      createdAt: transfer.createdAt,
      metadata: transfer.metadata,
      balanceAfter: transfer.balanceAfter
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

module.exports = router;