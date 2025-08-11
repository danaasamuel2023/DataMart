const express = require('express');
const router = express.Router();
const { ResultCheckerProduct, ResultCheckerPurchase, ResultCheckerInventory } = require('../WaecSchema/Schema');
const { User, Transaction, ApiKey } = require('../schema/schema');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// mNotify SMS configuration
const SMS_CONFIG = {
  API_KEY: process.env.MNOTIFY_API_KEY || 'w3rGWhv4e235nDwYvD5gVDyrW',
  SENDER_ID: 'DataMartGH',
  BASE_URL: 'https://apps.mnotify.net/smsapi'
};

// API Key Authentication Middleware (reuse from data routes)
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

// Logging helper
const logOperation = (operation, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
};

// Format phone number for mNotify
const formatPhoneNumberForMnotify = (phone) => {
    if (!phone) return '';
    
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
        cleaned = '233' + cleaned.substring(1);
    }
    
    if (!cleaned.startsWith('233')) {
        cleaned = '233' + cleaned;
    }
    
    return cleaned;
};

// Send SMS notification
const sendMnotifySMS = async (to, message) => {
    try {
        const formattedPhone = formatPhoneNumberForMnotify(to);
        
        if (!formattedPhone || formattedPhone.length < 12) {
            throw new Error('Invalid phone number format');
        }
        
        const url = `${SMS_CONFIG.BASE_URL}?key=${SMS_CONFIG.API_KEY}&to=${formattedPhone}&msg=${encodeURIComponent(message)}&sender_id=${SMS_CONFIG.SENDER_ID}`;
        
        const response = await axios.get(url);
        
        let responseCode;
        
        if (typeof response.data === 'number') {
            responseCode = response.data;
        } else if (typeof response.data === 'string') {
            const match = response.data.match(/\d+/);
            if (match) {
                responseCode = parseInt(match[0]);
            } else {
                responseCode = parseInt(response.data.trim());
            }
        } else if (typeof response.data === 'object' && response.data.code) {
            responseCode = parseInt(response.data.code);
        }
        
        if (isNaN(responseCode)) {
            if (response.status === 200) {
                return { success: true, message: 'SMS sent (assumed successful)', rawResponse: response.data };
            }
            throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
        }
        
        switch (responseCode) {
            case 1000:
                return { success: true, message: 'SMS sent successfully', code: responseCode };
            case 1002:
                throw new Error('SMS sending failed');
            case 1003:
                throw new Error('Insufficient SMS balance');
            case 1004:
                throw new Error('Invalid API key');
            case 1005:
                throw new Error('Invalid phone number');
            case 1006:
                throw new Error('Invalid Sender ID. Sender ID must not be more than 11 Characters');
            case 1007:
                return { success: true, message: 'SMS scheduled for later delivery', code: responseCode };
            case 1008:
                throw new Error('Empty message');
            case 1011:
                throw new Error('Numeric Sender IDs are not allowed');
            case 1012:
                throw new Error('Sender ID is not registered. Please contact support at senderids@mnotify.com');
            default:
                throw new Error(`Unknown response code: ${responseCode}`);
        }
    } catch (error) {
        if (error.response) {
            console.error('mNotify SMS API Error Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }
        console.error('mNotify SMS Error:', error.message);
        return { success: false, error: error.message };
    }
};

// Send result checker purchase SMS
const sendCheckerPurchaseSMS = async (phoneNumber, checkerType, serialNumber, pin, userName) => {
    try {
        const message = `Hello ${userName || 'Customer'}! Your ${checkerType} Result Checker purchase is successful. Serial: ${serialNumber}, PIN: ${pin}. Keep this information safe. Thank you for choosing DataMartGH!`;
        
        const result = await sendMnotifySMS(phoneNumber, message);
        
        if (result.success) {
            console.log(`Checker purchase SMS sent to ${phoneNumber}`);
        } else {
            console.error(`Failed to send checker purchase SMS to ${phoneNumber}:`, result.error);
        }
        
        return result;
    } catch (error) {
        console.error('Send Checker Purchase SMS Error:', error);
        return { success: false, error: error.message };
    }
};

// =====================================================
// DEVELOPER API ROUTES
// =====================================================

/**
 * @route   GET /api/v1/result-checkers/products
 * @desc    Get available result checker products
 * @access  API Key Required
 */
router.get('/products', authenticateApiKey, async (req, res) => {
    try {
        logOperation('API_GET_CHECKER_PRODUCTS', {
            userId: req.user._id,
            timestamp: new Date()
        });

        const products = await ResultCheckerProduct.find({ isActive: true })
            .select('name description price');
        
        // Check availability for each product
        const productsWithAvailability = await Promise.all(
            products.map(async (product) => {
                const availableCount = await ResultCheckerInventory.countDocuments({
                    checkerType: product.name,
                    status: 'available'
                });
                
                return {
                    id: product._id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    inStock: availableCount > 0,
                    stockCount: availableCount
                };
            })
        );
        
        res.json({
            status: 'success',
            data: productsWithAvailability
        });
    } catch (error) {
        logOperation('API_GET_CHECKER_PRODUCTS_ERROR', {
            message: error.message
        });
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch products'
        });
    }
});

