const express = require('express');
const router = express.Router();
const axios = require('axios');
const { SMMService, SMMOrder, SMMRefill, SMMSettings } = require('../smmSchema/schema');
const { User, Transaction } = require('../schema/schema');
const auth = require('../middlewareUser/middleware');

// JAP API Helper
class JAPApiClient {
  constructor() {
    this.apiUrl = null;
    this.apiKey = null;
  }

  async init() {
    const settings = await SMMSettings.findOne();
    if (!settings) {
      throw new Error('SMM settings not configured');
    }
    this.apiUrl = settings.japApiUrl;
    this.apiKey = settings.japApiKey;
  }

  async makeRequest(action, params = {}) {
    if (!this.apiUrl || !this.apiKey) {
      await this.init();
    }

    try {
      const response = await axios.post(this.apiUrl, {
        key: this.apiKey,
        action: action,
        ...params
      });
      return response.data;
    } catch (error) {
      console.error('JAP API Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

const japApi = new JAPApiClient();

// Get all available services
router.get('/services', auth, async (req, res) => {
  try {
    const services = await SMMService.find({ isActive: true })
      .sort('category name');
    
    // Group by category
    const groupedServices = services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {});

    res.json({
      success: true,
      services: groupedServices
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new order
router.post('/order', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { serviceId, link, quantity, runs, interval, comments, usernames, hashtags } = req.body;
    const userId = req.user._id; // Changed from req.user.id to req.user._id

    // Get service details
    const service = await SMMService.findOne({ serviceId, isActive: true });
    if (!service) {
      throw new Error('Service not found or inactive');
    }

    // Validate quantity
    if (quantity < service.min || quantity > service.max) {
      throw new Error(`Quantity must be between ${service.min} and ${service.max}`);
    }

    // Calculate price
    const totalPrice = (quantity / 1000) * service.ourRate;

    // Check user balance
    const user = await User.findById(userId).session(session);
    if (user.walletBalance < totalPrice) {
      throw new Error('Insufficient balance');
    }

    // Deduct balance
    user.walletBalance -= totalPrice;
    await user.save({ session });

    // Create transaction
    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: totalPrice,
      balanceBefore: user.walletBalance + totalPrice,
      balanceAfter: user.walletBalance,
      status: 'completed',
      reference: `SMM-${Date.now()}`,
      description: `SMM Order: ${service.name}`,
      gateway: 'wallet'
    });
    await transaction.save({ session });

    // Place order with JAP
    const japParams = {
      service: serviceId,
      link,
      quantity
    };

    // Add optional parameters
    if (runs) japParams.runs = runs;
    if (interval) japParams.interval = interval;
    
    // Handle custom data based on service type
    if (service.type === 'Custom Comments' && comments) {
      japParams.comments = comments.join('\\n');
    }

    const japResponse = await japApi.makeRequest('add', japParams);

    if (!japResponse.order) {
      throw new Error(japResponse.error || 'Failed to place order with provider');
    }

    // Calculate profit
    const costPrice = (quantity / 1000) * service.rate;
    const profit = totalPrice - costPrice;

    // Create order record
    const order = new SMMOrder({
      userId,
      japOrderId: japResponse.order,
      serviceId,
      service: service._id,
      link,
      quantity,
      runs,
      interval,
      comments,
      usernames,
      hashtags,
      costPrice,
      sellingPrice: totalPrice,
      profit,
      transactionId: transaction._id,
      method: 'web',
      ipAddress: req.ip
    });
    await order.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      order: {
        id: order._id,
        japOrderId: order.japOrderId,
        service: service.name,
        quantity,
        price: totalPrice,
        status: order.status
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
});

// Get user orders
router.get('/orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { userId: req.user._id }; // Changed from req.user.id
    
    if (status) {
      query.status = status;
    }

    const orders = await SMMOrder.find(query)
      .populate('service', 'name type category')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SMMOrder.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order status
router.get('/order/:orderId/status', auth, async (req, res) => {
  try {
    const order = await SMMOrder.findOne({
      _id: req.params.orderId,
      userId: req.user._id // Changed from req.user.id
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Get status from JAP
    const japResponse = await japApi.makeRequest('status', {
      order: order.japOrderId
    });

    // Update local order
    order.japStatus = japResponse.status;
    order.startCount = japResponse.start_count;
    order.remains = japResponse.remains;
    
    // Map JAP status to our status
    const statusMap = {
      'Pending': 'pending',
      'In progress': 'in progress',
      'Processing': 'processing',
      'Completed': 'completed',
      'Partial': 'partial',
      'Canceled': 'cancelled',
      'Error': 'error'
    };
    
    order.status = statusMap[japResponse.status] || order.status;
    
    if (order.status === 'completed') {
      order.completedAt = new Date();
    }
    
    await order.save();

    res.json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        startCount: order.startCount,
        remains: order.remains,
        quantity: order.quantity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Request refill
router.post('/order/:orderId/refill', auth, async (req, res) => {
  try {
    const order = await SMMOrder.findOne({
      _id: req.params.orderId,
      userId: req.user._id // Changed from req.user.id
    }).populate('service');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!order.service.refill) {
      return res.status(400).json({ success: false, error: 'This service does not support refills' });
    }

    if (order.status !== 'completed' && order.status !== 'partial') {
      return res.status(400).json({ success: false, error: 'Can only refill completed or partial orders' });
    }

    // Check if refill already exists
    const existingRefill = await SMMRefill.findOne({
      orderId: order._id,
      status: { $in: ['pending', 'processing'] }
    });

    if (existingRefill) {
      return res.status(400).json({ success: false, error: 'Refill already in progress' });
    }

    // Request refill from JAP
    const japResponse = await japApi.makeRequest('refill', {
      order: order.japOrderId
    });

    if (!japResponse.refill) {
      throw new Error(japResponse.error || 'Failed to create refill');
    }

    // Create refill record
    const refill = new SMMRefill({
      orderId: order._id,
      userId: req.user._id,
      japOrderId: order.japOrderId,
      japRefillId: japResponse.refill
    });
    await refill.save();

    res.json({
      success: true,
      refill: {
        id: refill._id,
        status: refill.status,
        requestedAt: refill.requestedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoints for external use
router.post('/api/order', auth, async (req, res) => {
  // Similar to regular order but with API key validation
  // Implementation similar to above with apiKeyId tracking
});

// Admin routes
// Sync services from JAP
router.post('/admin/sync-services', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    const japResponse = await japApi.makeRequest('services');
    
    if (!Array.isArray(japResponse)) {
      throw new Error('Invalid response from JAP API');
    }

    const settings = await SMMSettings.findOne();
    const profitMargin = settings?.profitMargin || 20;

    let updated = 0;
    let created = 0;

    for (const japService of japResponse) {
      const ourRate = japService.rate * (1 + profitMargin / 100);
      
      const result = await SMMService.findOneAndUpdate(
        { serviceId: japService.service },
        {
          name: japService.name,
          type: japService.type,
          category: japService.category,
          rate: japService.rate,
          min: japService.min,
          max: japService.max,
          refill: japService.refill,
          cancel: japService.cancel,
          ourRate: ourRate,
          lastUpdated: new Date(),
          updatedBy: req.user._id
        },
        { upsert: true, new: true }
      );

      if (result.isNew) {
        created++;
      } else {
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Sync complete. Created: ${created}, Updated: ${updated}`,
      total: japResponse.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update service pricing
router.put('/admin/service/:serviceId', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    const { ourRate, isActive } = req.body;
    
    const service = await SMMService.findOneAndUpdate(
      { serviceId: req.params.serviceId },
      {
        ourRate,
        isActive,
        updatedBy: req.user._id,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get/Update SMM settings
router.get('/admin/settings', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    const settings = await SMMSettings.findOne();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/admin/settings', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    const settings = await SMMSettings.findOneAndUpdate(
      {},
      {
        ...req.body,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check balance with JAP
router.get('/admin/jap-balance', auth, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }
    const response = await japApi.makeRequest('balance');
    res.json({
      success: true,
      balance: response.balance,
      currency: response.currency
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;