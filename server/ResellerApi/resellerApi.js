const express = require('express');
const router = express.Router();
const axios = require('axios');

const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const { 
    User, 
    DataPurchase, 
    Transaction, 
    ReferralBonus,
    ApiKey,
    DataInventory // Added DataInventory to schema imports
} = require('../schema/schema');

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'DatAmArt';

const GEONETTECH_BASE_URL = 'https://posapi.geonettech.com/api/v1';
const GEONETTECH_API_KEY = process.env.GEONETTECH_API_KEY || '21|rkrw7bcoGYjK8irAOTMaZ8sc1LRHYcwjuZnZmMNw4a6196f1';

// Add Telcel API constants
const TELCEL_API_URL = 'https://iget.onrender.com/api/developer/orders';
const TELCEL_API_KEY = 'b7975f5ce918b4a253a9c227f651339555094eaee8696ae168e195d09f74617f';

// Create Geonettech client
const geonetClient = axios.create({
  baseURL: GEONETTECH_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GEONETTECH_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Create Telcel client
const telcelClient = axios.create({
  baseURL: TELCEL_API_URL,
  headers: {
    'X-API-Key': TELCEL_API_KEY,
    'Content-Type': 'application/json'
  }
});

const logOperation = (operation, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
  };

// Data Package Pricing for all networks
const DATA_PACKAGES = [
    // TELECEL Packages
  // { capacity: '1', mb: '1000', price: '3.65', network: 'TELECEL' },
    // { capacity: '2', mb: '2000', price: '7.30', network: 'TELECEL' },
    // { capacity: '3', mb: '3000', price: '11.20', network: 'TELECEL' },
    // { capacity: '4', mb: '4000', price: '14.00', network: 'TELECEL' },
    { capacity: '5', mb: '5000', price: '23.00', network: 'TELECEL' },
    { capacity: '6', mb: '6000', price: '28.00', network: 'TELECEL' },
    { capacity: '8', mb: '8000', price: '28.00', network: 'TELECEL' },
    { capacity: '10', mb: '10000', price: '35.50', network: 'TELECEL' },
    { capacity: '12', mb: '12000', price: '42.50', network: 'TELECEL' },
    { capacity: '15', mb: '15000', price: '55.50', network: 'TELECEL' },
    { capacity: '20', mb: '20000', price: '75.00', network: 'TELECEL' },
    { capacity: '25', mb: '25000', price: '92.00', network: 'TELECEL' },
    { capacity: '30', mb: '30000', price: '110.00', network: 'TELECEL' },
    { capacity: '40', mb: '40000', price: '145.00', network: 'TELECEL' },
    { capacity: '50', mb: '50000', price: '180.00', network: 'TELECEL' },
    
    // MTN Packages
   { capacity: '1', mb: '1000', price: '4.7', network: 'YELLO', inStock: true },
   { capacity: '2', mb: '2000', price: '9.500', network: 'YELLO', inStock: true },
   { capacity: '3', mb: '3000', price: '13.5', network: 'YELLO', inStock: true },
   { capacity: '4', mb: '4000', price: '18.00', network: 'YELLO', inStock: true },
   { capacity: '5', mb: '5000', price: '22.50', network: 'YELLO', inStock: true },
   { capacity: '6', mb: '6000', price: '27.00', network: 'YELLO', inStock: true },
   { capacity: '7', mb: '7000', price: '31.50', network: 'YELLO', inStock: true },
   { capacity: '8', mb: '8000', price: '35.50', network: 'YELLO', inStock: true },
   { capacity: '10', mb: '10000', price: '43.50', network: 'YELLO', inStock: true },
   { capacity: '15', mb: '15000', price: '62.50', network: 'YELLO', inStock: true },
   { capacity: '20', mb: '20000', price: '85.00', network: 'YELLO', inStock: true },
   { capacity: '25', mb: '25000', price: '105.00', network: 'YELLO', inStock: true },
   { capacity: '30', mb: '30000', price: '128.00', network: 'YELLO', inStock: true },
   { capacity: '40', mb: '40000', price: '165.00', network: 'YELLO', inStock: true },
   { capacity: '50', mb: '50000', price: '206.00', network: 'YELLO', inStock: true },
   { capacity: '100', mb: '100000', price: '406.00', network: 'YELLO', inStock: true },
    // AirtelTigo Packages
    { capacity: '1', mb: '1000', price: '3.9', network: 'at' },
    { capacity: '2', mb: '2000', price: '8.30', network: 'at' },
    { capacity: '3', mb: '3000', price: '13.20', network: 'at' },
    { capacity: '4', mb: '4000', price: '16.00', network: 'at' },
    { capacity: '5', mb: '5000', price: '19.00', network: 'at' },
    { capacity: '6', mb: '6000', price: '23.00', network: 'at' },
    { capacity: '8', mb: '8000', price: '30.00', network: 'at' },
    { capacity: '10', mb: '10000', price: '37.50', network: 'at' },
    { capacity: '12', mb: '12000', price: '42.50', network: 'at' },
    { capacity: '15', mb: '15000', price: '54.50', network: 'at' },
    // { capacity: '20', mb: '20000', price: '75.00', network: 'at' },
    { capacity: '25', mb: '25000', price: '87.00', network: 'at' },
    { capacity: '30', mb: '30000', price: '110.00', network: 'at' },
    { capacity: '40', mb: '40000', price: '145.00', network: 'at' },
    { capacity: '50', mb: '50000', price: '180.00', network: 'at' }
];


const checkAgentBalance = async () => {
    try {
        logOperation('AGENT_BALANCE_REQUEST', { timestamp: new Date() });
        
        const response = await geonetClient.get('/wallet/balance');
        
        logOperation('AGENT_BALANCE_RESPONSE', {
            status: response.status,
            data: response.data
        });
        
        return parseFloat(response.data.data.balance.replace(/,/g, ''));
    } catch (error) {
        logOperation('AGENT_BALANCE_ERROR', {
            message: error.message,
            response: error.response ? error.response.data : null,
            stack: error.stack
        });
        
        throw new Error('Failed to fetch agent balance: ' + error.message);
    }
};
// Authentication Middleware (JWT for web, keep for backward compatibility)
// Modified authentication middleware to check multiple sources for the token
const authenticateUser = async (req, res, next) => {
    // Try to get token from various sources
    const token = 
        req.headers['authorization'] || 
        req.query.token ||
        req.cookies.token || 
        (req.body && req.body.token);
    
    console.log('Token received:', token ? 'exists' : 'missing');
    
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'No token provided'
        });
    }

    try {
        // Remove 'Bearer ' prefix if it exists
        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
        
        console.log('Token for verification:', tokenString.substring(0, 20) + '...');
        
        const decoded = jwt.verify(tokenString, JWT_SECRET);
        console.log('Decoded token:', decoded);
        
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token - user not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
            details: error.message
        });
    }
};
// Generate API Key
const generateApiKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

