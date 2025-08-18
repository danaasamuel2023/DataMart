// bulkPurchaseRouter.js
// Complete fixed router file for bulk purchase functionality with enhanced error handling

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Import your schema - adjust the path as needed
const { User, DataPurchase, Transaction, DataInventory } = require('../schema/schema');

// ===== CONFIGURATIONS =====
const GEONETTECH_BASE_URL = process.env.GEONETTECH_BASE_URL || 'https://testhub.geonettech.site/api/v1';
const GEONETTECH_API_KEY = process.env.GEONETTECH_API_KEY || '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';

const geonetClient = axios.create({
  baseURL: GEONETTECH_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GEONETTECH_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

const TELECEL_API_URL = process.env.TELECEL_API_URL || 'https://iget.onrender.com/api/developer/orders/place';
const TELECEL_API_KEY = process.env.TELECEL_API_KEY || '76013fa9c8bf774ac7fb35db5e586fb7852a618cbf57b9ddb072fc2c465e5fe8';

// ===== HELPER FUNCTIONS =====
const logOperation = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
};

// Safe substring helper
const safeSubstring = (str, start, end) => {
  if (!str || typeof str !== 'string') return 'UNKNOWN';
  if (str.length < 3) return str + 'XXX';
  return str.substring(start, end) + 'XXXXXXX';
};

// Generate mixed reference function
function generateMixedReference(prefix = '') {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let reference = prefix;
  
  for (let i = 0; i < 2; i++) {
    reference += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  for (let i = 0; i < 4; i++) {
    reference += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  for (let i = 0; i < 2; i++) {
    reference += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  return reference;
}

// ===== PRICING STRUCTURES =====
const OFFICIAL_PRICING = {
  'YELLO': {
    '1': 4.50, '2': 9.20, '3': 13.50, '4': 18.50, '5': 23.50,
    '6': 27.00, '8': 35.50, '10': 43.50, '15': 62.50, '20': 83.00,
    '25': 105.00, '30': 129.00, '40': 166.00, '50': 207.00, '100': 407.00
  },
  'at': {
    '1': 3.95, '2': 8.35, '3': 13.25, '4': 16.50, '5': 19.50,
    '6': 23.50, '8': 30.50, '10': 38.50, '12': 45.50, '15': 57.50,
    '25': 95.00, '30': 115.00, '40': 151.00, '50': 190.00
  },
  'AT_PREMIUM': {
    '1': 3.95, '2': 8.35, '3': 13.25, '4': 16.50, '5': 19.50,
    '6': 23.50, '8': 30.50, '10': 38.50, '12': 45.50, '15': 57.50,
    '25': 95.00, '30': 115.00, '40': 151.00, '50': 190.00
  },
  'TELECEL': {
    '5': 19.50, '8': 34.64, '10': 36.50, '12': 43.70, '15': 52.85,
    '20': 69.80, '25': 86.75, '30': 103.70, '35': 120.65, '40': 137.60,
    '45': 154.55, '50': 171.50, '100': 341.00
  }
};

// ===== VALIDATION FUNCTIONS =====
const validatePrice = (network, capacity, submittedPrice, userId, phoneNumber) => {
  // Safety checks for all parameters
  if (!network) {
    return {
      isValid: false,
      message: 'Network is required',
      code: 'MISSING_NETWORK'
    };
  }
  
  if (capacity === undefined || capacity === null) {
    return {
      isValid: false,
      message: 'Capacity is required',
      code: 'MISSING_CAPACITY'
    };
  }
  
  if (submittedPrice === undefined || submittedPrice === null) {
    return {
      isValid: false,
      message: 'Price is required',
      code: 'MISSING_PRICE'
    };
  }
  
  const capacityStr = String(capacity);
  
  if (!OFFICIAL_PRICING[network]) {
    logOperation('PRICE_VALIDATION_INVALID_NETWORK', {
      network,
      availableNetworks: Object.keys(OFFICIAL_PRICING),
      userId: userId || 'UNKNOWN'
    });
    return {
      isValid: false,
      message: 'Invalid network selected',
      code: 'INVALID_NETWORK'
    };
  }

  const officialPrice = OFFICIAL_PRICING[network][capacityStr];
  
  if (officialPrice === undefined) {
    logOperation('PRICE_VALIDATION_INVALID_CAPACITY', {
      network,
      capacity: capacityStr,
      availableCapacities: Object.keys(OFFICIAL_PRICING[network]),
      userId: userId || 'UNKNOWN'
    });
    return {
      isValid: false,
      message: `Invalid data capacity for ${network}. Available options: ${Object.keys(OFFICIAL_PRICING[network]).join(', ')}GB`,
      code: 'INVALID_CAPACITY'
    };
  }

  const submittedPriceFloat = parseFloat(submittedPrice);
  const tolerance = 0.01;
  
  if (Math.abs(submittedPriceFloat - officialPrice) > tolerance) {
    logOperation('PRICE_VALIDATION_MISMATCH', {
      network,
      capacity: capacityStr,
      submittedPrice: submittedPriceFloat,
      officialPrice,
      difference: Math.abs(submittedPriceFloat - officialPrice),
      userId: userId || 'UNKNOWN',
      phoneNumber: safeSubstring(phoneNumber, 0, 3),
      suspiciousActivity: true
    });
    return {
      isValid: false,
      message: 'Invalid price. Please refresh the page and try again.',
      code: 'PRICE_MISMATCH'
    };
  }

  const priceRatio = submittedPriceFloat / officialPrice;
  if (priceRatio < 0.5 || priceRatio > 2.0) {
    logOperation('PRICE_VALIDATION_SUSPICIOUS_RATIO', {
      network,
      capacity: capacityStr,
      submittedPrice: submittedPriceFloat,
      officialPrice,
      ratio: priceRatio,
      userId: userId || 'UNKNOWN',
      phoneNumber: safeSubstring(phoneNumber, 0, 3)
    });
    return {
      isValid: false,
      message: 'Price validation failed. Please contact support if this error persists.',
      code: 'SUSPICIOUS_PRICING'
    };
  }

  return {
    isValid: true,
    validatedPrice: officialPrice,
    message: 'Price validation successful'
  };
};

const validatePhoneNumber = (network, phoneNumber) => {
  // Check if phoneNumber is provided
  if (!phoneNumber) {
    return { isValid: false, message: 'Phone number is required' };
  }
  
  // Convert to string and clean
  const phoneStr = String(phoneNumber);
  const cleanNumber = phoneStr.replace(/[\s-]/g, '');
  
  // Check length
  if (cleanNumber.length !== 10) {
    return { isValid: false, message: 'Phone number must be 10 digits' };
  }
  
  if (!cleanNumber.startsWith('0')) {
    return { isValid: false, message: 'Phone number must start with 0' };
  }
  
  const prefix = cleanNumber.substring(0, 3);
  
  switch (network) {
    case 'YELLO':
      const mtnPrefixes = ['024', '054', '055', '059','026','025','053','027','057','023','020', '050'];
      if (mtnPrefixes.includes(prefix)) {
        return { isValid: true, message: '' };
      } else {
        return { isValid: false, message: 'Please enter a valid MTN number' };
      }
      
    case 'at':
    case 'AT_PREMIUM':
      const airtelTigoPrefixes = ['026', '056', '027', '057', '023', '053'];
      if (airtelTigoPrefixes.includes(prefix)) {
        return { isValid: true, message: '' };
      } else {
        return { isValid: false, message: 'Please enter a valid AirtelTigo number' };
      }
      
    case 'TELECEL':
      const telecelPrefixes = ['020', '050'];
      if (telecelPrefixes.includes(prefix)) {
        return { isValid: true, message: '' };
      } else {
        return { isValid: false, message: 'Please enter a valid Telecel number' };
      }
      
    default:
      return { isValid: false, message: 'Unsupported network' };
  }
};

// Telecel API helper function
async function processTelecelOrder(recipient, capacity, reference) {
  try {
    const telecelPayload = {
      recipientNumber: recipient,
      capacity: capacity,
      bundleType: "Telecel-5959",
      reference: reference,
    };
    
    logOperation('TELECEL_ORDER_REQUEST', telecelPayload);
    
    const response = await axios.post(
      TELECEL_API_URL,
      telecelPayload,
      { 
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': TELECEL_API_KEY
        },
        timeout: 30000
      }
    );
    
    let telecelOrderReference = null;
    
    if (response.data?.data?.order?.orderReference) {
      telecelOrderReference = response.data.data.order.orderReference;
    } else if (response.data?.data?.orderReference) {
      telecelOrderReference = response.data.data.orderReference;
    } else if (response.data?.orderReference) {
      telecelOrderReference = response.data.orderReference;
    }
    
    return {
      success: true,
      data: response.data,
      orderId: telecelOrderReference || reference,
      telecelReference: telecelOrderReference
    };
  } catch (error) {
    logOperation('TELECEL_ORDER_ERROR', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: {
        message: error.message,
        details: error.response?.data || 'No response details available'
      }
    };
  }
}

// ===== REQUEST BODY VALIDATION MIDDLEWARE =====
const validateRequestBody = (req, res, next) => {
  console.log('=== REQUEST VALIDATION ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.get('content-type'));
  console.log('Has Body:', !!req.body);
  console.log('Body Keys:', req.body ? Object.keys(req.body) : []);
  console.log('Body Content:', JSON.stringify(req.body, null, 2));
  
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Request body is missing or empty. Ensure Content-Type is application/json'
    });
  }
  
  next();
};

// ===== BULK PURCHASE VALIDATION ENDPOINT =====
router.post('/validate-bulk-purchase', validateRequestBody, async (req, res) => {
  try {
    console.log('=== VALIDATION ENDPOINT START ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    const { userId, purchases } = req.body;

    logOperation('BULK_PURCHASE_VALIDATION_REQUEST', {
      userId,
      purchaseCount: purchases ? purchases.length : 0,
      firstPurchase: purchases && purchases.length > 0 ? purchases[0] : null
    });

    // Validate inputs
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    if (!purchases) {
      return res.status(400).json({
        status: 'error',
        message: 'Purchases array is required'
      });
    }

    if (!Array.isArray(purchases)) {
      return res.status(400).json({
        status: 'error',
        message: `Purchases must be an array. Received: ${typeof purchases}`,
        receivedType: typeof purchases,
        receivedValue: purchases
      });
    }

    if (purchases.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Purchases array cannot be empty'
      });
    }

    // Check if purchases array has valid items
    console.log('Purchases array length:', purchases.length);
    console.log('First purchase item:', purchases[0]);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const validationResults = [];
    let totalCost = 0;
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      console.log(`Processing purchase ${i + 1}:`, purchase);
      
      const result = {
        index: i + 1,
        phoneNumber: purchase?.phoneNumber || '',
        network: purchase?.network || '',
        capacity: purchase?.capacity || 0,
        submittedPrice: purchase?.price || 0,
        valid: true,
        errors: []
      };

      // Check if purchase object exists
      if (!purchase) {
        result.valid = false;
        result.errors.push({
          field: 'general',
          message: 'Purchase item is null or undefined'
        });
        invalidCount++;
        validationResults.push(result);
        continue;
      }

      // Check for missing fields
      const missingFields = [];
      if (!purchase.phoneNumber) missingFields.push('phoneNumber');
      if (!purchase.network) missingFields.push('network');
      if (purchase.capacity === undefined || purchase.capacity === null) missingFields.push('capacity');
      if (purchase.price === undefined || purchase.price === null) missingFields.push('price');
      
      if (missingFields.length > 0) {
        result.valid = false;
        result.errors.push({
          field: 'general',
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        invalidCount++;
        validationResults.push(result);
        continue;
      }

      // Validate price
      const priceValidation = validatePrice(
        purchase.network, 
        purchase.capacity, 
        purchase.price, 
        userId, 
        purchase.phoneNumber
      );
      
      if (!priceValidation.isValid) {
        result.valid = false;
        result.errors.push({
          field: 'price',
          message: priceValidation.message,
          code: priceValidation.code
        });
      } else {
        result.validatedPrice = priceValidation.validatedPrice;
        totalCost += priceValidation.validatedPrice;
      }

      // Validate phone number
      const phoneValidation = validatePhoneNumber(purchase.network, purchase.phoneNumber);
      if (!phoneValidation.isValid) {
        result.valid = false;
        result.errors.push({
          field: 'phoneNumber',
          message: phoneValidation.message
        });
      }

      if (result.valid) {
        validCount++;
      } else {
        invalidCount++;
      }

      validationResults.push(result);
    }

    const currentBalance = user.walletBalance || 0;
    const hasSufficientBalance = currentBalance >= totalCost;

    console.log('=== VALIDATION SUMMARY ===');
    console.log('Valid:', validCount);
    console.log('Invalid:', invalidCount);
    console.log('Total Cost:', totalCost);
    console.log('User Balance:', currentBalance);
    console.log('Sufficient Balance:', hasSufficientBalance);

    res.json({
      status: 'success',
      data: {
        validationResults,
        summary: {
          totalPurchases: purchases.length,
          validPurchases: validCount,
          invalidPurchases: invalidCount,
          estimatedTotalCost: totalCost,
          currentBalance: currentBalance,
          hasSufficientBalance,
          balanceShortfall: hasSufficientBalance ? 0 : totalCost - currentBalance
        }
      }
    });

  } catch (error) {
    console.error('=== VALIDATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    logOperation('BULK_PURCHASE_VALIDATION_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate bulk purchase',
      error: error.message,
      debug: {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        contentType: req.get('content-type')
      }
    });
  }
});

