const express = require('express');
const router = express.Router();
const { Transaction, User } = require('../schema/schema');
const axios = require('axios');
const crypto = require('crypto');

// Paystack configuration
const PAYSTACK_SECRET_KEY = 'sk_live_0fba72fb9c4fc71200d2e0cdbb4f2b37c1de396c'; 
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

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
      user.walletBalance += transaction.amount; 
      await user.save();
      console.log(`User ${user._id} wallet updated, new balance: ${user.walletBalance}`);
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

module.exports = router;