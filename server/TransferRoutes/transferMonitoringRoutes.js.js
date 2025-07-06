const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// 1. WORKER ROUTE - Process MoMo Payment
router.post('/process-momo', auth, async (req, res) => {
  try {
    const { momoReference, customerPhone, customerName, amount } = req.body;
    
    // Check if worker
    const worker = await User.findById(req.user.id);
    if (worker.role !== 'worker' && worker.role !== 'admin') {
      return res.status(403).json({ error: 'Only workers can process transfers' });
    }
    
    // Check if reference already used
    const existingTransfer = await Transfer.findOne({ momoReference });
    if (existingTransfer) {
      return res.status(400).json({ error: 'This reference has already been used' });
    }
    
    // Find customer
    const customer = await User.findOne({ phoneNumber: customerPhone });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Create transfer record
    const transfer = new Transfer({
      momoReference,
      customerPhone,
      customerName: customerName || customer.name,
      workerId: worker._id,
      workerName: worker.name,
      amount,
      status: 'completed'
    });
    
    // Credit customer wallet
    customer.walletBalance += amount;
    
    // Save both
    await transfer.save();
    await customer.save();
    
    // Send SMS to customer
    const message = `Hello ${customer.name}, you have received GHS ${amount} in your wallet. Reference: ${momoReference}. New balance: GHS ${customer.walletBalance}`;
    // await sendSMS(customerPhone, message);
    
    res.json({
      success: true,
      message: 'Transfer processed successfully',
      data: {
        reference: momoReference,
        amount,
        customerName: customer.name,
        newBalance: customer.walletBalance
      }
    });
    
  } catch (error) {
    console.error('Process MoMo Error:', error);
    res.status(500).json({ error: 'Failed to process transfer' });
  }
});

// 2. ADMIN ROUTE - View Today's Transfers
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
    }).populate('workerId', 'name').sort({ createdAt: -1 });
    
    // Calculate stats
    const stats = {
      totalTransfers: transfers.length,
      totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0),
      byWorker: {}
    };
    
    // Group by worker
    transfers.forEach(transfer => {
      const workerName = transfer.workerName;
      if (!stats.byWorker[workerName]) {
        stats.byWorker[workerName] = {
          count: 0,
          amount: 0
        };
      }
      stats.byWorker[workerName].count++;
      stats.byWorker[workerName].amount += transfer.amount;
    });
    
    res.json({
      success: true,
      date: today.toDateString(),
      stats,
      transfers
    });
    
  } catch (error) {
    console.error('Today Transfers Error:', error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// 3. ADMIN ROUTE - Search by Reference
router.get('/search/:reference', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const transfer = await Transfer.findOne({ 
      momoReference: req.params.reference 
    }).populate('workerId', 'name email');
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    res.json({ success: true, transfer });
    
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// 4. WORKER ROUTE - My Transfers Today
router.get('/my-transfers', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const transfers = await Transfer.find({
      workerId: req.user.id,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });
    
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      success: true,
      count: transfers.length,
      totalAmount,
      transfers
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// 5. ADMIN ROUTE - Date Range Report
router.get('/report', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const transfers = await Transfer.find(filter)
      .populate('workerId', 'name')
      .sort({ createdAt: -1 });
    
    // Daily breakdown
    const dailyStats = {};
    transfers.forEach(transfer => {
      const date = transfer.createdAt.toDateString();
      if (!dailyStats[date]) {
        dailyStats[date] = {
          count: 0,
          amount: 0
        };
      }
      dailyStats[date].count++;
      dailyStats[date].amount += transfer.amount;
    });
    
    res.json({
      success: true,
      totalTransfers: transfers.length,
      totalAmount: transfers.reduce((sum, t) => sum + t.amount, 0),
      dailyStats,
      transfers: transfers.slice(0, 100) // Limit to 100 for performance
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;