/**
 * @route   POST /api/v1/result-checkers/purchase
 * @desc    Purchase a result checker
 * @access  API Key Required
 */
router.post('/purchase', authenticateApiKey, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { 
            checkerType, 
            phoneNumber,
            ref, // Custom reference from developer (optional)
            webhookUrl // Optional webhook URL for notifications
        } = req.body;

        logOperation('API_CHECKER_PURCHASE_REQUEST', {
            userId: req.user._id,
            checkerType,
            phoneNumber,
            customReference: ref,
            webhookUrl,
            timestamp: new Date()
        });

        // Validate required fields
        if (!checkerType || !phoneNumber) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: checkerType and phoneNumber are required'
            });
        }

        // Validate checker type
        if (!['WAEC', 'BECE'].includes(checkerType)) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(400).json({
                status: 'error',
                message: 'Invalid checker type. Must be either WAEC or BECE'
            });
        }

        // Get product details
        const product = await ResultCheckerProduct.findOne({ 
            name: checkerType,
            isActive: true 
        }).session(session);
        
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(404).json({
                status: 'error',
                message: `${checkerType} product not available`
            });
        }

        // Get user details
        const user = await User.findById(req.user._id).session(session);
        
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Check if user account is disabled
        if (user.isDisabled) {
            await session.abortTransaction();
            session.endSession();
            
            return res.status(403).json({
                status: 'error',
                message: 'Account is disabled. Please contact support.'
            });
        }

        // Store balance before transaction
        const balanceBefore = user.walletBalance;

        // Check wallet balance
        if (balanceBefore < product.price) {
            await session.abortTransaction();
            session.endSession();
            
            logOperation('API_CHECKER_INSUFFICIENT_BALANCE', {
                userId: user._id,
                walletBalance: balanceBefore,
                requiredAmount: product.price,
                shortfall: product.price - balanceBefore
            });
            
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient wallet balance',
                currentBalance: balanceBefore,
                requiredAmount: product.price
            });
        }

        // Generate purchase reference
        let purchaseReference;
        if (ref) {
            // Check if custom reference already exists
            const existingPurchase = await ResultCheckerPurchase.findOne({ 
                purchaseReference: ref 
            }).session(session);
            
            if (existingPurchase) {
                await session.abortTransaction();
                session.endSession();
                
                return res.status(400).json({
                    status: 'error',
                    message: 'Reference already exists. Please use a unique reference.'
                });
            }
            
            purchaseReference = ref;
        } else {
            // Generate unique reference
            const count = await ResultCheckerPurchase.countDocuments();
            const type = checkerType === "WAEC" ? "W" : "B";
            purchaseReference = `CHK${type}${Date.now()}${String(count + 1).padStart(4, '0')}`;
        }

        // Find and reserve an available checker
        const availableChecker = await ResultCheckerInventory.findOneAndUpdate(
            {
                checkerType: product.name,
                status: 'available'
            },
            {
                status: 'reserved',
                reservedFor: req.user._id,
                reservedAt: new Date()
            },
            { new: true, session }
        );
        
        if (!availableChecker) {
            await session.abortTransaction();
            session.endSession();
            
            logOperation('API_CHECKER_OUT_OF_STOCK', {
                checkerType,
                userId: req.user._id
            });
            
            return res.status(400).json({
                status: 'error',
                message: `No ${checkerType} checkers available in stock`
            });
        }

        // Calculate balance after
        const balanceAfter = balanceBefore - product.price;

        // Create purchase record
        const purchase = new ResultCheckerPurchase({
            userId: req.user._id,
            checkerType: product.name,
            serialNumber: availableChecker.serialNumber,
            pin: availableChecker.pin,
            price: product.price,
            purchaseReference,
            status: 'completed',
            paymentMethod: 'wallet',
            method: 'api', // Mark as API purchase
            webhookUrl // Store webhook URL if provided
        });
        
        await purchase.save({ session });

        // Create transaction with balance tracking
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'purchase',
            amount: product.price,
            balanceBefore,
            balanceAfter,
            status: 'completed',
            reference: purchaseReference,
            gateway: 'wallet',
            description: `API Purchase of ${product.name} Result Checker`,
            relatedPurchaseId: purchase._id
        });
        
        await transaction.save({ session });

        // Update user balance
        user.walletBalance = balanceAfter;
        await user.save({ session });

        // Update purchase with transaction ID
        purchase.transactionId = transaction._id;
        await purchase.save({ session });

        // Mark checker as sold
        availableChecker.status = 'sold';
        availableChecker.soldTo = req.user._id;
        availableChecker.soldAt = new Date();
        availableChecker.reservedFor = undefined;
        availableChecker.reservedAt = undefined;
        await availableChecker.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        logOperation('API_CHECKER_PURCHASE_SUCCESS', {
            userId: req.user._id,
            purchaseId: purchase._id,
            purchaseReference,
            checkerType,
            balanceBefore,
            balanceAfter
        });

        // Send SMS notification
        await sendCheckerPurchaseSMS(
            phoneNumber, 
            purchase.checkerType, 
            purchase.serialNumber, 
            purchase.pin,
            user.name
        );

        // Prepare response
        const responseData = {
            status: 'success',
            message: 'Result checker purchased successfully',
            data: {
                purchaseId: purchase._id,
                reference: purchaseReference,
                checkerType: purchase.checkerType,
                serialNumber: purchase.serialNumber,
                pin: purchase.pin,
                phoneNumber,
                price: purchase.price,
                balanceBefore,
                balanceAfter,
                transactionId: transaction._id,
                createdAt: purchase.createdAt
            }
        };

        // Send webhook notification if URL provided
        if (webhookUrl) {
            // Send webhook asynchronously
            setImmediate(async () => {
                try {
                    await axios.post(webhookUrl, {
                        event: 'checker.purchase.completed',
                        data: responseData.data
                    });
                    logOperation('API_WEBHOOK_SENT', {
                        webhookUrl,
                        purchaseReference
                    });
                } catch (webhookError) {
                    logOperation('API_WEBHOOK_ERROR', {
                        webhookUrl,
                        error: webhookError.message
                    });
                }
            });
        }

        res.status(201).json(responseData);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        logOperation('API_CHECKER_PURCHASE_ERROR', {
            message: error.message,
            stack: error.stack
        });

        res.status(500).json({
            status: 'error',
            message: 'Could not complete purchase. Please try again later.'
        });
    }
});