// API Key Authentication Middleware
const authenticateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            status: 'error',
            message: 'No API key provided'
        });
    }

    try {
        const keyRecord = await ApiKey.findOne({ 
            key: apiKey,
            isActive: true
        }).populate('userId');
        
        if (!keyRecord) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or inactive API key'
            });
        }

        // Check if key is expired
        if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
            return res.status(401).json({
                status: 'error',
                message: 'API key has expired'
            });
        }

        // Update last used timestamp
        keyRecord.lastUsed = new Date();
        await keyRecord.save();

        req.user = keyRecord.userId;
        next();
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
            details: error.message
        });
    }
};

// Find data package by capacity and network
const findDataPackage = (capacity, network) => {
    const dataPackage = DATA_PACKAGES.find(
        pkg => pkg.capacity === capacity && pkg.network === network
    );
    
    if (!dataPackage) {
        throw new Error(`Invalid data package requested: ${capacity}GB for ${network}`);
    }
    
    return {
        ...dataPackage,
        price: parseFloat(dataPackage.price)
    };
};

// Create new API key
router.post('/generate-api-key', authenticateUser, async (req, res) => {
    try {
        const { name, expiresIn } = req.body;
        
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'API key name is required'
            });
        }

        // Generate a new API key
        const key = generateApiKey();
        
        // Calculate expiration date if provided
        let expiryDate = null;
        if (expiresIn) {
            expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + parseInt(expiresIn));
        }

        // Create a new API key record
        const apiKey = new ApiKey({
            userId: req.user._id,
            key,
            name,
            expiresAt: expiryDate,
            isActive: true,
            createdAt: new Date(),
            lastUsed: null
        });

        await apiKey.save();

        res.status(201).json({
            status: 'success',
            data: {
                key,
                name,
                expiresAt: expiryDate,
                id: apiKey._id
            },
            message: 'API key generated successfully. Please save this key as it will not be displayed again.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// List user's API keys
router.get('/api-keys', authenticateUser, async (req, res) => {
    try {
        const apiKeys = await ApiKey.find({ 
            userId: req.user._id 
        }).select('-key'); // Don't send the actual key for security

        res.json({
            status: 'success',
            data: apiKeys
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Revoke an API key
router.delete('/api-keys/:id', authenticateUser, async (req, res) => {
    try {
        const apiKey = await ApiKey.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!apiKey) {
            return res.status(404).json({
                status: 'error',
                message: 'API key not found'
            });
        }

        // Deactivate the key
        apiKey.isActive = false;
        await apiKey.save();

        res.json({
            status: 'success',
            message: 'API key revoked successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Endpoint to get available data packages by network
router.get('/data-packages', async (req, res) => {
    try {
        const { network } = req.query;
        
        if (network) {
            const packages = DATA_PACKAGES.filter(pkg => pkg.network === network);
            res.json({
                status: 'success',
                data: packages
            });
        } else {
            // Group packages by network
            const networkPackages = {};
            DATA_PACKAGES.forEach(pkg => {
                if (!networkPackages[pkg.network]) {
                    networkPackages[pkg.network] = [];
                }
                networkPackages[pkg.network].push(pkg);
            });
            
            res.json({
                status: 'success',
                data: networkPackages
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Helper function for Telecel API integration
async function processTelecelOrder(recipient, capacity, reference) {
    try {
        logOperation('TELECEL_ORDER_REQUEST_PREPARED', {
            recipient,
            capacity,
            reference
        });
        
        // Format payload for Telecel API 
        const telecelPayload = {
            recipientNumber: recipient,
            capacity: capacity, // Use GB for Telecel API
            bundleType: "Telecel-5959", // Specific bundle type required for Telecel
            reference: reference,
        };
        
        logOperation('TELECEL_ORDER_REQUEST', telecelPayload);
        
        // Call Telecel API to process the order
        const response = await axios.post(
            'https://iget.onrender.com/api/developer/orders/place',
            telecelPayload,
            { 
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': TELCEL_API_KEY
                } 
            }
        );
        
        logOperation('TELECEL_ORDER_RESPONSE', response.data);
        
        return {
            success: true,
            data: response.data,
            orderId: response.data.orderReference || response.data.transactionId || response.data.id || reference
        };
    } catch (error) {
        logOperation('TELECEL_ORDER_ERROR', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
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

router.post('/purchase', async (req, res, next) => {
    // First try API key authentication
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    // Fallback to JWT token authentication
    return authenticateUser(req, res, next);
}, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { 
            phoneNumber, 
            network, 
            capacity, 
            gateway,
            referrerNumber // Added to support Hubnet referrer functionality
        } = req.body;

        logOperation('DATA_PURCHASE_REQUEST', {
            userId: req.user._id,
            phoneNumber,
            network,
            capacity,
            gateway,
            referrerNumber,
            timestamp: new Date()
        });

        // Validate required fields
        if (!phoneNumber || !network || !capacity || !gateway) {
            logOperation('DATA_PURCHASE_VALIDATION_ERROR', {
                missingFields: {
                    phoneNumber: !phoneNumber,
                    network: !network,
                    capacity: !capacity,
                    gateway: !gateway
                }
            });
            
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Get package details from server-side pricing data
        const dataPackage = findDataPackage(capacity, network);
        const price = dataPackage.price;

        logOperation('DATA_PURCHASE_USER_FOUND', {
            userId: req.user._id,
            currentBalance: req.user.walletBalance,
            requestedPurchaseAmount: price
        });

        // Check wallet balance
        if (req.user.walletBalance < price) {
            logOperation('DATA_PURCHASE_INSUFFICIENT_BALANCE', {
                userId: req.user._id,
                walletBalance: req.user.walletBalance,
                requiredAmount: price,
                shortfall: price - req.user.walletBalance
            });
            
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient wallet balance',
                currentBalance: req.user.walletBalance,
                requiredAmount: price
            });
        }

        // NEW: Check inventory/stock status for the network
        const inventory = await DataInventory.findOne({ network }).session(session);
        
        logOperation('DATA_INVENTORY_CHECK', {
            network,
            inventoryFound: !!inventory,
            inStock: inventory ? inventory.inStock : false,
            skipGeonettech: inventory ? inventory.skipGeonettech : false
        });
        
        // If inventory doesn't exist or inStock is false, return error immediately
        if (!inventory || !inventory.inStock) {
            logOperation('DATA_INVENTORY_OUT_OF_STOCK', {
                network,
                inventoryExists: !!inventory
            });
            
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: `${network} data bundles are currently out of stock. Please try again later or choose another network.`
            });
        }

        // Generate unique references
        const transactionReference = `TRX-${uuidv4()}`;
        const orderReference = Math.floor(1000 + Math.random() * 900000); // Generates a number between 1000 and 9999

        // Create Transaction
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'purchase',
            amount: price,
            status: 'completed', // Transaction is always completed (money deducted)
            reference: transactionReference,
            gateway
        });

        // PROCESSING SECTION
        let orderResponse = null;
        let apiOrderId = null;
        let orderStatus = 'completed'; // Default status
        
        // Check if we should skip API calls (from inventory state)
        const shouldSkipApi = inventory.skipGeonettech && (network !== 'TELECEL');
        
        logOperation('API_PROCESSING_DECISION', {
            network,
            skipGeonettech: inventory.skipGeonettech,
            shouldSkipApi,
            reason: shouldSkipApi 
                ? 'API disabled for this network' 
                : 'Normal API processing'
        });

        // If network is AT_PREMIUM, route to Hubnet instead of Geonettech
        if (network === 'at') {
            if (shouldSkipApi) {
                // Skip Hubnet API - store as pending
                logOperation('SKIPPING_HUBNET_API', {
                    network,
                    phoneNumber,
                    capacity,
                    orderReference,
                    reason: 'API disabled for this network'
                });
                
                orderStatus = 'pending';
                apiOrderId = orderReference;
                orderResponse = {
                    status: 'pending',
                    message: 'Order stored as pending - Hubnet API disabled',
                    reference: orderReference,
                    skipReason: 'API disabled for network'
                };
            } else {
                // Convert data amount from GB to MB for Hubnet API
                const volumeInMB = parseFloat(capacity) * 1000;

                // Get network code for Hubnet - for AT_PREMIUM, it should be 'at'
                const networkCode = 'at';

                logOperation('HUBNET_ORDER_REQUEST_PREPARED', {
                    networkCode,
                    phoneNumber,
                    volumeInMB,
                    reference: orderReference,
                    referrer: referrerNumber || phoneNumber,
                    timestamp: new Date()
                });

                try {
                    // Make request to Hubnet API
                    const hubnetResponse = await fetch(`https://console.hubnet.app/live/api/context/business/transaction/${networkCode}-new-transaction`, {
                        method: 'POST',
                        headers: {
                            'token': 'Bearer KN5CxVxXYWCrKDyHBOwvNj1gbMSiWTw5FL5',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            phone: phoneNumber,
                            volume: volumeInMB,
                            reference: orderReference,
                            referrer: referrerNumber || phoneNumber,
                            webhook: ''
                        })
                    });

                    const hubnetData = await hubnetResponse.json();

                    logOperation('HUBNET_ORDER_RESPONSE', {
                        status: hubnetResponse.status,
                        ok: hubnetResponse.ok,
                        data: hubnetData,
                        timestamp: new Date()
                    });

                    if (!hubnetResponse.ok) {
                        logOperation('HUBNET_ORDER_FAILED', {
                            error: hubnetData.message || 'Unknown error',
                            status: hubnetResponse.status
                        });
                        
                        await session.abortTransaction();
                        session.endSession();
                        
                        return res.status(400).json({
                            status: 'error',
                            message: hubnetData.message || 'Could not complete your purchase. Please try again later.'
                        });
                    }

                    // Update status if successful
                    orderStatus = 'completed';
                    orderResponse = hubnetData;
                    apiOrderId = orderReference;
                    
                } catch (hubnetError) {
                    logOperation('HUBNET_API_EXCEPTION', {
                        error: hubnetError.message,
                        stack: hubnetError.stack,
                        orderReference
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: 'Unable to process your order. Please try again later.'
                    });
                }
            }

            // Create Data Purchase with Hubnet reference
            const dataPurchase = new DataPurchase({
                userId: req.user._id,
                phoneNumber,
                network,
                capacity,
                mb: dataPackage.mb,
                gateway,
                method: 'api',
                price,
                status: orderStatus,
                hubnetReference: orderReference,
                referrerNumber: referrerNumber || null,
                geonetReference: orderReference, // Keep this for compatibility
                apiResponse: orderResponse,
                skipGeonettech: shouldSkipApi // Track if API was skipped
            });

            // Deduct wallet balance
            const previousBalance = req.user.walletBalance;
            req.user.walletBalance -= price;

            logOperation('USER_WALLET_UPDATE', {
                userId: req.user._id,
                previousBalance,
                newBalance: req.user.walletBalance,
                deduction: price
            });

            // Save entities to database
            await dataPurchase.save({ session });
            await transaction.save({ session });
            await req.user.save({ session });

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            // Prepare response message based on order status
            let responseMessage = 'Data bundle purchased successfully';
            if (orderStatus === 'pending') {
                responseMessage = 'Order placed successfully and is pending processing';
            }

            logOperation('DATA_PURCHASE_SUCCESS', {
                userId: req.user._id,
                orderStatus,
                orderReference,
                skipApi: shouldSkipApi,
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: responseMessage,
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    network,
                    capacity,
                    mb: dataPackage.mb,
                    price,
                    remainingBalance: req.user.walletBalance,
                    orderStatus: orderStatus,
                    skipApi: shouldSkipApi,
                    hubnetResponse: orderResponse
                }
            });

        } else if (network === 'TELECEL') {
            // Always use Telecel API for Telecel network (never skip)
            logOperation('USING_TELECEL_API', {
                network,
                phoneNumber,
                capacity,
                orderReference
            });
            
            // Try to process the Telecel order
            const telecelResponse = await processTelecelOrder(phoneNumber, capacity, orderReference);
            
            // If the API call failed, abort the transaction and return error
            if (!telecelResponse.success) {
                logOperation('TELECEL_API_ERROR', {
                    error: telecelResponse.error,
                    orderReference
                });
                
                await session.abortTransaction();
                session.endSession();
                
                // Extract the exact error message from Telecel if available
                let errorMessage = 'Could not complete your purchase. Please try again later.';
                
                if (telecelResponse.error && telecelResponse.error.message) {
                    errorMessage = telecelResponse.error.message;
                }
                
                if (telecelResponse.error && telecelResponse.error.details && 
                    typeof telecelResponse.error.details === 'object' && 
                    telecelResponse.error.details.message) {
                    errorMessage = telecelResponse.error.details.message;
                }
                
                return res.status(400).json({
                    status: 'error',
                    message: errorMessage
                });
            }
            
            // If we got here, the API call succeeded
            orderResponse = telecelResponse.data;
            orderStatus = 'completed';
            
            // Extract order ID if available
            if (telecelResponse.data && 
                telecelResponse.data.data && 
                telecelResponse.data.data.order && 
                telecelResponse.data.data.order.orderReference) {
                apiOrderId = telecelResponse.data.data.order.orderReference;
            } else {
                apiOrderId = telecelResponse.orderId || orderReference;
            }
            
            logOperation('TELECEL_ORDER_SUCCESS', {
                orderId: apiOrderId,
                orderReference
            });

            // Create Data Purchase with reference
            const dataPurchase = new DataPurchase({
                userId: req.user._id,
                phoneNumber,
                network,
                capacity,
                mb: dataPackage.mb,
                gateway,
                method: 'api',
                price,
                status: orderStatus,
                geonetReference: orderReference,
                apiOrderId: apiOrderId,
                apiResponse: orderResponse,
                skipGeonettech: false // Never skip for TELECEL
            });

            // Deduct wallet balance
            const previousBalance = req.user.walletBalance;
            req.user.walletBalance -= price;

            logOperation('USER_WALLET_UPDATE', {
                userId: req.user._id,
                previousBalance,
                newBalance: req.user.walletBalance,
                deduction: price
            });

            // Save entities to database
            await dataPurchase.save({ session });
            await transaction.save({ session });
            await req.user.save({ session });

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            logOperation('DATA_PURCHASE_SUCCESS', {
                userId: req.user._id,
                orderStatus,
                orderReference,
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: 'Data bundle purchased successfully',
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    network,
                    capacity,
                    mb: dataPackage.mb,
                    price,
                    remainingBalance: req.user.walletBalance,
                    orderStatus: orderStatus,
                    telecelResponse: orderResponse
                }
            });

        } else if (shouldSkipApi) {
            // Skip Geonettech API - store as pending
            logOperation('SKIPPING_GEONETTECH_API', {
                network,
                phoneNumber,
                capacity,
                orderReference,
                reason: 'Geonettech API disabled for this network'
            });
            
            orderStatus = 'pending';
            apiOrderId = orderReference;
            orderResponse = {
                status: 'pending',
                message: 'Order stored as pending - Geonettech API disabled',
                reference: orderReference,
                skipReason: 'API disabled for network'
            };

            // Create Data Purchase with reference
            const dataPurchase = new DataPurchase({
                userId: req.user._id,
                phoneNumber,
                network,
                capacity,
                mb: dataPackage.mb,
                gateway,
                method: 'api',
                price,
                status: orderStatus,
                geonetReference: orderReference,
                apiOrderId: apiOrderId,
                apiResponse: orderResponse,
                skipGeonettech: true // Track that API was skipped
            });

            // Deduct wallet balance
            const previousBalance = req.user.walletBalance;
            req.user.walletBalance -= price;

            logOperation('USER_WALLET_UPDATE', {
                userId: req.user._id,
                previousBalance,
                newBalance: req.user.walletBalance,
                deduction: price
            });

            // Save entities to database
            await dataPurchase.save({ session });
            await transaction.save({ session });
            await req.user.save({ session });

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            logOperation('DATA_PURCHASE_SUCCESS', {
                userId: req.user._id,
                orderStatus,
                orderReference,
                skipGeonettech: true,
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: 'Order placed successfully and is pending processing',
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    network,
                    capacity,
                    mb: dataPackage.mb,
                    price,
                    remainingBalance: req.user.walletBalance,
                    orderStatus: orderStatus,
                    skipGeonettech: true
                }
            });

        } else {
            // For YELLO network, use Geonettech API normally
            try {
                // Check agent wallet balance (only needed for Geonettech)
                const agentBalance = await checkAgentBalance();
                
                logOperation('AGENT_BALANCE_RESULT', {
                    balance: agentBalance,
                    requiredAmount: price,
                    sufficient: agentBalance >= price
                });
                
                if (agentBalance < price) {
                    logOperation('AGENT_INSUFFICIENT_BALANCE', {
                        agentBalance,
                        requiredAmount: price
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: 'Service provider out of stock'
                    });
                }

                // Place order with Geonettech
                logOperation('GEONETTECH_ORDER_REQUEST_PREPARED', {
                    network_key: network,
                    ref: orderReference,
                    recipient: phoneNumber,
                    capacity: capacity,
                    timestamp: new Date()
                });

                const geonetOrderPayload = [{
                    network_key: network,
                    ref: orderReference,
                    recipient: phoneNumber,
                    capacity: capacity
                }];
                
                logOperation('GEONETTECH_ORDER_REQUEST', geonetOrderPayload);
                
                const geonetResponse = await geonetClient.post('/orders', geonetOrderPayload);
                
                logOperation('GEONETTECH_ORDER_RESPONSE', {
                    status: geonetResponse.status,
                    statusText: geonetResponse.statusText,
                    headers: geonetResponse.headers,
                    data: geonetResponse.data,
                    timestamp: new Date()
                });

                // Check if the response indicates success
                if (!geonetResponse.data || !geonetResponse.data.status || geonetResponse.data.status !== 'success') {
                    logOperation('GEONETTECH_API_UNSUCCESSFUL_RESPONSE', {
                        response: geonetResponse.data,
                        orderReference
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    // Extract the message but don't expose API details
                    let errorMessage = 'Could not complete your purchase. Please try again later.';
                    
                    if (geonetResponse.data && geonetResponse.data.message) {
                        const msg = geonetResponse.data.message.toLowerCase();
                        
                        if (msg.includes('duplicate') || msg.includes('within 5 minutes')) {
                            errorMessage = 'A similar order was recently placed. Please wait a few minutes before trying again.';
                        } else if (msg.includes('invalid') || msg.includes('phone')) {
                            errorMessage = 'The phone number you entered appears to be invalid. Please check and try again.';
                        } else {
                            errorMessage = geonetResponse.data.message;
                        }
                    }
                    
                    return res.status(400).json({
                        status: 'error',
                        message: errorMessage
                    });
                }

                // Update status if successful
                orderStatus = 'completed';
                orderResponse = geonetResponse.data;
                apiOrderId = orderResponse.data ? orderResponse.data.orderId : orderReference;
                
                logOperation('GEONETTECH_ORDER_SUCCESS', {
                    orderId: apiOrderId,
                    responseData: orderResponse
                });

            } catch (apiError) {
                // Log the error and abort transaction
                logOperation('GEONETTECH_API_ERROR', {
                    error: apiError.message,
                    response: apiError.response ? apiError.response.data : null,
                    orderReference
                });
                
                await session.abortTransaction();
                session.endSession();
                
                // Just pass through the exact error message from the API without any modification
                let errorMessage = 'Could not complete your purchase. Please try again later.';
                
                // If there's a specific message from the API, use it directly
                if (apiError.response && apiError.response.data && apiError.response.data.message) {
                    errorMessage = apiError.response.data.message;
                }
                
                return res.status(400).json({
                    status: 'error',
                    message: errorMessage
                });
            }

            // Create Data Purchase with reference
            const dataPurchase = new DataPurchase({
                userId: req.user._id,
                phoneNumber,
                network,
                capacity,
                mb: dataPackage.mb,
                gateway,
                method: 'api',
                price,
                status: orderStatus,
                geonetReference: orderReference,
                apiOrderId: apiOrderId,
                apiResponse: orderResponse,
                skipGeonettech: false // Normal API processing
            });

            // Deduct wallet balance
            const previousBalance = req.user.walletBalance;
            req.user.walletBalance -= price;

            logOperation('USER_WALLET_UPDATE', {
                userId: req.user._id,
                previousBalance,
                newBalance: req.user.walletBalance,
                deduction: price
            });

            // Save entities to database
            await dataPurchase.save({ session });
            await transaction.save({ session });
            await req.user.save({ session });

            // Commit transaction
            await session.commitTransaction();
            session.endSession();

            logOperation('DATA_PURCHASE_SUCCESS', {
                userId: req.user._id,
                orderStatus,
                orderReference,
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: 'Data bundle purchased successfully',
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    network,
                    capacity,
                    mb: dataPackage.mb,
                    price,
                    remainingBalance: req.user.walletBalance,
                    orderStatus: orderStatus,
                    geonetechResponse: orderResponse
                }
            });
        }

    } catch (error) {
        // Rollback transaction
        await session.abortTransaction();
        session.endSession();
        
        logOperation('DATA_PURCHASE_ERROR', {
            message: error.message,
            stack: error.stack,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : null,
            request: error.request ? {
                method: error.request.method,
                path: error.request.path,
                headers: error.request.headers
            } : null
        });

        res.status(500).json({
            status: 'error',
            message: 'Could not complete your purchase. Please try again later.'
        });
    }
});


// Get Purchase History (support both authentication methods)
router.get('/purchase-history/:userId', async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Ensure user can only access their own purchase history
        if (req.user._id.toString() !== userId) {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized access to purchase history'
            });
        }

        const purchases = await DataPurchase.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await DataPurchase.countDocuments({ userId });

        res.json({
            status: 'success',
            data: {
                purchases,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get Transaction History (support both authentication methods)
router.get('/transactions', async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Transaction.countDocuments({ userId: req.user._id });

        res.json({
            status: 'success',
            data: {
                transactions,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Referral Bonus Claiming (support both authentication methods)
router.post('/claim-referral-bonus', async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            // Find pending referral bonuses for the user
            const pendingBonuses = await ReferralBonus.find({ 
                userId: req.user._id, 
                status: 'pending' 
            });

            let totalBonus = 0;
            const processedBonuses = [];

            for (let bonus of pendingBonuses) {
                totalBonus += bonus.amount;
                bonus.status = 'credited';
                await bonus.save({ session });
                processedBonuses.push(bonus._id);
            }

            // Update user wallet
            req.user.walletBalance += totalBonus;
            await req.user.save({ session });

            res.json({
                status: 'success',
                data: {
                    bonusClaimed: totalBonus,
                    processedBonuses,
                    newWalletBalance: req.user.walletBalance
                }
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    } finally {
        await session.endSession();
    }
});

module.exports = router;