// ===== BULK PURCHASE MAIN ENDPOINT =====
router.post('/bulk-purchase-data', validateRequestBody, async (req, res) => {
  const { userId, purchases } = req.body;

  logOperation('BULK_DATA_PURCHASE_REQUEST', {
    userId,
    purchaseCount: purchases ? purchases.length : 0,
    timestamp: new Date()
  });

  // Validate inputs
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID is required'
    });
  }

  if (!purchases) {
    return res.status(400).json({
      status: 'error',
      message: 'Purchases array is required'
    });
  }

  if (!Array.isArray(purchases)) {
    return res.status(400).json({
      status: 'error',
      message: 'Purchases must be an array'
    });
  }

  if (purchases.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Purchases array cannot be empty'
    });
  }

  const MAX_BULK_PURCHASES = 50;
  if (purchases.length > MAX_BULK_PURCHASES) {
    return res.status(400).json({
      status: 'error',
      message: `Maximum ${MAX_BULK_PURCHASES} purchases allowed per bulk request`,
      requestedCount: purchases.length
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find user
    const user = await User.findById(userId).session(session);
    if (!user) {
      logOperation('BULK_PURCHASE_USER_NOT_FOUND', { userId });
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const balanceBefore = user.walletBalance || 0;
    
    // Validate all purchases
    const validatedPurchases = [];
    let totalCost = 0;
    const validationErrors = [];

    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      const purchaseIndex = i + 1;
      
      // Check if purchase object exists
      if (!purchase) {
        validationErrors.push({
          index: purchaseIndex,
          error: 'Purchase item is null or undefined',
          purchase: null
        });
        continue;
      }
      
      // Check required fields
      const missingFields = [];
      if (!purchase.phoneNumber) missingFields.push('phoneNumber');
      if (!purchase.network) missingFields.push('network');
      if (purchase.capacity === undefined || purchase.capacity === null) missingFields.push('capacity');
      if (purchase.price === undefined || purchase.price === null) missingFields.push('price');
      
      if (missingFields.length > 0) {
        validationErrors.push({
          index: purchaseIndex,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          purchase: purchase,
          missingFields: missingFields
        });
        continue;
      }

      // Validate price
      const priceValidation = validatePrice(
        purchase.network, 
        purchase.capacity, 
        purchase.price, 
        userId, 
        purchase.phoneNumber
      );
      
      if (!priceValidation.isValid) {
        validationErrors.push({
          index: purchaseIndex,
          error: priceValidation.message,
          code: priceValidation.code,
          purchase
        });
        continue;
      }

      // Validate phone number
      const phoneValidation = validatePhoneNumber(purchase.network, purchase.phoneNumber);
      if (!phoneValidation.isValid) {
        validationErrors.push({
          index: purchaseIndex,
          error: phoneValidation.message,
          purchase
        });
        continue;
      }

      validatedPurchases.push({
        ...purchase,
        validatedPrice: priceValidation.validatedPrice,
        index: purchaseIndex
      });
      
      totalCost += priceValidation.validatedPrice;
    }

    if (validationErrors.length > 0) {
      logOperation('BULK_PURCHASE_VALIDATION_ERRORS', {
        errorCount: validationErrors.length,
        errors: validationErrors
      });
      
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors found in bulk purchase request',
        errors: validationErrors,
        validCount: validatedPurchases.length,
        invalidCount: validationErrors.length
      });
    }

    // Check balance
    if (balanceBefore < totalCost) {
      logOperation('BULK_PURCHASE_INSUFFICIENT_BALANCE', {
        userId,
        currentBalance: balanceBefore,
        requiredAmount: totalCost,
        shortfall: totalCost - balanceBefore
      });
      
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient wallet balance for bulk purchase',
        currentBalance: balanceBefore,
        requiredAmount: totalCost,
        shortfall: totalCost - balanceBefore
      });
    }

    // Check inventory for all networks
    const networkInventoryStatus = {};
    for (const purchase of validatedPurchases) {
      if (!networkInventoryStatus[purchase.network]) {
        const inventory = await DataInventory.findOne({ 
          network: purchase.network 
        }).session(session);
        
        let inStock, skipGeonettech;
        if (inventory) {
          inStock = inventory.webInStock !== undefined ? inventory.webInStock : 
                   (inventory.inStock !== undefined ? inventory.inStock : true);
          skipGeonettech = inventory.webSkipGeonettech !== undefined ? 
            inventory.webSkipGeonettech : 
            (inventory.skipGeonettech !== undefined ? inventory.skipGeonettech : false);
        } else {
          inStock = true;
          skipGeonettech = false;
        }
        
        networkInventoryStatus[purchase.network] = {
          inStock,
          skipGeonettech
        };
      }
      
      if (!networkInventoryStatus[purchase.network].inStock) {
        logOperation('BULK_PURCHASE_OUT_OF_STOCK', {
          network: purchase.network,
          purchaseIndex: purchase.index
        });
        
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          status: 'error',
          message: `${purchase.network} data bundles are currently out of stock`,
          outOfStockNetwork: purchase.network,
          purchaseIndex: purchase.index
        });
      }
    }

    // Process each purchase
    const processedPurchases = [];
    const failedPurchases = [];
    let successfulTotalCost = 0;
    const bulkTransactionReference = `BULK-${uuidv4()}`;

    for (const validatedPurchase of validatedPurchases) {
      try {
        const { network, phoneNumber, capacity, validatedPrice, index } = validatedPurchase;
        const { skipGeonettech } = networkInventoryStatus[network];
        
        let orderReferencePrefix = '';
        if (network === 'TELECEL') {
          orderReferencePrefix = !skipGeonettech ? 'GN-TC-' : 'TC-';
        } else if (network === 'AT_PREMIUM') {
          orderReferencePrefix = 'ATP-';
        } else if (skipGeonettech && network !== 'AT_PREMIUM') {
          orderReferencePrefix = 'MN-';
        } else {
          orderReferencePrefix = 'GN-';
        }
        
        let orderReference = generateMixedReference(orderReferencePrefix);
        const originalInternalReference = orderReference;

        let orderResponse = null;
        let apiOrderId = null;
        let orderStatus = 'completed';
        let processingMethod = 'api';
        
        const shouldSkipGeonet = skipGeonettech && (network !== 'AT_PREMIUM');
        
        // Process based on network type
        if (network === 'TELECEL') {
          if (!skipGeonettech) {
            processingMethod = 'geonettech_api';
            const geonetOrderPayload = {
              network_key: 'TELECEL',
              ref: orderReference,
              recipient: phoneNumber,
              capacity: capacity
            };
            
            logOperation('BULK_GEONETTECH_TELECEL_ORDER', {
              ...geonetOrderPayload,
              purchaseIndex: index
            });
            
            const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
            orderResponse = geonetResponse.data;
            
            if (!orderResponse || !orderResponse.status || orderResponse.status !== 'success') {
              throw new Error(orderResponse?.message || 'Geonettech API error');
            }
            
            apiOrderId = orderResponse.data?.orderId || orderReference;
            
          } else {
            processingMethod = 'telecel_api';
            const telecelResponse = await processTelecelOrder(phoneNumber, capacity, orderReference);
            
            if (!telecelResponse.success) {
              throw new Error(telecelResponse.error?.message || 'Telecel API error');
            }
            
            orderResponse = telecelResponse.data;
            if (telecelResponse.telecelReference) {
              apiOrderId = telecelResponse.telecelReference;
              orderReference = telecelResponse.telecelReference;
            } else {
              apiOrderId = orderReference;
            }
          }
          
        } else if (network === 'AT_PREMIUM') {
          processingMethod = 'geonettech_api';
          const geonetOrderPayload = {
            network_key: 'AT_PREMIUM',
            ref: orderReference,
            recipient: phoneNumber,
            capacity: capacity
          };
          
          logOperation('BULK_GEONETTECH_AT_PREMIUM_ORDER', {
            ...geonetOrderPayload,
            purchaseIndex: index
          });
          
          const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
          orderResponse = geonetResponse.data;
          
          if (!orderResponse || !orderResponse.status || orderResponse.status !== 'success') {
            throw new Error(orderResponse?.message || 'Geonettech API error');
          }
          
          apiOrderId = orderResponse.data?.orderId || orderReference;
          
        } else if (shouldSkipGeonet) {
          processingMethod = 'manual';
          orderStatus = 'pending';
          apiOrderId = orderReference;
          orderResponse = {
            status: 'pending',
            message: 'Order stored for manual processing',
            reference: orderReference,
            processingMethod: 'manual'
          };
          
        } else {
          processingMethod = 'geonettech_api';
          const geonetOrderPayload = {
            network_key: network,
            ref: orderReference,
            recipient: phoneNumber,
            capacity: capacity
          };
          
          logOperation('BULK_GEONETTECH_ORDER', {
            ...geonetOrderPayload,
            purchaseIndex: index
          });
          
          const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
          orderResponse = geonetResponse.data;
          
          if (!orderResponse || !orderResponse.status || orderResponse.status !== 'success') {
            throw new Error(orderResponse?.message || 'Geonettech API error');
          }
          
          apiOrderId = orderResponse.data?.orderId || orderReference;
        }

        const dataPurchase = new DataPurchase({
          userId,
          phoneNumber,
          network,
          capacity,
          gateway: 'wallet',
          method: 'bulk_web',
          price: validatedPrice,
          status: orderStatus,
          geonetReference: orderReference,
          apiOrderId: apiOrderId,
          apiResponse: orderResponse,
          skipGeonettech: shouldSkipGeonet,
          processingMethod: processingMethod,
          orderReferencePrefix: orderReferencePrefix,
          originalReference: (network === 'TELECEL' && skipGeonettech) ? originalInternalReference : null,
          bulkPurchaseReference: bulkTransactionReference
        });

        await dataPurchase.save({ session });
        
        processedPurchases.push({
          index,
          success: true,
          purchase: dataPurchase,
          orderReference,
          apiOrderId,
          processingMethod,
          phoneNumber: safeSubstring(phoneNumber, 0, 3)
        });
        
        successfulTotalCost += validatedPrice;
        
        logOperation('BULK_PURCHASE_ITEM_SUCCESS', {
          purchaseIndex: index,
          orderReference,
          network,
          capacity
        });
        
      } catch (itemError) {
        logOperation('BULK_PURCHASE_ITEM_ERROR', {
          purchaseIndex: validatedPurchase.index,
          error: itemError.message,
          network: validatedPurchase.network
        });
        
        failedPurchases.push({
          index: validatedPurchase.index,
          success: false,
          error: itemError.message,
          purchase: validatedPurchase,
          phoneNumber: safeSubstring(validatedPurchase.phoneNumber, 0, 3)
        });
      }
    }

    if (processedPurchases.length === 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'All purchases in bulk request failed',
        failedPurchases
      });
    }

    const balanceAfter = balanceBefore - successfulTotalCost;

    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: successfulTotalCost,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      status: 'completed',
      reference: bulkTransactionReference,
      gateway: 'wallet',
      description: `Bulk data purchase: ${processedPurchases.length} successful, ${failedPurchases.length} failed`
    });

    await transaction.save({ session });

    user.walletBalance = balanceAfter;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    const summary = {
      totalRequested: purchases.length,
      successfulPurchases: processedPurchases.length,
      failedPurchases: failedPurchases.length,
      totalCostDeducted: successfulTotalCost,
      walletBalance: {
        before: balanceBefore,
        after: balanceAfter,
        deducted: successfulTotalCost
      }
    };

    logOperation('BULK_PURCHASE_COMPLETED', {
      userId,
      ...summary,
      bulkTransactionReference
    });

    res.status(201).json({
      status: failedPurchases.length > 0 ? 'partial_success' : 'success',
      message: failedPurchases.length > 0 
        ? `Bulk purchase partially completed. ${processedPurchases.length} successful, ${failedPurchases.length} failed.`
        : `All ${processedPurchases.length} purchases completed successfully`,
      data: {
        summary,
        transaction: {
          reference: bulkTransactionReference,
          amount: successfulTotalCost,
          balanceChange: balanceAfter - balanceBefore
        },
        successfulPurchases: processedPurchases.map(p => ({
          index: p.index,
          orderReference: p.orderReference,
          apiOrderId: p.apiOrderId,
          phoneNumber: p.phoneNumber,
          processingMethod: p.processingMethod,
          purchaseId: p.purchase._id
        })),
        failedPurchases: failedPurchases.map(f => ({
          index: f.index,
          error: f.error,
          phoneNumber: f.phoneNumber,
          network: f.purchase.network,
          capacity: f.purchase.capacity
        }))
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    logOperation('BULK_PURCHASE_ERROR', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'error',
      message: 'Could not complete bulk purchase. Please try again later.',
      error: error.message
    });
  }
});

