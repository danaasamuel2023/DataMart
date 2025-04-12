const express = require('express');
const router = express.Router();
const { Transaction, User } = require('../schema/schema');
const axios = require('axios');
const crypto = require('crypto');

// Paystack configuration
const PAYSTACK_SECRET_KEY = 'sk_live_0fba72fb9c4fc71200d2e0cdbb4f2b37c1de396c'; 
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initiate Deposit
// Initiate Deposit
// Initiate Deposit
// Initiate Deposit with approved user list check
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

    // Get the list of approved users
    // You can either maintain this list in the database or fetch it as needed
    const approvedUsers = await User.find({ 
      $or: [
        { approvalStatus: 'approved' },
        { approvalStatus: { $exists: false } } // Include legacy users without the field
      ]
    }).select('_id');
    
    // Convert to array of IDs for easier checking
    const approvedUserIds = approvedUsers.map(user => user._id.toString());
    
    // Check if the userId making the deposit is in the approved list
    if (!approvedUserIds.includes(userId.toString())) {
      return res.status(403).json({
        success: false,
        error: 'Account not approved',
        message: 'Your account is not approved for deposits. Please contact support.',
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

      // Find transaction by reference
      const transaction = await Transaction.findOne({ reference });

      if (!transaction) {
        console.error(`Transaction not found for reference: ${reference}`);
        return res.status(400).json({ error: 'Transaction not found' });
      }

      if (transaction.status !== 'pending') {
        console.log(`Transaction ${reference} already processed, status: ${transaction.status}`);
        return res.json({ message: 'Transaction already processed' });
      }

      // Mark transaction as completed
      transaction.status = 'completed';
      await transaction.save();
      console.log(`Transaction ${reference} marked as completed`);

      // Update user's wallet balance with the original amount (without fee)
      const user = await User.findById(transaction.userId);
      if (user) {
        user.walletBalance += transaction.amount; 
        await user.save();
        console.log(`User ${user._id} wallet updated, new balance: ${user.walletBalance}`);
      } else {
        console.error(`User not found for transaction ${reference}`);
      }

      return res.json({ message: 'Deposit successful' });
    } else {
      console.log(`Unhandled event type: ${event.event}`);
      return res.json({ message: 'Event received' });
    }

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
          // Update transaction status
          transaction.status = 'completed';
          await transaction.save();

          // Update user's wallet balance with the original amount (without fee)
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

// NEW ROUTE: Get all transactions for a user
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

// NEW ROUTE: Verify pending transaction by ID
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
        // Update transaction status
        transaction.status = 'completed';
        await transaction.save();
        
        // Update user's wallet balance
        const user = await User.findById(transaction.userId);
        if (user) {
          user.walletBalance += transaction.amount;
          await user.save();
        }
        
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

module.exports = router;