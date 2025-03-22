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
      return res.status(400).json({ error: 'Invalid deposit details' });
    }

    // Find user to get their email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
    const paystackAmount = totalAmountWithFee ? 
      parseFloat(totalAmountWithFee) * 100 : // If provided, use total with fee
      parseFloat(amount) * 100; // Fallback to base amount if no total provided
    
    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: email || user.email,
        amount: paystackAmount, // Convert to kobo (smallest currency unit)
        currency: 'GHS',
        reference,
        callback_url: `https://data-mart.vercel.app/payment/callback?reference=${reference}`
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
      message: 'Deposit initiated',
      paystackUrl: paystackResponse.data.data.authorization_url,
      reference
    });

  } catch (error) {
    console.error('Deposit Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle Paystack Webhook (Payment Confirmation)
router.post('/paystack/webhook', async (req, res) => {
  try {
    const secret = PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify Paystack signature
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference } = event.data;

      // Find transaction by reference
      const transaction = await Transaction.findOne({ reference });

      if (!transaction || transaction.status !== 'pending') {
        return res.status(400).json({ error: 'Transaction not found or already processed' });
      }

      // Mark transaction as completed
      transaction.status = 'completed';
      await transaction.save();

      // Update user's wallet balance with the original amount (without fee)
      const user = await User.findById(transaction.userId);
      if (user) {
        user.walletBalance += transaction.amount; 
        await user.save();
      }

      return res.json({ message: 'Deposit successful' });
    }

    return res.status(400).json({ error: 'Unhandled event' });

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

module.exports = router;