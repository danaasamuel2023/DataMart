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

// FIXED: Use same Geonettech config as working web interface
const GEONETTECH_BASE_URL = 'https://testhub.geonettech.site/api/v1';
const GEONETTECH_API_KEY = '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';

// Add Telcel API constants
const TELCEL_API_URL = 'https://iget.onrender.com/api/developer/orders';
const TELCEL_API_KEY = 'b7975f5ce918b4a253a9c227f651339555094eaee8696ae168e195d09f74617f';

// FIXED: Create Geonettech client with same config as web interface
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
    { capacity: '5', mb: '5000', price: '23.00', network: 'TELECEL' },
    { capacity: '6', mb: '6000', price: '28.00', network: 'TELECEL' },
    { capacity: '8', mb: '8000', price: '28.00', network: 'TELECEL' },
    { capacity: '10', mb: '10000', price: '40.50', network: 'TELECEL' },
    { capacity: '12', mb: '12000', price: '42.50', network: 'TELECEL' },
    { capacity: '15', mb: '15000', price: '60.50', network: 'TELECEL' },
    { capacity: '20', mb: '20000', price: '81.00', network: 'TELECEL' },
    { capacity: '25', mb: '25000', price: '99.00', network: 'TELECEL' },
    { capacity: '30', mb: '30000', price: '118.00', network: 'TELECEL' },
    { capacity: '40', mb: '40000', price: '155.00', network: 'TELECEL' },
    { capacity: '50', mb: '50000', price: '195.00', network: 'TELECEL' },
    
    // MTN Packages
   { capacity: '1', mb: '1000', price: '4.50', network: 'YELLO', inStock: true },
   { capacity: '2', mb: '2000', price: '8.90', network: 'YELLO', inStock: true },
   { capacity: '3', mb: '3000', price: '12.99', network: 'YELLO', inStock: true },
   { capacity: '4', mb: '4000', price: '18.00', network: 'YELLO', inStock: true },
   { capacity: '5', mb: '5000', price: '17.75', network: 'YELLO', inStock: true },
   { capacity: '6', mb: '6000', price: '26.00', network: 'YELLO', inStock: true },
   { capacity: '7', mb: '7000', price: '3.50', network: 'YELLO', inStock: true },
   { capacity: '8', mb: '8000', price: '34.50', network: 'YELLO', inStock: true },
   { capacity: '10', mb: '10000', price: '41.50', network: 'YELLO', inStock: true },
   { capacity: '15', mb: '15000', price: '62.00', network: 'YELLO', inStock: true },
   { capacity: '20', mb: '20000', price: '80.00', network: 'YELLO', inStock: true },
   { capacity: '25', mb: '25000', price: '105.00', network: 'YELLO', inStock: true },
   { capacity: '30', mb: '30000', price: '120.00', network: 'YELLO', inStock: true },
   { capacity: '40', mb: '40000', price: '165.00', network: 'YELLO', inStock: true },
   { capacity: '50', mb: '50000', price: '198.00', network: 'YELLO', inStock: true },
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
    { capacity: '25', mb: '25000', price: '87.00', network: 'at' },
    { capacity: '30', mb: '30000', price: '110.00', network: 'at' },
    { capacity: '40', mb: '40000', price: '145.00', network: 'at' },
    { capacity: '50', mb: '50000', price: '180.00', network: 'at' }
];

