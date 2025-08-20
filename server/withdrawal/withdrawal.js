const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { 
  User, 
  Withdrawal, 
  Transaction,
  BankAccount,
  WithdrawalRestriction,
  UserDailyEarnings
} = require('../schema/schema');
const { auth } = require('../middleware/page');
const paystackService = require('../utils/paystack');

// ============= HELPER FUNCTIONS =============

// Check withdrawal eligibility
async function checkWithdrawalEligibility(userId, amount) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { eligible: false, reason: 'User not found' };
    }

    if (user.walletBalance < amount) {
      return { eligible: false, reason: 'Insufficient balance' };
    }

    if (amount < 10) {
      return { eligible: false, reason: 'Minimum withdrawal is GHS 10' };
    }

    if (amount > 10000) {
      return { eligible: false, reason: 'Maximum withdrawal is GHS 10,000' };
    }

    // Check if already withdrawn today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayWithdrawal = await Withdrawal.findOne({
      userId,
      createdAt: { $gte: today },
      status: { $in: ['completed', 'processing', 'pending'] }
    });

    if (todayWithdrawal) {
      return { 
        eligible: false, 
        reason: 'You can only withdraw once per day. Try again tomorrow.' 
      };
    }

    return { eligible: true };
  } catch (error) {
    console.error('Eligibility check error:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

// Generate reference
function generateReference() {
  return `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ============= BANK ACCOUNT ROUTES =============

// Get list of banks
router.get('/banks', auth, async (req, res) => {
  try {
    const banks = await paystackService.getBanks();
    
    if (!banks.success) {
      return res.status(400).json({
        success: false,
        message: banks.error
      });
    }

    res.json({
      success: true,
      banks: banks.data
    });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch banks' 
    });
  }
});

// Verify bank account
router.post('/bank/verify', auth, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Account number and bank code required'
      });
    }

    const verification = await paystackService.verifyAccountNumber(
      accountNumber, 
      bankCode
    );
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.error
      });
    }

    res.json({
      success: true,
      data: verification.data
    });
  } catch (error) {
    console.error('Verify account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify account' 
    });
  }
});

// Add bank account
router.post('/bank/add', auth, async (req, res) => {
  try {
    const { accountNumber, bankCode, bankName } = req.body;
    const userId = req.user.id;

    // Verify account first
    const verification = await paystackService.verifyAccountNumber(
      accountNumber, 
      bankCode
    );
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: 'Account verification failed'
      });
    }

    // Check if already exists
    const existing = await BankAccount.findOne({
      userId,
      accountNumber,
      bankCode
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bank account already exists'
      });
    }

    // Create bank account
    const bankAccount = await BankAccount.create({
      userId,
      accountName: verification.data.account_name,
      accountNumber,
      bankCode,
      bankName,
      isVerified: true
    });

    res.json({
      success: true,
      message: 'Bank account added successfully',
      bankAccount
    });
  } catch (error) {
    console.error('Add bank error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add bank account' 
    });
  }
});

// Get user's bank accounts
router.get('/bank/list', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const accounts = await BankAccount.find({ userId })
      .select('-recipientCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('List banks error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bank accounts' 
    });
  }
});

// Delete bank account
router.delete('/bank/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    const account = await BankAccount.findOneAndDelete({ 
      _id: accountId, 
      userId 
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    res.json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    console.error('Delete bank error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete bank account' 
    });
  }
});

// ============= WITHDRAWAL ROUTES =============

// Check withdrawal eligibility
router.get('/check-eligibility', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const eligibility = await checkWithdrawalEligibility(
      userId, 
      parseFloat(amount)
    );
    
    const user = await User.findById(userId);
    
    res.json({
      success: eligibility.eligible,
      message: eligibility.reason,
      data: {
        eligible: eligibility.eligible,
        currentBalance: user.walletBalance,
        requestedAmount: parseFloat(amount)
      }
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check eligibility' 
    });
  }
});

// Initiate withdrawal
router.post('/initiate', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankAccountId } = req.body;

    // Validate input
    if (!amount || !bankAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and bank account required'
      });
    }

    // Check eligibility
    const eligibility = await checkWithdrawalEligibility(userId, amount);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason
      });
    }

    // Get bank account
    const bankAccount = await BankAccount.findOne({ 
      _id: bankAccountId, 
      userId 
    });
    
    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    // Calculate fee (1% or GHS 1 minimum)
    const percentageFee = amount * 0.01;
    const minimumFee = 1;
    const fee = Math.max(percentageFee, minimumFee);
    const netAmount = amount - fee;

    // Generate reference
    const reference = generateReference();

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      userId,
      amount,
      fee,
      netAmount,
      accountName: bankAccount.accountName,
      accountNumber: bankAccount.accountNumber,
      bankCode: bankAccount.bankCode,
      bankName: bankAccount.bankName,
      reference,
      status: 'pending'
    });

    // Deduct from wallet
    const user = await User.findById(userId);
    user.walletBalance -= amount;
    await user.save();

    // Create transaction record
    await Transaction.create({
      userId,
      type: 'withdrawal',
      amount: -amount,
      description: `Withdrawal to ${bankAccount.bankName}`,
      reference,
      status: 'pending',
      balanceAfter: user.walletBalance
    });

    // Process with Paystack (optional - can be manual)
    // const paystackResult = await paystackService.processWithdrawal(withdrawal, bankAccount);

    res.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      data: {
        withdrawalId: withdrawal._id,
        reference: withdrawal.reference,
        amount: withdrawal.amount,
        fee: withdrawal.fee,
        netAmount: withdrawal.netAmount,
        status: withdrawal.status
      }
    });
  } catch (error) {
    console.error('Initiate withdrawal error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate withdrawal' 
    });
  }
});

// Get withdrawal status
router.get('/status/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const withdrawalId = req.params.id;

    const withdrawal = await Withdrawal.findOne({ 
      _id: withdrawalId, 
      userId 
    });
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    res.json({
      success: true,
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        fee: withdrawal.fee,
        netAmount: withdrawal.netAmount,
        status: withdrawal.status,
        accountName: withdrawal.accountName,
        bankName: withdrawal.bankName,
        reference: withdrawal.reference,
        createdAt: withdrawal.createdAt
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get withdrawal status' 
    });
  }
});

// Get withdrawal history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments(query);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get withdrawal history' 
    });
  }
});

// ============= EARNINGS ROUTES =============

// Get earnings summary
router.get('/earnings/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;

    const endDate = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const earnings = await UserDailyEarnings.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: '$totalOrders' },
          totalRevenue: { $sum: '$totalRevenue' },
          totalProfit: { $sum: '$totalProfit' },
          totalCommission: { $sum: '$commission' }
        }
      }
    ]);

    const user = await User.findById(userId);
    
    res.json({
      success: true,
      currentBalance: user.walletBalance,
      earnings: earnings[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalCommission: 0
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get earnings summary' 
    });
  }
});

// Get daily earnings
router.get('/earnings/daily', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const dailyEarnings = await UserDailyEarnings.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    const totals = dailyEarnings.reduce((acc, day) => ({
      orders: acc.orders + day.totalOrders,
      revenue: acc.revenue + day.totalRevenue,
      profit: acc.profit + day.totalProfit,
      commission: acc.commission + day.commission
    }), { orders: 0, revenue: 0, profit: 0, commission: 0 });

    res.json({
      success: true,
      dailyEarnings,
      totals
    });
  } catch (error) {
    console.error('Get daily earnings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get daily earnings' 
    });
  }
});

// Get weekly earnings
router.get('/earnings/weekly', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const weeklyData = [];
    
    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekEarnings = await UserDailyEarnings.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),
            date: { $gte: weekStart, $lte: weekEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: '$totalOrders' },
            totalRevenue: { $sum: '$totalRevenue' },
            totalProfit: { $sum: '$totalProfit' },
            totalCommission: { $sum: '$commission' }
          }
        }
      ]);

      weeklyData.push({
        weekNumber: i + 1,
        weekStart,
        weekEnd,
        data: weekEarnings[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalCommission: 0
        }
      });
    }

    res.json({
      success: true,
      weeks: weeklyData
    });
  } catch (error) {
    console.error('Get weekly earnings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get weekly earnings' 
    });
  }
});

// ============= ADMIN ROUTES =============

// Process withdrawal (Admin only)
router.post('/admin/process/:id', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { status, notes } = req.body;
    const withdrawalId = req.params.id;

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    withdrawal.status = status;
    if (notes) withdrawal.notes = notes;
    if (status === 'completed') {
      withdrawal.processedAt = new Date();
    }
    await withdrawal.save();

    // Update transaction
    await Transaction.findOneAndUpdate(
      { reference: withdrawal.reference },
      { status }
    );

    // If failed, refund user
    if (status === 'failed') {
      await User.findByIdAndUpdate(withdrawal.userId, {
        $inc: { walletBalance: withdrawal.amount }
      });
    }

    res.json({
      success: true,
      message: `Withdrawal ${status}`,
      withdrawal
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process withdrawal' 
    });
  }
});

// Get all withdrawals (Admin only)
router.get('/admin/all', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments(query);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Admin get withdrawals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get withdrawals' 
    });
  }
});

module.exports = router;