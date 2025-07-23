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
    DataInventory
} = require('../schema/schema');

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'DatAmArt';

// FIXED: Use same Geonettech config as working web interface
const GEONETTECH_BASE_URL = 'https://testhub.geonettech.site/api/v1';
const GEONETTECH_API_KEY = '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';

// Add Telcel API constants
const TELCEL_API_URL = 'https://iget.onrender.com/api/developer/orders';
const TELCEL_API_KEY = '76013fa9c8bf774ac7fb35db5e586fb7852a618cbf57b9ddb072fc2c465e5fe8';

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
   { capacity: '5', mb: '5000', price: '22.75', network: 'YELLO', inStock: true },
   { capacity: '6', mb: '6000', price: '26.00', network: 'YELLO', inStock: true },
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

// Updated purchase endpoint with balance tracking
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

        // Re-fetch user within transaction to ensure latest balance
        const user = await User.findById(req.user._id).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Store balance before transaction
        const balanceBefore = user.walletBalance;

        logOperation('DATA_PURCHASE_USER_FOUND', {
            userId: user._id,
            balanceBefore: balanceBefore,
            requestedPurchaseAmount: price
        });

        // Check wallet balance
        if (balanceBefore < price) {
            logOperation('DATA_PURCHASE_INSUFFICIENT_BALANCE', {
                userId: user._id,
                walletBalance: balanceBefore,
                requiredAmount: price,
                shortfall: price - balanceBefore
            });
            
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient wallet balance',
                currentBalance: balanceBefore,
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
            skipGeonettech: skipGeonettech
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

        // Calculate balance after transaction
        const balanceAfter = balanceBefore - price;

        // Create Transaction with balance tracking
        const transaction = new Transaction({
            userId: user._id,
            type: 'purchase',
            amount: price,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            status: 'completed',
            reference: transactionReference,
            gateway,
            description: `Data purchase: ${capacity}GB ${network} for ${phoneNumber}`
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
            requestType: isApiRequest ? 'API' : 'WEB'
        });

        // Process based on network
        if (network === 'at') {
            // Process AT network through Hubnet
            if (shouldSkipApi) {
                orderStatus = 'pending';
                apiOrderId = orderReference;
                orderResponse = {
                    status: 'pending',
                    message: 'Order stored as pending - Hubnet API disabled',
                    reference: orderReference
                };
            } else {
                // Process through Hubnet API
                const volumeInMB = parseFloat(capacity) * 1000;
                const networkCode = 'at';

                try {
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

                    if (!hubnetResponse.ok) {
                        await session.abortTransaction();
                        session.endSession();
                        
                        return res.status(400).json({
                            status: 'error',
                            message: hubnetData.message || 'Could not complete your purchase. Please try again later.'
                        });
                    }

                    orderStatus = 'completed';
                    orderResponse = hubnetData;
                    apiOrderId = orderReference;
                    
                } catch (hubnetError) {
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: 'Unable to process your order. Please try again later.'
                    });
                }
            }

        } else if (network === 'TELECEL') {
            // Always use Telecel API for Telecel network
            const telecelResponse = await processTelecelOrder(phoneNumber, capacity, orderReference);
            
            if (!telecelResponse.success) {
                await session.abortTransaction();
                session.endSession();
                
                return res.status(400).json({
                    status: 'error',
                    message: telecelResponse.error.message || 'Could not complete your purchase. Please try again later.'
                });
            }
            
            orderResponse = telecelResponse.data;
            orderStatus = 'completed';
            apiOrderId = telecelResponse.orderId || orderReference;

        } else if (shouldSkipApi) {
            // Skip Geonettech API - store as pending
            orderStatus = 'pending';
            apiOrderId = orderReference;
            orderResponse = {
                status: 'pending',
                message: 'Order stored as pending - API disabled',
                reference: orderReference
            };

        } else {
            // Use Geonettech API for YELLO network
            try {
                const agentBalance = await checkAgentBalance();
                
                if (agentBalance < price) {
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: 'Service provider out of stock'
                    });
                }

                const geonetOrderPayload = {
                    network_key: network,
                    ref: orderReference,
                    recipient: phoneNumber,
                    capacity: capacity
                };
                
                const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
                
                if (!geonetResponse.data || !geonetResponse.data.status || geonetResponse.data.status !== 'success') {
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: geonetResponse.data?.message || 'Could not complete your purchase. Please try again later.'
                    });
                }

                orderStatus = 'completed';
                orderResponse = geonetResponse.data;
                apiOrderId = orderResponse.data?.orderId || orderReference;
                
            } catch (apiError) {
                await session.abortTransaction();
                session.endSession();
                
                return res.status(400).json({
                    status: 'error',
                    message: apiError.response?.data?.message || 'Could not complete your purchase. Please try again later.'
                });
            }
        }

        // Create Data Purchase with reference
        const dataPurchase = new DataPurchase({
            userId: user._id,
            phoneNumber,
            network,
            capacity,
            mb: dataPackage.mb,
            gateway,
            method: isApiRequest ? 'api' : 'web',
            price,
            status: orderStatus,
            geonetReference: orderReference,
            apiOrderId: apiOrderId,
            apiResponse: orderResponse,
            skipGeonettech: shouldSkipApi,
            hubnetReference: network === 'at' ? orderReference : null,
            referrerNumber: referrerNumber || null
        });

        // Link transaction to purchase
        transaction.relatedPurchaseId = dataPurchase._id;

        // Update user wallet balance
        user.walletBalance = balanceAfter;

        logOperation('USER_WALLET_UPDATE', {
            userId: user._id,
            balanceBefore,
            balanceAfter,
            deduction: price
        });

        // Save entities to database
        await dataPurchase.save({ session });
        await transaction.save({ session });
        await user.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        // Prepare response message based on order status
        let responseMessage = 'Data bundle purchased successfully';
        if (orderStatus === 'pending') {
            responseMessage = 'Order placed successfully and is pending processing';
        }

        logOperation('DATA_PURCHASE_SUCCESS', {
            userId: user._id,
            orderStatus,
            orderReference,
            balanceBefore,
            balanceAfter,
            requestType: isApiRequest ? 'API' : 'WEB'
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
                balanceBefore,
                balanceAfter,
                remainingBalance: balanceAfter,
                orderStatus: orderStatus,
                apiResponse: orderResponse
            }
        });

    } catch (error) {
        // Rollback transaction
        await session.abortTransaction();
        session.endSession();
        
        logOperation('DATA_PURCHASE_ERROR', {
            message: error.message,
            stack: error.stack
        });

        res.status(500).json({
            status: 'error',
            message: 'Could not complete your purchase. Please try again later.'
        });
    }
});

