const express = require('express');
const router = express.Router();
const auth = require('../middlewareUser/middleware');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import the required models
const { User, Transaction } = require('../schema/schema'); 
const Transfer = require('../TransferSchema/Transfer.js');

// 1. WORKER ROUTE - Process MoMo Payment with balance tracking
router.post('/process-momo', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { momoReference, customerPhone, customerName, amount } = req.body;
    
    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Check if worker - using req.user._id instead of req.user.id
    const worker = await User.findById(req.user._id).session(session);
    if (!worker || (worker.role !== 'worker' && worker.role !== 'admin')) {
      await session.abortTransaction();
      return res.status(403).json({ error: 'Only workers can process transfers' });
    }
    
    // Store worker's balance before transaction
    const workerBalanceBefore = worker.walletBalance;
    
    // Check if worker has sufficient balance
    if (workerBalanceBefore < transferAmount) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Insufficient wallet balance', 
        workerBalance: workerBalanceBefore,
        requiredAmount: transferAmount 
      });
    }
    
    // Check if reference already used
    const existingTransfer = await Transfer.findOne({ momoReference }).session(session);
    if (existingTransfer) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'This reference has already been used' });
    }
    
    // Find customer
    const customer = await User.findOne({ phoneNumber: customerPhone }).session(session);
    if (!customer) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Store customer's balance before transaction
    const customerBalanceBefore = customer.walletBalance;
    
    // Calculate balances after transaction
    const workerBalanceAfter = workerBalanceBefore - transferAmount;
    const customerBalanceAfter = customerBalanceBefore + transferAmount;
    
    // Generate unique transaction reference
    const transactionReference = `MOMO-${uuidv4()}`;
    
    // Create transaction metadata
    const transactionMetadata = {
      momoReference,
      workerId: worker._id,
      workerName: worker.name,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customerPhone,
      transferType: 'momo_transfer'
    };
    
    // Create worker transaction record (debit) with balance tracking
    const workerTransaction = new Transaction({
      userId: worker._id,
      type: 'transfer',
      amount: transferAmount,
      balanceBefore: workerBalanceBefore,
      balanceAfter: workerBalanceAfter,
      status: 'completed',
      reference: `${transactionReference}-WORKER-DEBIT`,
      gateway: 'momo',
      description: `MoMo transfer to ${customer.name} (${customerPhone})`,
      metadata: {
        ...transactionMetadata,
        direction: 'debit',
        role: 'worker'
      }
    });
    
    // Create customer transaction record (credit) with balance tracking
    const customerTransaction = new Transaction({
      userId: customer._id,
      type: 'deposit',
      amount: transferAmount,
      balanceBefore: customerBalanceBefore,
      balanceAfter: customerBalanceAfter,
      status: 'completed',
      reference: `${transactionReference}-CUSTOMER-CREDIT`,
      gateway: 'momo',
      description: `MoMo deposit via ${worker.name}`,
      metadata: {
        ...transactionMetadata,
        direction: 'credit',
        role: 'customer'
      }
    });
    
    // Create transfer record for reference tracking
    const transfer = new Transfer({
      momoReference,
      customerPhone,
      customerName: customerName || customer.name,
      workerId: worker._id,
      workerName: worker.name,
      amount: transferAmount,
      status: 'completed',
      transactionReference: transactionReference
    });
    
    // Update balances
    worker.walletBalance = workerBalanceAfter;
    customer.walletBalance = customerBalanceAfter;
    
    // Save all changes within transaction
    await workerTransaction.save({ session });
    await customerTransaction.save({ session });
    await transfer.save({ session });
    await worker.save({ session });
    await customer.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Send SMS to customer (outside of database transaction)
    try {
      const message = `Hello ${customer.name}, you have received GHS ${transferAmount.toFixed(2)} in your wallet via MoMo. Reference: ${momoReference}. New balance: GHS ${customerBalanceAfter.toFixed(2)}`;
      // await sendSMS(customerPhone, message);
    } catch (smsError) {
      console.error('SMS Error:', smsError);
      // Don't fail the transfer if SMS fails
    }
    
    res.json({
      success: true,
      message: 'Transfer processed successfully',
      data: {
        reference: momoReference,
        transactionReference: transactionReference,
        amount: transferAmount,
        customerName: customer.name,
        customerNewBalance: customerBalanceAfter,
        workerNewBalance: workerBalanceAfter,
        balanceChanges: {
          worker: {
            before: workerBalanceBefore,
            after: workerBalanceAfter,
            change: workerBalanceAfter - workerBalanceBefore
          },
          customer: {
            before: customerBalanceBefore,
            after: customerBalanceAfter,
            change: customerBalanceAfter - customerBalanceBefore
          }
        }
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Process MoMo Error:', error);
    res.status(500).json({ error: 'Failed to process transfer' });
  } finally {
    session.endSession();
  }
});

