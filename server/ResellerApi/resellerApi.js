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
    DataInventory,
    ApiUserProcessing
} = require('../schema/schema');

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'DatAmArt';

// FIXED: Use same Geonettech config as working web interface
const GEONETTECH_BASE_URL = 'https://testhub.geonettech.site/api/v1';
const GEONETTECH_API_KEY = '42|tjhxBxaWWe4mPUpxXN1uIk0KTxypvlSqOIOQWz6K162aa0d6';

// Add Telecel API constants
const TELECEL_API_URL = 'https://iget.onrender.com/api/developer/orders/place';
const TELECEL_API_KEY = '76013fa9c8bf774ac7fb35db5e586fb7852a618cbf57b9ddb072fc2c465e5fe8';

// FIXED: Create Geonettech client with same config as web interface
const geonetClient = axios.create({
  baseURL: GEONETTECH_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GEONETTECH_API_KEY}`,
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
    { capacity: '5', mb: '5000', price: '19.50', network: 'TELECEL' },
    { capacity: '8', mb: '8000', price: '34.64', network: 'TELECEL' },
    { capacity: '10', mb: '10000', price: '36.50', network: 'TELECEL' },
    { capacity: '12', mb: '12000', price: '43.70', network: 'TELECEL' },
    { capacity: '15', mb: '15000', price: '52.85', network: 'TELECEL' },
    { capacity: '20', mb: '20000', price: '69.80', network: 'TELECEL' },
    { capacity: '25', mb: '25000', price: '86.75', network: 'TELECEL' },
    { capacity: '30', mb: '30000', price: '103.70', network: 'TELECEL' },
    { capacity: '35', mb: '35000', price: '120.65', network: 'TELECEL' },
    { capacity: '40', mb: '40000', price: '137.60', network: 'TELECEL' },
    { capacity: '45', mb: '45000', price: '154.55', network: 'TELECEL' },
    { capacity: '50', mb: '50000', price: '171.50', network: 'TELECEL' },
    { capacity: '100', mb: '100000', price: '341.00', network: 'TELECEL' },
    
    // MTN Packages
    { capacity: '1', mb: '1000', price: '4.40', network: 'YELLO', inStock: true },
    { capacity: '2', mb: '2000', price: '8.80', network: 'YELLO', inStock: true },
    { capacity: '3', mb: '3000', price: '13.00', network: 'YELLO', inStock: true },
    { capacity: '4', mb: '4000', price: '18.00', network: 'YELLO', inStock: true },
    { capacity: '5', mb: '5000', price: '23.00', network: 'YELLO', inStock: true },
    { capacity: '6', mb: '6000', price: '26.00', network: 'YELLO', inStock: true },
    { capacity: '8', mb: '8000', price: '34.00', network: 'YELLO', inStock: true },
    { capacity: '10', mb: '10000', price: '42.00', network: 'YELLO', inStock: true },
    { capacity: '15', mb: '15000', price: '60.50', network: 'YELLO', inStock: true },
    { capacity: '20', mb: '20000', price: '81.00', network: 'YELLO', inStock: true },
    { capacity: '25', mb: '25000', price: '103.00', network: 'YELLO', inStock: true },
    { capacity: '30', mb: '30000', price: '127.00', network: 'YELLO', inStock: true },
    { capacity: '40', mb: '40000', price: '164.00', network: 'YELLO', inStock: true },
    { capacity: '50', mb: '50000', price: '202.00', network: 'YELLO', inStock: true },
    { capacity: '100', mb: '100000', price: '407.00', network: 'YELLO', inStock: true },
    
    // AirtelTigo Packages
    { capacity: '1', mb: '1000', price: '3.95', network: 'at' },
    { capacity: '2', mb: '2000', price: '8.35', network: 'at' },
    { capacity: '3', mb: '3000', price: '13.25', network: 'at' },
    { capacity: '4', mb: '4000', price: '16.50', network: 'at' },
    { capacity: '5', mb: '5000', price: '19.50', network: 'at' },
    { capacity: '6', mb: '6000', price: '23.50', network: 'at' },
    { capacity: '8', mb: '8000', price: '30.50', network: 'at' },
    { capacity: '10', mb: '10000', price: '38.50', network: 'at' },
    { capacity: '12', mb: '12000', price: '45.50', network: 'at' },
    { capacity: '15', mb: '15000', price: '57.50', network: 'at' },
    { capacity: '25', mb: '25000', price: '95.00', network: 'at' },
    { capacity: '30', mb: '30000', price: '115.00', network: 'at' },
    { capacity: '40', mb: '40000', price: '151.00', network: 'at' },
    { capacity: '50', mb: '50000', price: '190.00', network: 'at' },
    
    // AT_PREMIUM Packages (same pricing as regular 'at')
    { capacity: '1', mb: '1000', price: '3.95', network: 'AT_PREMIUM' },
    { capacity: '2', mb: '2000', price: '8.35', network: 'AT_PREMIUM' },
    { capacity: '3', mb: '3000', price: '13.25', network: 'AT_PREMIUM' },
    { capacity: '4', mb: '4000', price: '16.50', network: 'AT_PREMIUM' },
    { capacity: '5', mb: '5000', price: '19.50', network: 'AT_PREMIUM' },
    { capacity: '6', mb: '6000', price: '23.50', network: 'AT_PREMIUM' },
    { capacity: '8', mb: '8000', price: '30.50', network: 'AT_PREMIUM' },
    { capacity: '10', mb: '10000', price: '38.50', network: 'AT_PREMIUM' },
    { capacity: '12', mb: '12000', price: '45.50', network: 'AT_PREMIUM' },
    { capacity: '15', mb: '15000', price: '57.50', network: 'AT_PREMIUM' },
    { capacity: '25', mb: '25000', price: '95.00', network: 'AT_PREMIUM' },
    { capacity: '30', mb: '30000', price: '115.00', network: 'AT_PREMIUM' },
    { capacity: '40', mb: '40000', price: '151.00', network: 'AT_PREMIUM' },
    { capacity: '50', mb: '50000', price: '190.00', network: 'AT_PREMIUM' }
];

// Phone number validation function
const validatePhoneNumber = (network, phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
    
    switch (network) {
        case 'YELLO': // MTN validation
            const mtnPrefixes = ['024', '054', '055', '059','026','025','053','027','057','023','020', '050'];
            if (cleanNumber.length === 10 && cleanNumber.startsWith('0')) {
                const prefix = cleanNumber.substring(0, 3);
                if (mtnPrefixes.includes(prefix)) {
                    return { isValid: true, message: '' };
                } else {
                    return { isValid: false, message: 'Please enter a valid MTN number (024, 054, 055, 059)' };
                }
            } else {
                return { isValid: false, message: 'Please enter a valid 10-digit MTN number starting with 0' };
            }
            
        case 'at': // AirtelTigo validation
        case 'AT_PREMIUM': // AT_PREMIUM uses same prefixes as regular at
            const airtelTigoPrefixes = ['026', '056', '027', '057', '023', '053'];
            if (cleanNumber.length === 10) {
                const prefix = cleanNumber.substring(0, 3);
                if (airtelTigoPrefixes.includes(prefix)) {
                    return { isValid: true, message: '' };
                } else {
                    return { isValid: false, message: 'Please enter a valid AirtelTigo number (026, 056, 027, 057, 023, 053)' };
                }
            } else {
                return { isValid: false, message: 'Please enter a valid 10-digit AirtelTigo number' };
            }
            
        case 'TELECEL': // Telecel validation
            const telecelPrefixes = ['020', '050'];
            const cleanTelecelNumber = phoneNumber.trim().replace(/[\s-]/g, '');
            if (cleanTelecelNumber.length === 10) {
                const prefix = cleanTelecelNumber.substring(0, 3);
                if (telecelPrefixes.includes(prefix)) {
                    return { isValid: true, message: '' };
                } else {
                    return { isValid: false, message: 'Please enter a valid Telecel number (020, 050)' };
                }
            } else {
                return { isValid: false, message: 'Please enter a valid 10-digit Telecel number' };
            }
            
        default:
            return { isValid: false, message: 'Unsupported network' };
    }
};

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

// Helper function to generate mixed reference
function generateMixedReference(prefix = '') {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let reference = prefix;
    
    // Add 2 random letters
    for (let i = 0; i < 2; i++) {
        reference += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Add 4 random numbers
    for (let i = 0; i < 4; i++) {
        reference += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    // Add 2 more random letters
    for (let i = 0; i < 2; i++) {
        reference += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    return reference;
}

// FIXED: Helper function for Telecel API integration - same as web interface
async function processTelecelOrder(recipient, capacity, reference) {
    try {
        const capacityInMB = capacity >= 1 && capacity < 1000 ? capacity * 1000 : capacity;
        
        logOperation('TELECEL_ORDER_REQUEST_PREPARED', {
            recipient,
            capacityGB: capacity,
            capacityMB: capacityInMB,
            reference
        });
        
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
                } 
            }
        );
        
        logOperation('TELECEL_ORDER_RESPONSE', {
            status: response.status,
            data: response.data,
            fullResponse: JSON.stringify(response.data, null, 2)
        });
        
        // Extract the Telecel order reference from the response
        let telecelOrderReference = null;
        
        if (response.data?.data?.order?.orderReference) {
            telecelOrderReference = response.data.data.order.orderReference;
        } else if (response.data?.data?.orderReference) {
            telecelOrderReference = response.data.data.orderReference;
        } else if (response.data?.orderReference) {
            telecelOrderReference = response.data.orderReference;
        } else if (response.data?.data?.reference) {
            telecelOrderReference = response.data.data.reference;
        } else if (response.data?.reference) {
            telecelOrderReference = response.data.reference;
        } else if (response.data?.data?.order?.id) {
            telecelOrderReference = response.data.data.order.id;
        } else if (response.data?.data?.id) {
            telecelOrderReference = response.data.data.id;
        }
        
        logOperation('TELECEL_ORDER_REFERENCE_EXTRACTED', {
            telecelOrderReference,
            originalReference: reference
        });
        
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

// Helper function to update user usage stats
async function updateUserUsageStats(userProcessingPrefs, session) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    
    // Reset daily counter if needed
    if (userProcessingPrefs.currentUsage.dailyOrders.date < today) {
        userProcessingPrefs.currentUsage.dailyOrders = {
            count: 1,
            date: today
        };
    } else {
        userProcessingPrefs.currentUsage.dailyOrders.count += 1;
    }
    
    // Reset hourly counter if needed
    if (userProcessingPrefs.currentUsage.hourlyOrders.hour < currentHour) {
        userProcessingPrefs.currentUsage.hourlyOrders = {
            count: 1,
            hour: currentHour
        };
    } else {
        userProcessingPrefs.currentUsage.hourlyOrders.count += 1;
    }
    
    // Update total orders and last order time
    userProcessingPrefs.currentUsage.totalOrders += 1;
    userProcessingPrefs.currentUsage.lastOrderAt = now;
    
    await userProcessingPrefs.save({ session });
}

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

// Updated purchase endpoint with user-specific processing control
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
            ref // Custom reference from developer (optional)
        } = req.body;

        // Determine if this is an API request
        const isApiRequest = !!req.headers['x-api-key'];

        logOperation('DATA_PURCHASE_REQUEST', {
            userId: req.user._id,
            phoneNumber: phoneNumber?.substring(0, 3) + 'XXXXXXX',
            network,
            capacity,
            gateway,
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

        // Validate phone number
        const phoneValidation = validatePhoneNumber(network, phoneNumber);
        if (!phoneValidation.isValid) {
            logOperation('PHONE_VALIDATION_FAILED', {
                network,
                phoneNumber: phoneNumber.substring(0, 3) + 'XXXXXXX',
                validationMessage: phoneValidation.message
            });
            
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: phoneValidation.message
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

        // NEW: Get user-specific API processing preferences
        let userProcessingPrefs = null;
        let userProcessingSource = 'global_default';
        let userProcessingRule = 'global_default';
        
        if (isApiRequest) {
            userProcessingPrefs = await ApiUserProcessing.findOne({ 
                userId: req.user._id 
            }).session(session);
            
            if (userProcessingPrefs) {
                // Check if user account is active
                if (userProcessingPrefs.status !== 'active') {
                    await session.abortTransaction();
                    session.endSession();
                    
                    let message = 'Your API account is not active.';
                    if (userProcessingPrefs.status === 'suspended' && userProcessingPrefs.suspensionReason) {
                        message += ` Reason: ${userProcessingPrefs.suspensionReason}`;
                    }
                    
                    return res.status(403).json({
                        status: 'error',
                        message,
                        accountStatus: userProcessingPrefs.status
                    });
                }
                
                // Check daily limit if set
                if (userProcessingPrefs.orderLimits.dailyOrderLimit) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Reset counter if it's a new day
                    if (userProcessingPrefs.currentUsage.dailyOrders.date < today) {
                        userProcessingPrefs.currentUsage.dailyOrders = {
                            count: 0,
                            date: today
                        };
                        await userProcessingPrefs.save({ session });
                    }
                    
                    if (userProcessingPrefs.currentUsage.dailyOrders.count >= userProcessingPrefs.orderLimits.dailyOrderLimit) {
                        await session.abortTransaction();
                        session.endSession();
                        
                        return res.status(429).json({
                            status: 'error',
                            message: 'Daily order limit exceeded. Please try again tomorrow.',
                            limit: userProcessingPrefs.orderLimits.dailyOrderLimit,
                            current: userProcessingPrefs.currentUsage.dailyOrders.count
                        });
                    }
                }
                
                // Check hourly limit if set
                if (userProcessingPrefs.orderLimits.hourlyOrderLimit) {
                    const currentHour = new Date();
                    currentHour.setMinutes(0, 0, 0);
                    
                    // Reset counter if it's a new hour
                    if (userProcessingPrefs.currentUsage.hourlyOrders.hour < currentHour) {
                        userProcessingPrefs.currentUsage.hourlyOrders = {
                            count: 0,
                            hour: currentHour
                        };
                        await userProcessingPrefs.save({ session });
                    }
                    
                    if (userProcessingPrefs.currentUsage.hourlyOrders.count >= userProcessingPrefs.orderLimits.hourlyOrderLimit) {
                        await session.abortTransaction();
                        session.endSession();
                        
                        return res.status(429).json({
                            status: 'error',
                            message: 'Hourly order limit exceeded. Please try again later.',
                            limit: userProcessingPrefs.orderLimits.hourlyOrderLimit,
                            current: userProcessingPrefs.currentUsage.hourlyOrders.count
                        });
                    }
                }
                
                // Check order amount limits
                const capacityNum = parseInt(capacity);
                if (userProcessingPrefs.orderLimits.maxOrderAmount && capacityNum > userProcessingPrefs.orderLimits.maxOrderAmount) {
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: `Maximum order amount is ${userProcessingPrefs.orderLimits.maxOrderAmount}GB`,
                        requested: capacityNum,
                        maxAllowed: userProcessingPrefs.orderLimits.maxOrderAmount
                    });
                }
                
                if (userProcessingPrefs.orderLimits.minOrderAmount && capacityNum < userProcessingPrefs.orderLimits.minOrderAmount) {
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: `Minimum order amount is ${userProcessingPrefs.orderLimits.minOrderAmount}GB`,
                        requested: capacityNum,
                        minRequired: userProcessingPrefs.orderLimits.minOrderAmount
                    });
                }
                
                // Check if network is enabled for this user
                if (userProcessingPrefs.networkSettings[network] && 
                    userProcessingPrefs.networkSettings[network].enabled === false) {
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(403).json({
                        status: 'error',
                        message: `${network} network is not enabled for your API account.`
                    });
                }
                
                // Check for duplicate orders if not allowed
                if (!userProcessingPrefs.settings.allowDuplicateOrders) {
                    const timeWindow = userProcessingPrefs.settings.duplicateOrderTimeWindow || 5;
                    const timeAgo = new Date();
                    timeAgo.setMinutes(timeAgo.getMinutes() - timeWindow);
                    
                    const duplicateOrder = await DataPurchase.findOne({
                        userId: user._id,
                        phoneNumber,
                        network,
                        capacity,
                        createdAt: { $gte: timeAgo }
                    }).session(session);
                    
                    if (duplicateOrder) {
                        await session.abortTransaction();
                        session.endSession();
                        
                        return res.status(400).json({
                            status: 'error',
                            message: `Duplicate order detected. Please wait ${timeWindow} minutes before placing the same order.`,
                            previousOrderId: duplicateOrder._id,
                            previousOrderTime: duplicateOrder.createdAt
                        });
                    }
                }
            }
        }

        // Get the inventory record
        const inventory = await DataInventory.findOne({ network }).session(session);
        
        // Determine processing method with user-specific overrides
        let inStock, skipGeonettech;
        
        if (isApiRequest && userProcessingPrefs) {
            // Handle different processing priorities
            if (userProcessingPrefs.processingPriority === 'always_manual') {
                skipGeonettech = true;
                userProcessingSource = 'always_manual_priority';
                userProcessingRule = 'user_specific';
            } else if (userProcessingPrefs.processingPriority === 'always_api') {
                skipGeonettech = false;
                userProcessingSource = 'always_api_priority';
                userProcessingRule = 'user_specific';
            } else if (userProcessingPrefs.processingPriority === 'inventory_first') {
                // Use inventory settings first
                skipGeonettech = inventory ? 
                    (inventory.apiSkipGeonettech !== undefined ? 
                        inventory.apiSkipGeonettech : inventory.skipGeonettech) : false;
                userProcessingSource = 'inventory_first_priority';
                userProcessingRule = 'inventory_default';
            } else {
                // Default: user_override - Check user-specific settings first
                const networkSetting = userProcessingPrefs.networkSettings[network];
                
                if (networkSetting && networkSetting.skipGeonettech !== null) {
                    skipGeonettech = networkSetting.skipGeonettech;
                    userProcessingSource = 'network-specific';
                    userProcessingRule = 'user_specific';
                    
                    logOperation('USER_SPECIFIC_NETWORK_SETTING', {
                        userId: req.user._id,
                        network,
                        skipGeonettech,
                        source: 'network-specific'
                    });
                } else if (userProcessingPrefs.globalSkipGeonettech !== null) {
                    skipGeonettech = userProcessingPrefs.globalSkipGeonettech;
                    userProcessingSource = 'global-user-setting';
                    userProcessingRule = 'user_specific';
                    
                    logOperation('USER_SPECIFIC_GLOBAL_SETTING', {
                        userId: req.user._id,
                        network,
                        skipGeonettech,
                        source: 'global-user-setting'
                    });
                } else {
                    // Fall back to inventory settings
                    skipGeonettech = inventory ? 
                        (inventory.apiSkipGeonettech !== undefined ? 
                            inventory.apiSkipGeonettech : inventory.skipGeonettech) : false;
                    userProcessingSource = 'inventory-default';
                    userProcessingRule = 'inventory_default';
                    
                    logOperation('INVENTORY_DEFAULT_SETTING', {
                        userId: req.user._id,
                        network,
                        skipGeonettech,
                        source: 'inventory-default'
                    });
                }
            }
            
            // Stock status still from inventory
            inStock = inventory ? 
                (inventory.apiInStock !== undefined ? 
                    inventory.apiInStock : inventory.inStock) : true;
        } else if (isApiRequest) {
            // API user without specific preferences - use inventory settings
            inStock = inventory ? 
                (inventory.apiInStock !== undefined ? 
                    inventory.apiInStock : inventory.inStock) : true;
            skipGeonettech = inventory ? 
                (inventory.apiSkipGeonettech !== undefined ? 
                    inventory.apiSkipGeonettech : inventory.skipGeonettech) : false;
            userProcessingSource = 'inventory-default';
            userProcessingRule = 'inventory_default';
        } else {
            // Web user - use web-specific settings
            inStock = inventory ? 
                (inventory.webInStock !== undefined ? 
                    inventory.webInStock : inventory.inStock) : true;
            skipGeonettech = inventory ? 
                (inventory.webSkipGeonettech !== undefined ? 
                    inventory.webSkipGeonettech : inventory.skipGeonettech) : false;
            userProcessingSource = 'web-inventory';
            userProcessingRule = 'inventory_default';
        }
        
        logOperation('DATA_INVENTORY_CHECK', {
            network,
            inventoryFound: !!inventory,
            requestType: isApiRequest ? 'API' : 'WEB',
            hasUserPrefs: !!userProcessingPrefs,
            userStatus: userProcessingPrefs?.status,
            processingPriority: userProcessingPrefs?.processingPriority,
            inStock: inStock,
            skipGeonettech: skipGeonettech,
            userProcessingSource,
            userProcessingRule
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

        // Check if manual approval is required
        if (userProcessingPrefs && userProcessingPrefs.settings.requireManualApproval) {
            logOperation('MANUAL_APPROVAL_REQUIRED', {
                userId: user._id,
                network,
                capacity
            });
            
            // Still process but mark for manual approval
            skipGeonettech = true;
            userProcessingSource = 'manual_approval_required';
        }

        // Generate unique references
        const transactionReference = `TRX-${uuidv4()}`;
        
        // Determine order reference prefix based on processing method
        let orderReferencePrefix = '';
        if (network === 'TELECEL') {
            if (!skipGeonettech) {
                orderReferencePrefix = 'GN-TC-'; // Geonettech Telecel prefix
            } else {
                orderReferencePrefix = 'TC-'; // Direct Telecel API prefix
            }
        } else if (network === 'AT_PREMIUM') {
            orderReferencePrefix = 'ATP-'; // Special prefix for AT_PREMIUM
        } else if (skipGeonettech && network !== 'AT_PREMIUM') {
            orderReferencePrefix = 'MN-'; // Manual processing prefix
        } else {
            orderReferencePrefix = 'GN-'; // General Geonettech prefix
        }
        
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
            // Generate a mixed reference if not provided
            orderReference = generateMixedReference(orderReferencePrefix);
            logOperation('GENERATED_REFERENCE', { orderReference });
        }

        const originalInternalReference = orderReference;

        // Calculate balance after transaction
        const balanceAfter = balanceBefore - price;

        // PROCESSING SECTION
        let orderResponse = null;
        let apiOrderId = null;
        let orderStatus = 'completed';
        let processingMethod = 'api';
        
        // Determine if we should skip Geonettech
        // Note: AT_PREMIUM always uses Geonettech, never skip
        const shouldSkipGeonet = skipGeonettech && (network !== 'AT_PREMIUM');
        
        logOperation('API_PROCESSING_DECISION', {
            network,
            skipGeonettech: skipGeonettech,
            shouldSkipGeonet,
            orderReference,
            prefix: orderReferencePrefix,
            requestType: isApiRequest ? 'API' : 'WEB',
            isATPremium: network === 'AT_PREMIUM',
            isTelecel: network === 'TELECEL',
            userProcessingSource,
            userProcessingRule
        });

        // FIXED: Process based on network - matching web route logic
        if (network === 'TELECEL') {
            // Check if we should use Geonettech or Telecel API
            if (!skipGeonettech) {
                // Use Geonettech API for Telecel when not skipped
                processingMethod = 'geonettech_api';
                try {
                    const geonetOrderPayload = {
                        network_key: 'TELECEL', // Use TELECEL as the network key for Geonettech
                        ref: orderReference,
                        recipient: phoneNumber,
                        capacity: capacity
                    };
                    
                    logOperation('GEONETTECH_TELECEL_ORDER_REQUEST', {
                        ...geonetOrderPayload,
                        processingMethod,
                        requestType: isApiRequest ? 'API' : 'WEB'
                    });
                    
                    const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
                    orderResponse = geonetResponse.data;
                    
                    if (!orderResponse || !orderResponse.status || orderResponse.status !== 'success') {
                        logOperation('GEONETTECH_TELECEL_API_UNSUCCESSFUL_RESPONSE', {
                            response: orderResponse,
                            orderReference
                        });
                        
                        await session.abortTransaction();
                        session.endSession();
                        
                        let errorMessage = 'Could not complete your purchase. Please try again later.';
                        
                        if (orderResponse && orderResponse.message) {
                            const msg = orderResponse.message.toLowerCase();
                            
                            if (msg.includes('duplicate') || msg.includes('within 5 minutes')) {
                                errorMessage = 'A similar order was recently placed. Please wait a few minutes before trying again.';
                            } else if (msg.includes('invalid') || msg.includes('phone')) {
                                errorMessage = 'The phone number you entered appears to be invalid. Please check and try again.';
                            } else {
                                errorMessage = orderResponse.message;
                            }
                        }
                        
                        return res.status(400).json({
                            status: 'error',
                            message: errorMessage
                        });
                    }
                    
                    apiOrderId = orderResponse.data ? orderResponse.data.orderId : orderReference;
                    orderStatus = 'completed';
                    
                    logOperation('GEONETTECH_TELECEL_ORDER_SUCCESS', {
                        orderId: apiOrderId,
                        orderReference,
                        processingMethod,
                        responseData: orderResponse
                    });
                } catch (apiError) {
                    logOperation('GEONETTECH_TELECEL_API_ERROR', {
                        error: apiError.message,
                        response: apiError.response ? apiError.response.data : null,
                        orderReference
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    let errorMessage = 'Could not complete your purchase. Please try again later.';
                    
                    if (apiError.response && apiError.response.data && apiError.response.data.message) {
                        errorMessage = apiError.response.data.message;
                    }
                    
                    return res.status(400).json({
                        status: 'error',
                        message: errorMessage
                    });
                }
            } else {
                // When skipGeonettech is true for Telecel, use the Telecel API
                processingMethod = 'telecel_api';
                logOperation('USING_TELECEL_API', {
                    network,
                    phoneNumber: phoneNumber.substring(0, 3) + 'XXXXXXX',
                    capacity,
                    orderReference,
                    requestType: isApiRequest ? 'API' : 'WEB',
                    skipGeonettech: true
                });
                
                try {
                    const telecelResponse = await processTelecelOrder(phoneNumber, capacity, orderReference);
                    
                    if (!telecelResponse.success) {
                        logOperation('TELECEL_API_ERROR', {
                            error: telecelResponse.error,
                            orderReference
                        });
                        
                        await session.abortTransaction();
                        session.endSession();
                        
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
                    
                    orderResponse = telecelResponse.data;
                    orderStatus = 'completed';
                    
                    if (telecelResponse.telecelReference) {
                        apiOrderId = telecelResponse.telecelReference;
                        orderReference = telecelResponse.telecelReference;
                        
                        logOperation('TELECEL_REFERENCE_UPDATE', {
                            originalReference: originalInternalReference,
                            telecelReference: telecelResponse.telecelReference,
                            finalReference: orderReference
                        });
                    } else {
                        apiOrderId = orderReference;
                        logOperation('TELECEL_NO_REFERENCE_RETURNED', {
                            usingOriginalReference: orderReference
                        });
                    }
                    
                    logOperation('TELECEL_ORDER_SUCCESS', {
                        orderId: apiOrderId,
                        orderReference: orderReference,
                        telecelReference: telecelResponse.telecelReference,
                        originalInternalReference: originalInternalReference,
                        processingMethod
                    });
                } catch (telecelError) {
                    logOperation('TELECEL_API_EXCEPTION', {
                        error: telecelError.message,
                        stack: telecelError.stack,
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
        } else if (network === 'AT_PREMIUM') {
            // AT_PREMIUM always uses Geonettech API
            processingMethod = 'geonettech_api';
            try {
                const geonetOrderPayload = {
                    network_key: 'AT_PREMIUM', // Use AT_PREMIUM as the network key
                    ref: orderReference,
                    recipient: phoneNumber,
                    capacity: capacity
                };
                
                logOperation('GEONETTECH_AT_PREMIUM_ORDER_REQUEST', {
                    ...geonetOrderPayload,
                    processingMethod,
                    requestType: isApiRequest ? 'API' : 'WEB'
                });
                
                const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
                orderResponse = geonetResponse.data;
                
                if (!orderResponse || !orderResponse.status || orderResponse.status !== 'success') {
                    logOperation('GEONETTECH_AT_PREMIUM_API_UNSUCCESSFUL_RESPONSE', {
                        response: orderResponse,
                        orderReference
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    let errorMessage = 'Could not complete your purchase. Please try again later.';
                    
                    if (orderResponse && orderResponse.message) {
                        const msg = orderResponse.message.toLowerCase();
                        
                        if (msg.includes('duplicate') || msg.includes('within 5 minutes')) {
                            errorMessage = 'A similar order was recently placed. Please wait a few minutes before trying again.';
                        } else if (msg.includes('invalid') || msg.includes('phone')) {
                            errorMessage = 'The phone number you entered appears to be invalid. Please check and try again.';
                        } else {
                            errorMessage = orderResponse.message;
                        }
                    }
                    
                    return res.status(400).json({
                        status: 'error',
                        message: errorMessage
                    });
                }
                
                apiOrderId = orderResponse.data ? orderResponse.data.orderId : orderReference;
                orderStatus = 'completed';
                
                logOperation('GEONETTECH_AT_PREMIUM_ORDER_SUCCESS', {
                    orderId: apiOrderId,
                    orderReference,
                    processingMethod,
                    responseData: orderResponse
                });
            } catch (apiError) {
                logOperation('GEONETTECH_AT_PREMIUM_API_ERROR', {
                    error: apiError.message,
                    response: apiError.response ? apiError.response.data : null,
                    orderReference
                });
                
                await session.abortTransaction();
                session.endSession();
                
                let errorMessage = 'Could not complete your purchase. Please try again later.';
                
                if (apiError.response && apiError.response.data && apiError.response.data.message) {
                    errorMessage = apiError.response.data.message;
                }
                
                return res.status(400).json({
                    status: 'error',
                    message: errorMessage
                });
            }
        } else if (shouldSkipGeonet) {
            // Skip Geonettech API - store as pending for all networks when skipGeonettech is true
            processingMethod = 'manual';
            logOperation('SKIPPING_GEONETTECH_API', {
                network,
                phoneNumber: phoneNumber.substring(0, 3) + 'XXXXXXX',
                capacity,
                orderReference,
                processingMethod,
                requestType: isApiRequest ? 'API' : 'WEB',
                userProcessingSource
            });
            
            orderStatus = userProcessingPrefs?.settings?.requireManualApproval ? 'waiting' : 'pending';
            apiOrderId = orderReference;
            orderResponse = {
                status: orderStatus,
                message: userProcessingPrefs?.settings?.requireManualApproval ? 
                    'Order requires manual approval' : 
                    'Order stored for manual processing',
                reference: orderReference,
                processingMethod: 'manual',
                skipReason: userProcessingSource
            };
        } else {
            // Use Geonettech API for other networks (YELLO, at) when skipGeonettech is false
            processingMethod = 'geonettech_api';
            try {
                // Check agent balance before processing
                const agentBalance = await checkAgentBalance();
                
                if (agentBalance < price) {
                    logOperation('AGENT_INSUFFICIENT_BALANCE', {
                        agentBalance,
                        requiredAmount: price,
                        network
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    return res.status(400).json({
                        status: 'error',
                        message: 'Service provider temporarily out of stock. Please try again later.'
                    });
                }

                const geonetOrderPayload = {
                    network_key: network, // Use the network directly (YELLO or at)
                    ref: orderReference,
                    recipient: phoneNumber,
                    capacity: capacity
                };
                
                logOperation('GEONETTECH_ORDER_REQUEST', {
                    ...geonetOrderPayload,
                    processingMethod,
                    requestType: isApiRequest ? 'API' : 'WEB'
                });
                
                const geonetResponse = await geonetClient.post('/placeOrder', geonetOrderPayload);
                orderResponse = geonetResponse.data;
                
                if (!orderResponse || !orderResponse.status || orderResponse.status !== 'success') {
                    logOperation('GEONETTECH_API_UNSUCCESSFUL_RESPONSE', {
                        response: orderResponse,
                        orderReference
                    });
                    
                    await session.abortTransaction();
                    session.endSession();
                    
                    let errorMessage = 'Could not complete your purchase. Please try again later.';
                    
                    if (orderResponse && orderResponse.message) {
                        const msg = orderResponse.message.toLowerCase();
                        
                        if (msg.includes('duplicate') || msg.includes('within 5 minutes')) {
                            errorMessage = 'A similar order was recently placed. Please wait a few minutes before trying again.';
                        } else if (msg.includes('invalid') || msg.includes('phone')) {
                            errorMessage = 'The phone number you entered appears to be invalid. Please check and try again.';
                        } else {
                            errorMessage = orderResponse.message;
                        }
                    }
                    
                    return res.status(400).json({
                        status: 'error',
                        message: errorMessage
                    });
                }
                
                apiOrderId = orderResponse.data ? orderResponse.data.orderId : orderReference;
                orderStatus = 'completed';
                
                logOperation('GEONETTECH_ORDER_SUCCESS', {
                    orderId: apiOrderId,
                    orderReference,
                    processingMethod,
                    responseData: orderResponse
                });
            } catch (apiError) {
                logOperation('GEONETTECH_API_ERROR', {
                    error: apiError.message,
                    response: apiError.response ? apiError.response.data : null,
                    orderReference
                });
                
                await session.abortTransaction();
                session.endSession();
                
                let errorMessage = 'Could not complete your purchase. Please try again later.';
                
                if (apiError.response && apiError.response.data && apiError.response.data.message) {
                    errorMessage = apiError.response.data.message;
                }
                
                return res.status(400).json({
                    status: 'error',
                    message: errorMessage
                });
            }
        }

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

        // Create Data Purchase with reference and user processing tracking
        const dataPurchase = new DataPurchase({
            userId: user._id,
            phoneNumber,
            network,
            capacity,
            mb: dataPackage.mb,
            gateway: 'wallet',
            method: isApiRequest ? 'api' : 'web',
            price,
            status: orderStatus,
            geonetReference: orderReference,
            apiOrderId: apiOrderId,
            apiResponse: orderResponse,
            skipGeonettech: shouldSkipGeonet,
            processingMethod: processingMethod,
            orderReferencePrefix: orderReferencePrefix,
            originalReference: (network === 'TELECEL' && skipGeonettech) ? originalInternalReference : null,
            userProcessingRule: userProcessingRule,
            userProcessingSource: userProcessingSource
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

        // Update user usage stats if API user with preferences
        if (isApiRequest && userProcessingPrefs) {
            await updateUserUsageStats(userProcessingPrefs, session);
        }

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        // Prepare response message based on order status
        let responseMessage = 'Data bundle purchased successfully';
        if (orderStatus === 'waiting') {
            responseMessage = 'Order placed successfully. Awaiting manual approval.';
        } else if (orderStatus === 'pending' && processingMethod === 'manual') {
            responseMessage = 'Order placed successfully. Your order will be processed manually.';
        }

        logOperation('DATA_PURCHASE_SUCCESS', {
            userId: user._id,
            orderStatus,
            orderReference,
            processingMethod,
            skipGeonettech: shouldSkipGeonet,
            balanceBefore,
            balanceAfter,
            requestType: isApiRequest ? 'API' : 'WEB',
            usedGeonettech: processingMethod === 'geonettech_api',
            usedTelecelAPI: processingMethod === 'telecel_api',
            isATPremium: network === 'AT_PREMIUM',
            userProcessingRule,
            userProcessingSource
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
                processingMethod: processingMethod,
                orderPrefix: orderReferencePrefix,
                usedGeonettech: processingMethod === 'geonettech_api',
                usedTelecelAPI: processingMethod === 'telecel_api',
                isATPremium: network === 'AT_PREMIUM',
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
            geonetReference: reference
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
                processingMethod: order.processingMethod,
                userProcessingRule: order.userProcessingRule,
                userProcessingSource: order.userProcessingSource,
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

// Get User Balance Endpoint
router.get('/balance', async (req, res, next) => {
    // Support both authentication methods
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return authenticateApiKey(req, res, next);
    }
    return authenticateUser(req, res, next);
}, async (req, res) => {
    try {
        // Re-fetch user to ensure we have the latest balance
        const user = await User.findById(req.user._id).select('walletBalance name email phoneNumber');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        logOperation('BALANCE_CHECK', {
            userId: user._id,
            timestamp: new Date()
        });

        res.json({
            status: 'success',
            data: {
                balance: user.walletBalance,
                currency: 'GHS', // Assuming Ghana Cedis based on your code
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber
                },
                timestamp: new Date()
            }
        });
    } catch (error) {
        logOperation('BALANCE_CHECK_ERROR', {
            userId: req.user?._id,
            error: error.message
        });

        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve balance'
        });
    }
});

// ADMIN ENDPOINTS FOR MANAGING API USER PROCESSING

// Get all users who have API keys
router.get('/admin/users-with-api-keys', authenticateUser, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        // Find all API keys (including inactive ones to show full history)
        const apiKeys = await ApiKey.find()
            .populate('userId', 'name email phoneNumber role walletBalance')
            .sort({ createdAt: -1 });

        // Group API keys by user
        const userMap = {};
        apiKeys.forEach(apiKey => {
            if (!apiKey.userId) return;
            
            const userId = apiKey.userId._id.toString();
            if (!userMap[userId]) {
                userMap[userId] = {
                    _id: userId,
                    name: apiKey.userId.name,
                    email: apiKey.userId.email,
                    phoneNumber: apiKey.userId.phoneNumber,
                    role: apiKey.userId.role,
                    walletBalance: apiKey.userId.walletBalance,
                    apiKeys: []
                };
            }
            
            userMap[userId].apiKeys.push({
                _id: apiKey._id,
                name: apiKey.name,
                key: apiKey.key, // Include key for admin view (be careful with this)
                isActive: apiKey.isActive,
                createdAt: apiKey.createdAt,
                lastUsed: apiKey.lastUsed,
                expiresAt: apiKey.expiresAt
            });
        });

        // Convert map to array
        const usersWithApiKeys = Object.values(userMap);

        // Get processing preferences for these users
        const userIds = usersWithApiKeys.map(u => u._id);
        const processingPrefs = await ApiUserProcessing.find({
            userId: { $in: userIds }
        });

        // Add processing status to each user
        const prefsMap = {};
        processingPrefs.forEach(pref => {
            prefsMap[pref.userId.toString()] = pref;
        });

        const enhancedUsers = usersWithApiKeys.map(user => ({
            ...user,
            hasProcessingConfig: !!prefsMap[user._id],
            processingMethod: prefsMap[user._id]?.globalSkipGeonettech ? 'manual' : 'api',
            processingStatus: prefsMap[user._id]?.status || 'not-configured'
        }));

        res.json({
            status: 'success',
            data: enhancedUsers,
            summary: {
                totalUsers: enhancedUsers.length,
                totalApiKeys: apiKeys.length,
                configuredUsers: processingPrefs.length,
                activeKeys: apiKeys.filter(k => k.isActive).length,
                inactiveKeys: apiKeys.filter(k => !k.isActive).length
            }
        });
    } catch (error) {
        console.error('Error fetching API users:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Revoke API key (admin)
router.delete('/admin/revoke-api-key/:keyId', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const apiKey = await ApiKey.findById(req.params.keyId);
        
        if (!apiKey) {
            return res.status(404).json({
                status: 'error',
                message: 'API key not found'
            });
        }

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

// Get detailed API key statistics
router.get('/admin/api-key-stats', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        // Get all API keys
        const apiKeys = await ApiKey.find().populate('userId', 'name email');

        // Calculate statistics
        const stats = {
            total: apiKeys.length,
            active: apiKeys.filter(k => k.isActive).length,
            inactive: apiKeys.filter(k => !k.isActive).length,
            expired: apiKeys.filter(k => k.expiresAt && new Date(k.expiresAt) < new Date()).length,
            usedToday: apiKeys.filter(k => {
                if (!k.lastUsed) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return new Date(k.lastUsed) >= today;
            }).length,
            usedThisWeek: apiKeys.filter(k => {
                if (!k.lastUsed) return false;
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(k.lastUsed) >= weekAgo;
            }).length,
            neverUsed: apiKeys.filter(k => !k.lastUsed).length
        };

        // Get top users by API key count
        const userKeyCount = {};
        apiKeys.forEach(key => {
            if (key.userId) {
                const userId = key.userId._id.toString();
                const userName = key.userId.name;
                if (!userKeyCount[userId]) {
                    userKeyCount[userId] = { 
                        name: userName, 
                        email: key.userId.email,
                        count: 0, 
                        active: 0 
                    };
                }
                userKeyCount[userId].count++;
                if (key.isActive) userKeyCount[userId].active++;
            }
        });

        const topUsers = Object.entries(userKeyCount)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            status: 'success',
            data: {
                stats,
                topUsers
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get API usage statistics for a specific user
router.get('/admin/api-user-usage/:userId', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const { userId } = req.params;
        const { days = 30 } = req.query;

        // Get user's API keys
        const apiKeys = await ApiKey.find({ userId });

        // Get user's processing preferences
        const processingPrefs = await ApiUserProcessing.findOne({ userId });

        // Get recent purchases
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const purchases = await DataPurchase.find({
            userId,
            method: 'api',
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 });

        // Calculate daily usage
        const dailyUsage = {};
        purchases.forEach(purchase => {
            const date = new Date(purchase.createdAt).toISOString().split('T')[0];
            if (!dailyUsage[date]) {
                dailyUsage[date] = {
                    count: 0,
                    totalAmount: 0,
                    networks: {}
                };
            }
            dailyUsage[date].count++;
            dailyUsage[date].totalAmount += purchase.price;
            
            if (!dailyUsage[date].networks[purchase.network]) {
                dailyUsage[date].networks[purchase.network] = 0;
            }
            dailyUsage[date].networks[purchase.network]++;
        });

        // Calculate network distribution
        const networkDistribution = {};
        purchases.forEach(purchase => {
            if (!networkDistribution[purchase.network]) {
                networkDistribution[purchase.network] = {
                    count: 0,
                    totalAmount: 0,
                    avgCapacity: 0,
                    capacities: []
                };
            }
            networkDistribution[purchase.network].count++;
            networkDistribution[purchase.network].totalAmount += purchase.price;
            networkDistribution[purchase.network].capacities.push(purchase.capacity);
        });

        // Calculate average capacities
        Object.keys(networkDistribution).forEach(network => {
            const caps = networkDistribution[network].capacities;
            networkDistribution[network].avgCapacity = 
                caps.reduce((a, b) => a + b, 0) / caps.length;
            delete networkDistribution[network].capacities; // Remove raw data
        });

        // Calculate processing method distribution
        const processingMethods = {
            manual: purchases.filter(p => p.processingMethod === 'manual').length,
            geonettech_api: purchases.filter(p => p.processingMethod === 'geonettech_api').length,
            telecel_api: purchases.filter(p => p.processingMethod === 'telecel_api').length
        };

        res.json({
            status: 'success',
            data: {
                userId,
                period: `Last ${days} days`,
                apiKeys: {
                    total: apiKeys.length,
                    active: apiKeys.filter(k => k.isActive).length,
                    lastUsed: apiKeys
                        .filter(k => k.lastUsed)
                        .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0]?.lastUsed
                },
                processingConfig: processingPrefs ? {
                    globalMethod: processingPrefs.globalSkipGeonettech ? 'manual' : 'api',
                    status: processingPrefs.status,
                    dailyLimit: processingPrefs.orderLimits?.dailyOrderLimit,
                    isVIP: processingPrefs.settings?.isVIP
                } : null,
                usage: {
                    totalOrders: purchases.length,
                    totalSpent: purchases.reduce((sum, p) => sum + p.price, 0),
                    avgOrderValue: purchases.length > 0 
                        ? purchases.reduce((sum, p) => sum + p.price, 0) / purchases.length 
                        : 0,
                    dailyUsage,
                    networkDistribution,
                    processingMethods
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

// Search users with API keys
router.get('/admin/search-api-users', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query must be at least 2 characters'
            });
        }

        // Search users by name, email, or phone
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phoneNumber: { $regex: query, $options: 'i' } }
            ]
        }).select('_id name email phoneNumber');

        const userIds = users.map(u => u._id);

        // Get API keys for these users
        const apiKeys = await ApiKey.find({ 
            userId: { $in: userIds } 
        });

        // Filter to only users with API keys
        const usersWithKeys = users.filter(user => 
            apiKeys.some(key => key.userId.toString() === user._id.toString())
        );

        // Get processing preferences
        const processingPrefs = await ApiUserProcessing.find({
            userId: { $in: usersWithKeys.map(u => u._id) }
        });

        // Enhance user data
        const enhancedUsers = usersWithKeys.map(user => {
            const userKeys = apiKeys.filter(k => k.userId.toString() === user._id.toString());
            const userPrefs = processingPrefs.find(p => p.userId.toString() === user._id.toString());
            
            return {
                ...user.toObject(),
                apiKeys: userKeys.map(k => ({
                    _id: k._id,
                    name: k.name,
                    isActive: k.isActive,
                    lastUsed: k.lastUsed
                })),
                hasProcessingConfig: !!userPrefs,
                processingMethod: userPrefs?.globalSkipGeonettech ? 'manual' : 'api'
            };
        });

        res.json({
            status: 'success',
            data: enhancedUsers,
            count: enhancedUsers.length
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get all API user processing preferences
router.get('/admin/api-user-processing', authenticateUser, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const preferences = await ApiUserProcessing.find()
            .populate('userId', 'name email phoneNumber')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: preferences
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get specific user's processing preferences
router.get('/admin/api-user-processing/:userId', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const preferences = await ApiUserProcessing.findOne({ 
            userId: req.params.userId 
        }).populate('userId', 'name email phoneNumber');

        if (!preferences) {
            return res.status(404).json({
                status: 'error',
                message: 'No processing preferences found for this user'
            });
        }

        res.json({
            status: 'success',
            data: preferences
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Create or update user processing preferences
router.post('/admin/api-user-processing/:userId', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const { userId } = req.params;
        const updateData = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        let preferences = await ApiUserProcessing.findOne({ userId });

        if (preferences) {
            // Update existing preferences
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    preferences[key] = updateData[key];
                }
            });
            preferences.updatedBy = req.user._id;
            preferences.updatedAt = new Date();
        } else {
            // Create new preferences
            preferences = new ApiUserProcessing({
                userId,
                ...updateData,
                createdBy: req.user._id,
                updatedBy: req.user._id
            });
        }

        await preferences.save();

        res.json({
            status: 'success',
            message: 'Processing preferences updated successfully',
            data: preferences
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Bulk update multiple users
router.post('/admin/api-user-processing/bulk-update', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const { userIds, settings } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide an array of user IDs'
            });
        }

        const bulkOps = userIds.map(userId => ({
            updateOne: {
                filter: { userId },
                update: {
                    $set: {
                        ...settings,
                        updatedBy: req.user._id,
                        updatedAt: new Date()
                    },
                    $setOnInsert: {
                        userId,
                        createdBy: req.user._id,
                        createdAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        const result = await ApiUserProcessing.bulkWrite(bulkOps);

        res.json({
            status: 'success',
            message: 'Bulk update completed',
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount,
                upserted: result.upsertedCount
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Delete user processing preferences
router.delete('/admin/api-user-processing/:userId', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const result = await ApiUserProcessing.findOneAndDelete({ 
            userId: req.params.userId 
        });

        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'No processing preferences found for this user'
            });
        }

        res.json({
            status: 'success',
            message: 'Processing preferences deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get processing statistics
router.get('/admin/api-processing-stats', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const stats = await ApiUserProcessing.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    manualProcessingUsers: {
                        $sum: { $cond: ['$globalSkipGeonettech', 1, 0] }
                    },
                    autoProcessingUsers: {
                        $sum: { $cond: ['$globalSkipGeonettech', 0, 1] }
                    },
                    activeUsers: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    suspendedUsers: {
                        $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
                    },
                    vipUsers: {
                        $sum: { $cond: ['$settings.isVIP', 1, 0] }
                    }
                }
            }
        ]);

        const networkStats = await ApiUserProcessing.aggregate([
            {
                $project: {
                    networks: { $objectToArray: '$networkSettings' }
                }
            },
            { $unwind: '$networks' },
            {
                $group: {
                    _id: '$networks.k',
                    skipGeonettechCount: {
                        $sum: {
                            $cond: ['$networks.v.skipGeonettech', 1, 0]
                        }
                    },
                    disabledCount: {
                        $sum: {
                            $cond: [{ $eq: ['$networks.v.enabled', false] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            status: 'success',
            data: {
                general: stats[0] || {
                    totalUsers: 0,
                    manualProcessingUsers: 0,
                    autoProcessingUsers: 0,
                    activeUsers: 0,
                    suspendedUsers: 0,
                    vipUsers: 0
                },
                byNetwork: networkStats
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get users with specific processing settings
router.get('/admin/api-users-by-settings', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const { 
            processingType, // 'manual' or 'api'
            status,
            isVIP,
            network,
            networkProcessing // 'manual' or 'api' for specific network
        } = req.query;

        let filter = {};

        if (processingType === 'manual') {
            filter.globalSkipGeonettech = true;
        } else if (processingType === 'api') {
            filter.globalSkipGeonettech = false;
        }

        if (status) {
            filter.status = status;
        }

        if (isVIP !== undefined) {
            filter['settings.isVIP'] = isVIP === 'true';
        }

        if (network && networkProcessing) {
            const key = `networkSettings.${network}.skipGeonettech`;
            filter[key] = networkProcessing === 'manual';
        }

        const users = await ApiUserProcessing.find(filter)
            .populate('userId', 'name email phoneNumber')
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;