/**
 * @route   GET /api/v1/result-checkers/order-status/:reference
 * @desc    Check order status by reference
 * @access  API Key Required
 */
router.get('/order-status/:reference', authenticateApiKey, async (req, res) => {
    try {
        const { reference } = req.params;
        
        if (!reference) {
            return res.status(400).json({
                status: 'error',
                message: 'Reference is required'
            });
        }

        logOperation('API_CHECK_ORDER_STATUS', {
            userId: req.user._id,
            reference
        });

        // Find purchase by reference
        const purchase = await ResultCheckerPurchase.findOne({
            userId: req.user._id,
            purchaseReference: reference
        }).populate('transactionId');

        if (!purchase) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found with the provided reference'
            });
        }

        // Return order details
        res.json({
            status: 'success',
            data: {
                purchaseId: purchase._id,
                reference: purchase.purchaseReference,
                checkerType: purchase.checkerType,
                serialNumber: purchase.serialNumber,
                pin: purchase.pin,
                price: purchase.price,
                orderStatus: purchase.status,
                paymentMethod: purchase.paymentMethod,
                createdAt: purchase.createdAt,
                updatedAt: purchase.updatedAt,
                transaction: purchase.transactionId ? {
                    id: purchase.transactionId._id,
                    balanceBefore: purchase.transactionId.balanceBefore,
                    balanceAfter: purchase.transactionId.balanceAfter,
                    status: purchase.transactionId.status
                } : null
            }
        });

    } catch (error) {
        logOperation('API_CHECK_ORDER_STATUS_ERROR', {
            reference: req.params.reference,
            error: error.message
        });

        res.status(500).json({
            status: 'error',
            message: 'Failed to check order status'
        });
    }
});