// FIXED: Use same balance check as web interface
const checkAgentBalance = async () => {
    try {
        logOperation('AGENT_BALANCE_REQUEST', { timestamp: new Date() });
        
        // FIXED: Use same endpoint as web interface
        const response = await geonetClient.get('/checkBalance');
        
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

// FIXED: Helper function for Telecel API integration - same as web interface
async function processTelecelOrder(recipient, capacity, reference) {
    try {
        // Convert GB to MB if needed (assuming capacity might be in GB)
        const capacityInMB = capacity >= 1 && capacity < 1000 ? capacity * 1000 : capacity;
        
        logOperation('TELECEL_ORDER_REQUEST_PREPARED', {
            recipient,
            capacityGB: capacity,
            capacityMB: capacityInMB,
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

// Updated purchase endpoint with custom reference support (no schema changes)
// Updated purchase endpoint using existing 'method' field
router.post('/purchase', async (req, res, next) => {
    // Determine if this is an API request
    const isApiRequest = !!req.headers['x-api-key'];
    
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
            referrerNumber, // For Hubnet referrer functionality
            ref // Custom reference from developer (optional)
        } = req.body;

        // Determine if this is an API request
        const isApiRequest = !!req.headers['x-api-key'];

        logOperation('DATA_PURCHASE_REQUEST', {
            userId: req.user._id,
            phoneNumber,
            network,
            capacity,
            gateway,
            referrerNumber,
            customReference: ref,
            requestType: isApiRequest ? 'API' : 'WEB',
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

        // Get the inventory record
        const inventory = await DataInventory.findOne({ network }).session(session);
        
        // Check inventory based on request type
        let inStock, skipGeonettech;
        
        if (isApiRequest) {
            // Use API-specific settings
            inStock = inventory ? (inventory.apiInStock !== undefined ? inventory.apiInStock : inventory.inStock) : true;
            skipGeonettech = inventory ? (inventory.apiSkipGeonettech !== undefined ? inventory.apiSkipGeonettech : inventory.skipGeonettech) : false;
        } else {
            // Use Web-specific settings
            inStock = inventory ? (inventory.webInStock !== undefined ? inventory.webInStock : inventory.inStock) : true;
            skipGeonettech = inventory ? (inventory.webSkipGeonettech !== undefined ? inventory.webSkipGeonettech : inventory.skipGeonettech) : false;
        }
        
        logOperation('DATA_INVENTORY_CHECK', {
            network,
            inventoryFound: !!inventory,
            requestType: isApiRequest ? 'API' : 'WEB',
            inStock: inStock,
            skipGeonettech: skipGeonettech,
            webInStock: inventory ? inventory.webInStock : null,
            webSkipGeonettech: inventory ? inventory.webSkipGeonettech : null,
            apiInStock: inventory ? inventory.apiInStock : null,
            apiSkipGeonettech: inventory ? inventory.apiSkipGeonettech : null
        });
        
        // Check if in stock
        if (!inStock) {
            logOperation('DATA_INVENTORY_OUT_OF_STOCK', {
                network,
                inventoryExists: !!inventory,
                requestType: isApiRequest ? 'API' : 'WEB'
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
        
        // Use custom reference if provided, otherwise generate one
        let orderReference;
        if (ref) {
            // Check if custom reference already exists
            const existingOrder = await DataPurchase.findOne({ 
                geonetReference: ref 
            }).session(session);
            
            if (existingOrder) {
                logOperation('DUPLICATE_REFERENCE_ERROR', {
                    providedReference: ref,
                    existingOrderId: existingOrder._id
                });
                
                await session.abortTransaction();
                session.endSession();
                
                return res.status(400).json({
                    status: 'error',
                    message: 'Reference already exists. Please use a unique reference.'
                });
            }
            
            orderReference = ref;
            logOperation('USING_CUSTOM_REFERENCE', { orderReference });
        } else {
            // Generate a random reference if not provided
            orderReference = Math.floor(1000 + Math.random() * 900000).toString();
            logOperation('GENERATED_REFERENCE', { orderReference });
        }

        // Create Transaction
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'purchase',
            amount: price,
            status: 'completed',
            reference: transactionReference,
            gateway
        });

        // PROCESSING SECTION
        let orderResponse = null;
        let apiOrderId = null;
        let orderStatus = 'completed';
        
        // Check if we should skip API calls based on request type
        const shouldSkipApi = skipGeonettech && (network !== 'TELECEL');
        
        logOperation('API_PROCESSING_DECISION', {
            network,
            skipGeonettech: skipGeonettech,
            shouldSkipApi,
            requestType: isApiRequest ? 'API' : 'WEB',
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
                    requestType: isApiRequest ? 'API' : 'WEB',
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
                method: isApiRequest ? 'api' : 'web', // Use existing enum field
                price,
                status: orderStatus,
                hubnetReference: orderReference,
                referrerNumber: referrerNumber || null,
                geonetReference: orderReference,
                apiResponse: orderResponse,
                skipGeonettech: shouldSkipApi
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
                requestType: isApiRequest ? 'API' : 'WEB',
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: responseMessage,
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    orderReference: orderReference,
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
                orderReference,
                requestType: isApiRequest ? 'API' : 'WEB'
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
                method: isApiRequest ? 'api' : 'web', // Use existing enum field
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
                requestType: isApiRequest ? 'API' : 'WEB',
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: 'Data bundle purchased successfully',
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    orderReference: orderReference,
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
                requestType: isApiRequest ? 'API' : 'WEB',
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
                method: isApiRequest ? 'api' : 'web', // Use existing enum field
                price,
                status: orderStatus,
                geonetReference: orderReference,
                apiOrderId: apiOrderId,
                apiResponse: orderResponse,
                skipGeonettech: true
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
                requestType: isApiRequest ? 'API' : 'WEB',
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: 'Order placed successfully and is pending processing',
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    orderReference: orderReference,
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
            // For YELLO network, use Geonettech API
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

                // Use SAME format as web interface - single object, not array
                const geonetOrderPayload = {
                    network_key: network,
                    ref: orderReference,
                    recipient: phoneNumber,
                    capacity: capacity
                };
                
                logOperation('GEONETTECH_ORDER_REQUEST', geonetOrderPayload);
                
                // Use same endpoint as web interface
                const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
                
                logOperation('GEONETTECH_ORDER_RESPONSE', {
                    status: geonetResponse.status,
                    data: geonetResponse.data
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
                method: isApiRequest ? 'api' : 'web', // Use existing enum field
                price,
                status: orderStatus,
                geonetReference: orderReference,
                apiOrderId: apiOrderId,
                apiResponse: orderResponse,
                skipGeonettech: false
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
                requestType: isApiRequest ? 'API' : 'WEB',
                newWalletBalance: req.user.walletBalance
            });

            res.status(201).json({
                status: 'success',
                message: 'Data bundle purchased successfully',
                data: {
                    purchaseId: dataPurchase._id,
                    transactionReference: transaction.reference,
                    orderReference: orderReference,
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
// NEW ENDPOINT: Check order status by reference
router.get('/order-status/:reference', async (req, res, next) => {
    // Support both authentication methods
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    try {
        const { reference } = req.params;
        
        if (!reference) {
            return res.status(400).json({
                status: 'error',
                message: 'Reference is required'
            });
        }

        // Find order by geonetReference (which now stores both custom and generated references)
        const order = await DataPurchase.findOne({
            userId: req.user._id,
            $or: [
                { geonetReference: reference },
                { hubnetReference: reference }
            ]
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found with the provided reference'
            });
        }

        // Return order details
        res.json({
            status: 'success',
            data: {
                orderId: order._id,
                reference: reference,
                phoneNumber: order.phoneNumber,
                network: order.network,
                capacity: order.capacity,
                mb: order.mb,
                price: order.price,
                orderStatus: order.status,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                apiResponse: order.apiResponse // Include if they need to see API response
            }
        });

    } catch (error) {
        logOperation('ORDER_STATUS_CHECK_ERROR', {
            reference: req.params.reference,
            error: error.message
        });

        res.status(500).json({
            status: 'error',
            message: 'Failed to check order status'
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