// ===== BULK PURCHASE HISTORY ENDPOINT =====
router.get('/bulk-purchase-history/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const userId = req.params.userId;

    logOperation('BULK_PURCHASE_HISTORY_REQUEST', {
      userId,
      page,
      limit,
      startDate,
      endDate
    });

    const filter = { 
      userId,
      description: { $regex: /bulk/i }
    };
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }

    const bulkTransactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(filter);

    const bulkHistoryWithDetails = await Promise.all(
      bulkTransactions.map(async (transaction) => {
        const relatedPurchases = await DataPurchase.find({
          userId,
          bulkPurchaseReference: transaction.reference
        }).select('phoneNumber network capacity price status createdAt');

        return {
          transaction: {
            id: transaction._id,
            reference: transaction.reference,
            amount: transaction.amount,
            balanceBefore: transaction.balanceBefore,
            balanceAfter: transaction.balanceAfter,
            createdAt: transaction.createdAt
          },
          purchases: relatedPurchases
        };
      })
    );

    res.json({
      status: 'success',
      data: {
        bulkPurchases: bulkHistoryWithDetails,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalBulkTransactions: total
        }
      }
    });

  } catch (error) {
    logOperation('BULK_PURCHASE_HISTORY_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bulk purchase history',
      error: error.message
    });
  }
});

// ===== GET PRICING ENDPOINT =====
router.get('/pricing', (req, res) => {
  res.json({
    status: 'success',
    data: {
      pricing: OFFICIAL_PRICING,
      networks: Object.keys(OFFICIAL_PRICING).map(key => ({
        key,
        name: key === 'YELLO' ? 'MTN' : 
              key === 'at' ? 'AirtelTigo' :
              key === 'AT_PREMIUM' ? 'AirtelTigo Premium' :
              key === 'TELECEL' ? 'Telecel' : key,
        capacities: Object.keys(OFFICIAL_PRICING[key]).map(c => parseInt(c))
      }))
    }
  });
});

module.exports = router;