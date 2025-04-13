const express = require('express');
const router = express.Router();
const { Transaction, User } = require('../schema/schema');
const axios = require('axios');
const crypto = require('crypto');

// Moolre configuration
const MOOLRE_API_USER = 'datamart'; 
const MOOLRE_API_PUBKEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyaWQiOjEwNjYxMSwiZXhwIjoxOTI1MDA5OTk5fQ.YXgxzLhfhtTCd_R5b7uenbv0guNwr8RJ63X4NcP3JGw'; // Your Moolre public API key
const MOOLRE_API_KEY = 'HiYwjNe9XUWlOYVzMYwkDCryV9JTziYxMsn5YrNOEyZHyrVjuZIJDHHK5OfThpDZ'; // Your Moolre private API key
const MOOLRE_ACCOUNT_NUMBER = '10661106047264'; // Your Moolre account number
const MOOLRE_BASE_URL = 'https://api.moolre.com';

// Initiate Deposit via Moolre (Mobile Money)
router.post('/depositsmoolre', async (req, res) => {
  try {
    const { userId, amount, phoneNumber, network, currency = 'GHS' } = req.body;

    // Validate input
    if (!userId || !amount || amount <= 0 || !phoneNumber) {
      return res.status(400).json({ error: 'Invalid deposit details' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine channel ID based on network selection
    let channel;
    switch (network.toLowerCase()) {
      case 'mtn':
        channel = 13;
        break;
      case 'vodafone':
        channel = 6;
        break;
      case 'airtel-tigo':
      case 'at':
        channel = 7;
        break;
      default:
        return res.status(400).json({ error: 'Invalid network selected' });
    }

    // Generate a unique transaction reference
    const reference = `DEP-${crypto.randomBytes(6).toString('hex')}-${Date.now()}`;
    const externalRef = `REF-${crypto.randomBytes(6).toString('hex')}`;

    // Create a pending transaction
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount: parseFloat(amount),
      status: 'pending',
      reference,
      gateway: 'moolre',
      metadata: {
        phoneNumber,
        network,
        currency,
        externalRef
      }
    });

    await transaction.save();

    // Step 1: Initiate the payment request
    const paymentResponse = await axios.post(
      `${MOOLRE_BASE_URL}/open/transact/payment`,
      {
        type: 1, // ID for account status function
        channel, // Network channel ID
        currency, // GHS or NGN
        payer: phoneNumber, // Customer's mobile money number
        amount: parseFloat(amount).toFixed(2), // Format amount with 2 decimal places
        externalref: externalRef, // Unique reference
        reference: `Deposit to ${user.username || 'wallet'}`, // Transaction description
        accountnumber: MOOLRE_ACCOUNT_NUMBER // Your Moolre account
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-USER': MOOLRE_API_USER,
          'X-API-PUBKEY': MOOLRE_API_PUBKEY
        }
      }
    );

    // Check if OTP verification is required (code TP14)
    if (paymentResponse.data.status === 1 && paymentResponse.data.code === 'TP14') {
      // Update transaction with OTP requirement
      transaction.metadata.requiresOtp = true;
      await transaction.save();

      return res.json({
        success: true,
        message: 'OTP verification required',
        requiresOtp: true,
        reference,
        externalRef
      });
    } 
    // If direct payment request was sent without OTP requirement
    else if (paymentResponse.data.status === 1) {
      return res.json({
        success: true,
        message: 'Deposit initiated. Please complete payment on your mobile phone.',
        reference,
        externalRef
      });
    } 
    else {
      // Failed to initiate payment
      transaction.status = 'failed';
      transaction.metadata.failureReason = paymentResponse.data.message;
      await transaction.save();

      return res.status(400).json({
        success: false,
        message: paymentResponse.data.message,
        reference
      });
    }
  } catch (error) {
    console.error('Deposit Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit OTP for verification
router.post('/verify-otp', async (req, res) => {
  try {
    const { reference, otpCode, phoneNumber } = req.body;

    if (!reference || !otpCode) {
      return res.status(400).json({ error: 'Reference and OTP code are required' });
    }

    // Find transaction
    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        error: `Transaction is already ${transaction.status}` 
      });
    }

    // Submit OTP to Moolre
    const otpResponse = await axios.post(
      `${MOOLRE_BASE_URL}/open/transact/payment`,
      {
        type: 1,
        channel: transaction.metadata.network === 'mtn' ? 13 : 
                (transaction.metadata.network === 'vodafone' ? 6 : 7),
        currency: transaction.metadata.currency,
        payer: transaction.metadata.phoneNumber || phoneNumber,
        amount: transaction.amount.toFixed(2),
        externalref: transaction.metadata.externalRef,
        otpcode: otpCode, // Include the OTP code here
        reference: `Deposit to ${transaction.userId}`,
        accountnumber: MOOLRE_ACCOUNT_NUMBER
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-USER': MOOLRE_API_USER,
          'X-API-PUBKEY': MOOLRE_API_PUBKEY
        }
      }
    );

    // If OTP verification was successful, initiate the final payment request
    if (otpResponse.data.status === 1) {
      const finalPaymentResponse = await axios.post(
        `${MOOLRE_BASE_URL}/open/transact/payment`,
        {
          type: 1,
          channel: transaction.metadata.network === 'mtn' ? 13 : 
                  (transaction.metadata.network === 'vodafone' ? 6 : 7),
          currency: transaction.metadata.currency,
          payer: transaction.metadata.phoneNumber || phoneNumber,
          amount: transaction.amount.toFixed(2),
          externalref: transaction.metadata.externalRef,
          reference: `Deposit to ${transaction.userId}`,
          accountnumber: MOOLRE_ACCOUNT_NUMBER
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-USER': MOOLRE_API_USER,
            'X-API-PUBKEY': MOOLRE_API_PUBKEY
          }
        }
      );

      if (finalPaymentResponse.data.status === 1) {
        return res.json({
          success: true,
          message: 'OTP verified. Please complete payment on your mobile phone.',
          reference
        });
      } else {
        return res.status(400).json({
          success: false,
          message: finalPaymentResponse.data.message,
          reference
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: otpResponse.data.message,
        reference
      });
    }
  } catch (error) {
    console.error('OTP Verification Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook to receive payment notifications from Moolre
router.post('/moolre/webhook', async (req, res) => {
  try {
    // Log incoming webhook data
    console.log('Moolre webhook received:', JSON.stringify(req.body));

    // Validate webhook signature if Moolre provides one
    // This depends on Moolre's implementation
    
    const { externalref, status, amount } = req.body;
    
    if (!externalref) {
      return res.status(400).json({ error: 'Missing external reference' });
    }

    // Find transaction by external reference
    const transaction = await Transaction.findOne({ 'metadata.externalRef': externalref });
    
    if (!transaction) {
      console.error(`Transaction not found for external reference: ${externalref}`);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      console.log(`Transaction ${externalref} already processed, status: ${transaction.status}`);
      return res.json({ message: 'Transaction already processed' });
    }

    // Check payment status from webhook
    if (status === 'success' || status === 'completed') {
      // Mark transaction as completed
      transaction.status = 'completed';
      await transaction.save();
      
      // Update user's wallet balance
      const user = await User.findById(transaction.userId);
      if (user) {
        user.walletBalance += transaction.amount;
        await user.save();
        console.log(`User ${user._id} wallet updated, new balance: ${user.walletBalance}`);
      } else {
        console.error(`User not found for transaction ${externalref}`);
      }
      
      return res.json({ message: 'Deposit successful' });
    } else if (status === 'failed') {
      transaction.status = 'failed';
      await transaction.save();
      
      return res.json({ message: 'Deposit failed' });
    } else {
      // For any other status
      transaction.metadata.moolreStatus = status;
      await transaction.save();
      
      return res.json({ message: 'Status update received' });
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate Payment ID for recurring deposits
router.post('/generate-payment-id', async (req, res) => {
  try {
    const { userId, phone, name } = req.body;
    
    // Validate input
    if (!userId || !phone) {
      return res.status(400).json({ error: 'User ID and phone number are required' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Format phone number to include country code if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+233${phone.replace(/^0/, '')}`;
    
    // Generate a unique external reference
    const externalRef = `GEN-${crypto.randomBytes(6).toString('hex')}`;
    
    // Request payment ID from Moolre
    const response = await axios.post(
      `${MOOLRE_BASE_URL}/open/account/generate`,
      {
        type: 2,
        currency: 'GHS', // or 'NGN' for Nigeria
        accountnumber: MOOLRE_ACCOUNT_NUMBER,
        phone: formattedPhone,
        name: name || user.username || userId,
        externalref: externalRef
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-USER': MOOLRE_API_USER,
          'X-API-PUBKEY': MOOLRE_API_PUBKEY
        }
      }
    );
    
    if (response.data.status === 1) {
      // Store payment ID in user profile for future reference
      user.paymentId = response.data.data.paymentid;
      await user.save();
      
      return res.json({
        success: true,
        message: 'Payment ID generated successfully',
        data: {
          paymentId: response.data.data.paymentid,
          dialCode: `*203*${response.data.data.paymentid}#`,
          instructions: 'Dial this code on your phone to make payments'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message
      });
    }
  } catch (error) {
    console.error('Generate Payment ID Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/// Verify transaction status with Moolre
router.get('/verify-payments', async (req, res) => {
  try {
    const { reference } = req.query;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference is required'
      });
    }
    
    // Find transaction
    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // If transaction is already completed
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
    
    // For pending transactions, check with Moolre using the correct endpoint and format
    try {
      const statusResponse = await axios.post(
        `${MOOLRE_BASE_URL}/open/transact/status`,
        {
          type: 1,
          idtype: 1,
          id: transaction.metadata.externalRef,
          accountnumber: MOOLRE_ACCOUNT_NUMBER
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-USER': MOOLRE_API_USER,
            'X-API-PUBKEY': MOOLRE_API_PUBKEY
          }
        }
      );
      
      if (statusResponse.data.status === 1) {
        const txStatus = statusResponse.data.data.txstatus;
        
        // Check transaction status (1 = Successful, 0 = Pending, 2 = Failed)
        if (txStatus === 1) {
          // Update transaction status
          transaction.status = 'completed';
          await transaction.save();
          
          // Update user wallet
          const user = await User.findById(transaction.userId);
          if (user) {
            user.walletBalance += transaction.amount;
            await user.save();
          }
          
          return res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
              reference,
              amount: transaction.amount,
              status: 'completed'
            }
          });
        } else if (txStatus === 2) {
          transaction.status = 'failed';
          await transaction.save();
          
          return res.json({
            success: false,
            message: 'Payment failed',
            data: {
              reference,
              amount: transaction.amount,
              status: 'failed'
            }
          });
        } else {
          // Status is still pending
          return res.json({
            success: false,
            message: 'Payment is still pending',
            data: {
              reference,
              amount: transaction.amount,
              status: 'pending'
            }
          });
        }
      } else {
        // API call was unsuccessful
        return res.json({
          success: false,
          message: statusResponse.data.message || 'Failed to verify with payment provider',
          data: {
            reference,
            amount: transaction.amount,
            status: transaction.status
          }
        });
      }
    } catch (error) {
      console.error('Moolre verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify payment with Moolre'
      });
    }
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
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Build filter
    const filter = { userId };
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find transactions
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
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

module.exports = router;