// NEW ROUTE - Get Worker Wallet Balance with recent transactions
router.get('/wallet-balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get recent transactions for context
    const recentTransactions = await Transaction.find({ 
      userId: user._id 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('type amount balanceBefore balanceAfter createdAt description');
    
    res.json({
      success: true,
      walletBalance: user.walletBalance,
      name: user.name,
      role: user.role,
      recentTransactions: recentTransactions.map(tx => ({
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        balanceChange: tx.balanceAfter - tx.balanceBefore,
        description: tx.description,
        date: tx.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Get Wallet Balance Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// 2. ADMIN ROUTE - View Today's Transfers with transaction details
router.get('/today', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get transfers
    const transfers = await Transfer.find({
      createdAt: { $gte: today, $lt: tomorrow }
    }).populate('workerId', 'name walletBalance').sort({ createdAt: -1 });
    
    // Get related transactions for balance tracking
    const transactionRefs = transfers.map(t => t.transactionReference).filter(Boolean);
    const transactions = await Transaction.find({
      reference: { $regex: new RegExp(transactionRefs.join('|')) }
    }).select('reference balanceBefore balanceAfter userId type');
    
    // Create transaction map
    const transactionMap = {};
    transactions.forEach(tx => {
      const baseRef = tx.reference.split('-').slice(0, -2).join('-');
      if (!transactionMap[baseRef]) {
        transactionMap[baseRef] = {};
      }
      transactionMap[baseRef][tx.userId.toString()] = {
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        type: tx.type
      };
    });
    
    // Calculate stats
    const stats = {
      totalTransfers: transfers.length,
      totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0),
      byWorker: {}
    };
    
    // Group by worker with balance tracking
    transfers.forEach(transfer => {
      const workerName = transfer.workerName;
      if (!stats.byWorker[workerName]) {
        stats.byWorker[workerName] = {
          count: 0,
          amount: 0,
          currentBalance: transfer.workerId?.walletBalance || 0
        };
      }
      stats.byWorker[workerName].count++;
      stats.byWorker[workerName].amount += transfer.amount;
    });
    
    // Enhance transfers with transaction data
    const enhancedTransfers = transfers.map(transfer => {
      const txData = transactionMap[transfer.transactionReference] || {};
      return {
        ...transfer.toObject(),
        transactionDetails: txData
      };
    });
    
    res.json({
      success: true,
      date: today.toDateString(),
      stats,
      transfers: enhancedTransfers
    });
    
  } catch (error) {
    console.error('Today Transfers Error:', error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// 3. ADMIN/WORKER ROUTE - Search by Reference with transaction details
router.get('/search/:reference', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const transfer = await Transfer.findOne({ 
      momoReference: req.params.reference 
    }).populate('workerId', 'name email walletBalance');
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    // Get related transactions
    let transactions = [];
    if (transfer.transactionReference) {
      transactions = await Transaction.find({
        reference: { $regex: transfer.transactionReference }
      }).populate('userId', 'name email');
    }
    
    res.json({ 
      success: true, 
      transfer,
      transactions: transactions.map(tx => ({
        user: tx.userId,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        balanceChange: tx.balanceAfter - tx.balanceBefore,
        status: tx.status,
        createdAt: tx.createdAt
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// 4. WORKER ROUTE - My Transfers Today with balance impact
router.get('/my-transfers', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const transfers = await Transfer.find({
      workerId: req.user._id,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });
    
    // Get worker's transactions for today
    const workerTransactions = await Transaction.find({
      userId: req.user._id,
      createdAt: { $gte: today },
      'metadata.transferType': 'momo_transfer'
    }).sort({ createdAt: -1 });
    
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    const totalBalanceChange = workerTransactions.reduce((sum, tx) => 
      sum + (tx.balanceAfter - tx.balanceBefore), 0
    );
    
    // Get current balance
    const worker = await User.findById(req.user._id);
    
    res.json({
      success: true,
      count: transfers.length,
      totalAmount,
      totalBalanceChange,
      currentBalance: worker.walletBalance,
      transfers: transfers.map((transfer, index) => {
        const relatedTx = workerTransactions.find(tx => 
          tx.metadata?.momoReference === transfer.momoReference
        );
        
        return {
          ...transfer.toObject(),
          balanceImpact: relatedTx ? {
            balanceBefore: relatedTx.balanceBefore,
            balanceAfter: relatedTx.balanceAfter,
            change: relatedTx.balanceAfter - relatedTx.balanceBefore
          } : null
        };
      })
    });
    
  } catch (error) {
    console.error('My Transfers Error:', error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// 5. ADMIN ROUTE - Date Range Report with comprehensive stats
router.get('/report', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    
    const { startDate, endDate, workerId } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    if (workerId) {
      filter.workerId = workerId;
    }
    
    const transfers = await Transfer.find(filter)
      .populate('workerId', 'name walletBalance')
      .sort({ createdAt: -1 });
    
    // Get all related transactions for the period
    const transactionFilter = {
      'metadata.transferType': 'momo_transfer',
      createdAt: filter.createdAt
    };
    
    if (workerId) {
      transactionFilter['metadata.workerId'] = workerId;
    }
    
    const transactions = await Transaction.find(transactionFilter);
    
    // Calculate comprehensive stats
    const stats = {
      totalTransfers: transfers.length,
      totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0),
      uniqueCustomers: new Set(transfers.map(t => t.customerPhone)).size,
      byWorker: {},
      dailyBreakdown: {},
      hourlyDistribution: Array(24).fill(0)
    };
    
    // Process transfers for stats
    transfers.forEach(transfer => {
      const date = transfer.createdAt.toISOString().split('T')[0];
      const hour = transfer.createdAt.getHours();
      const workerName = transfer.workerName;
      
      // Worker stats
      if (!stats.byWorker[workerName]) {
        stats.byWorker[workerName] = {
          count: 0,
          amount: 0,
          currentBalance: transfer.workerId?.walletBalance || 0,
          uniqueCustomers: new Set()
        };
      }
      stats.byWorker[workerName].count++;
      stats.byWorker[workerName].amount += transfer.amount;
      stats.byWorker[workerName].uniqueCustomers.add(transfer.customerPhone);
      
      // Daily breakdown
      if (!stats.dailyBreakdown[date]) {
        stats.dailyBreakdown[date] = {
          count: 0,
          amount: 0,
          workers: new Set()
        };
      }
      stats.dailyBreakdown[date].count++;
      stats.dailyBreakdown[date].amount += transfer.amount;
      stats.dailyBreakdown[date].workers.add(workerName);
      
      // Hourly distribution
      stats.hourlyDistribution[hour]++;
    });
    
    // Convert Sets to counts
    Object.keys(stats.byWorker).forEach(worker => {
      stats.byWorker[worker].uniqueCustomers = stats.byWorker[worker].uniqueCustomers.size;
    });
    
    Object.keys(stats.dailyBreakdown).forEach(date => {
      stats.dailyBreakdown[date].workerCount = stats.dailyBreakdown[date].workers.size;
      delete stats.dailyBreakdown[date].workers;
    });
    
    res.json({
      success: true,
      period: {
        start: startDate || 'All time',
        end: endDate || 'Present'
      },
      stats,
      transfers: transfers.slice(0, 100), // Limit to 100 for performance
      transactionCount: transactions.length
    });
    
  } catch (error) {
    console.error('Report Error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 6. NEW ROUTE - Worker Performance Stats
router.get('/worker-stats/:workerId?', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // If worker, can only see own stats
    const workerId = req.user.role === 'worker' ? req.user._id : (req.params.workerId || req.user._id);
    
    const worker = await User.findById(workerId);
    if (!worker || (worker.role !== 'worker' && worker.role !== 'admin')) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // Get all transfers
    const transfers = await Transfer.find({ workerId });
    
    // Get all transactions
    const transactions = await Transaction.find({
      userId: workerId,
      'metadata.transferType': 'momo_transfer'
    }).sort({ createdAt: -1 });
    
    // Calculate stats
    const stats = {
      worker: {
        id: worker._id,
        name: worker.name,
        currentBalance: worker.walletBalance
      },
      lifetime: {
        totalTransfers: transfers.length,
        totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0),
        averageAmount: transfers.length > 0 ? 
          transfers.reduce((sum, t) => sum + t.amount, 0) / transfers.length : 0
      },
      balanceHistory: transactions.slice(0, 20).map(tx => ({
        date: tx.createdAt,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        change: tx.balanceAfter - tx.balanceBefore,
        amount: tx.amount
      }))
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Worker Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch worker stats' });
  }
});

module.exports = router;