/**
 * @route   GET /api/v1/result-checkers/purchase-history
 * @desc    Get purchase history
 * @access  API Key Required
 */
router.get('/purchase-history', authenticateApiKey, async (req, res) => {
    try {
        const { page = 1, limit = 20, checkerType, startDate, endDate } = req.query;
        const skip = (page - 1) * limit;

        logOperation('API_GET_PURCHASE_HISTORY', {
            userId: req.user._id,
            page,
            limit,
            checkerType,
            startDate,
            endDate
        });

        const filter = { 
            userId: req.user._id,
            status: 'completed'
        };
        
        if (checkerType) {
            filter.checkerType = checkerType;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                filter.createdAt.$lte = endDateObj;
            }
        }

        const purchases = await ResultCheckerPurchase.find(filter)
            .populate('transactionId', 'balanceBefore balanceAfter')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ResultCheckerPurchase.countDocuments(filter);

        // Format purchases
        const formattedPurchases = purchases.map(purchase => ({
            purchaseId: purchase._id,
            reference: purchase.purchaseReference,
            checkerType: purchase.checkerType,
            serialNumber: purchase.serialNumber,
            pin: purchase.pin,
            price: purchase.price,
            status: purchase.status,
            createdAt: purchase.createdAt,
            balanceInfo: purchase.transactionId ? {
                balanceBefore: purchase.transactionId.balanceBefore,
                balanceAfter: purchase.transactionId.balanceAfter
            } : null
        }));

        res.json({
            status: 'success',
            data: {
                purchases: formattedPurchases,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasNextPage: Number(page) < Math.ceil(total / limit),
                    hasPrevPage: Number(page) > 1
                }
            }
        });

    } catch (error) {
        logOperation('API_GET_PURCHASE_HISTORY_ERROR', {
            error: error.message
        });

        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch purchase history'
        });
    }
});

/**
 * @route   GET /api/v1/result-checkers/balance
 * @desc    Get current wallet balance
 * @access  API Key Required
 */
router.get('/balance', authenticateApiKey, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('walletBalance');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                walletBalance: user.walletBalance,
                currency: 'GHS'
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch balance'
        });
    }
});

/**
 * @route   POST /api/v1/result-checkers/validate-reference
 * @desc    Validate if a reference exists
 * @access  API Key Required
 */
router.post('/validate-reference', authenticateApiKey, async (req, res) => {
    try {
        const { reference } = req.body;
        
        if (!reference) {
            return res.status(400).json({
                status: 'error',
                message: 'Reference is required'
            });
        }

        const existingPurchase = await ResultCheckerPurchase.findOne({ 
            purchaseReference: reference 
        });

        res.json({
            status: 'success',
            data: {
                reference,
                exists: !!existingPurchase,
                available: !existingPurchase
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to validate reference'
        });
    }
});

module.exports = router;