// Check order status by reference
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

        // Find order by geonetReference
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

        // Get related transaction for balance info
        const transaction = await Transaction.findOne({
            userId: req.user._id,
            relatedPurchaseId: order._id
        });

        // Return order details with balance info
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
                balanceInfo: transaction ? {
                    balanceBefore: transaction.balanceBefore,
                    balanceAfter: transaction.balanceAfter,
                    balanceChange: transaction.balanceAfter - transaction.balanceBefore
                } : null,
                apiResponse: order.apiResponse
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

// Get Purchase History with balance tracking
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

        // Get related transactions for balance info
        const purchaseIds = purchases.map(p => p._id);
        const transactions = await Transaction.find({
            relatedPurchaseId: { $in: purchaseIds }
        });

        // Create a map of purchase ID to transaction
        const transactionMap = {};
        transactions.forEach(tx => {
            transactionMap[tx.relatedPurchaseId.toString()] = tx;
        });

        // Enhance purchases with balance info
        const enhancedPurchases = purchases.map(purchase => {
            const transaction = transactionMap[purchase._id.toString()];
            return {
                ...purchase.toObject(),
                balanceInfo: transaction ? {
                    balanceBefore: transaction.balanceBefore,
                    balanceAfter: transaction.balanceAfter,
                    balanceChange: transaction.balanceAfter - transaction.balanceBefore
                } : null
            };
        });

        const total = await DataPurchase.countDocuments({ userId });

        res.json({
            status: 'success',
            data: {
                purchases: enhancedPurchases,
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

// Get Transaction History with balance tracking
router.get('/transactions', async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;

        const filter = { userId: req.user._id };
        if (type) {
            filter.type = type;
        }

        const transactions = await Transaction.find(filter)
            .populate('relatedPurchaseId', 'phoneNumber network capacity')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Transaction.countDocuments(filter);

        // Format transactions with balance info
        const formattedTransactions = transactions.map(tx => ({
            _id: tx._id,
            type: tx.type,
            amount: tx.amount,
            balanceBefore: tx.balanceBefore,
            balanceAfter: tx.balanceAfter,
            balanceChange: tx.balanceAfter - tx.balanceBefore,
            isCredit: tx.balanceAfter > tx.balanceBefore,
            status: tx.status,
            reference: tx.reference,
            gateway: tx.gateway,
            description: tx.description,
            relatedPurchase: tx.relatedPurchaseId,
            createdAt: tx.createdAt
        }));

        res.json({
            status: 'success',
            data: {
                transactions: formattedTransactions,
                currentBalance: req.user.walletBalance,
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

// Referral Bonus Claiming with balance tracking
router.post('/claim-referral-bonus', async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Re-fetch user within transaction
        const user = await User.findById(req.user._id).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Find pending referral bonuses for the user
        const pendingBonuses = await ReferralBonus.find({ 
            userId: user._id, 
            status: 'pending' 
        }).session(session);

        if (pendingBonuses.length === 0) {
            await session.abortTransaction();
            session.endSession();
            
            return res.json({
                status: 'success',
                message: 'No pending bonuses to claim',
                data: {
                    bonusClaimed: 0,
                    processedBonuses: [],
                    currentBalance: user.walletBalance
                }
            });
        }

        const balanceBefore = user.walletBalance;
        let totalBonus = 0;
        const processedBonuses = [];

        for (let bonus of pendingBonuses) {
            totalBonus += bonus.amount;
            bonus.status = 'credited';
            await bonus.save({ session });
            processedBonuses.push(bonus._id);
        }

        const balanceAfter = balanceBefore + totalBonus;

        // Create transaction record for bonus claim with balance tracking
        const transaction = new Transaction({
            userId: user._id,
            type: 'deposit',
            amount: totalBonus,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            status: 'completed',
            reference: `BONUS-${uuidv4()}`,
            gateway: 'system',
            description: `Referral bonus claim: ${processedBonuses.length} bonus(es)`
        });

        // Update user wallet
        user.walletBalance = balanceAfter;
        
        await transaction.save({ session });
        await user.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            status: 'success',
            message: 'Referral bonus claimed successfully',
            data: {
                bonusClaimed: totalBonus,
                processedBonuses,
                balanceBefore,
                balanceAfter,
                newWalletBalance: balanceAfter,
                transactionId: transaction._id
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;