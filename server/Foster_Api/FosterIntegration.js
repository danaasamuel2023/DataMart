const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, DataPurchase, Transaction, DataInventory } = require('../schema/schema');

// Foster Console (FGMall) API Configuration
const FGMALL_BASE_URL = 'https://fgamall.com/api/v1';
const FGMALL_API_KEY = '2304766ea0eeadd1f7ad22938b01b07978e02b5f';

// Create FGMall client
const fgmallClient = axios.create({
  baseURL: FGMALL_BASE_URL,
  headers: {
    'x-api-key': FGMALL_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});
 
// Enhanced logging function
const logOperation = (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
};

// Helper function to format phone numbers
const formatPhoneNumber = (phoneNumber) => {
  // Remove any spaces or special characters
  let cleaned = phoneNumber.replace(/[\s-()]/g, '');
  
  // Ensure it starts with 0
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned.slice(-9);
  }
  
  return cleaned;
};

// Helper function to format volume display
const formatVolumeDisplay = (volumeMB) => {
  if (volumeMB >= 1000) {
    const gb = volumeMB / 1000;
    return gb % 1 === 0 ? `${gb}GB` : `${gb.toFixed(1)}GB`;
  }
  return `${volumeMB}MB`;
};

// Check FGMall Console Balance
router.get('/console-balance', async (req, res) => {
  try {
    logOperation('CONSOLE_BALANCE_REQUEST', { timestamp: new Date() });
    
    const response = await fgmallClient.get('/check-console-balance');
    
    logOperation('CONSOLE_BALANCE_RESPONSE', {
      status: response.status,
      data: response.data
    });
    
    res.json({
      status: 'success',
      data: {
        walletBalance: parseFloat(response.data.userConsoleWalletBalance),
        ishareBalance: parseFloat(response.data.userConsoleIshareBalance),
        message: response.data.message
      }
    });
  } catch (error) {
    logOperation('CONSOLE_BALANCE_ERROR', {
      message: error.message,
      response: error.response ? error.response.data : null
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch console balance',
      details: error.response ? error.response.data : error.message
    });
  }
});

// Fetch available data packages
router.get('/data-packages', async (req, res) => {
  try {
    logOperation('FETCH_PACKAGES_REQUEST', { timestamp: new Date() });
    
    const response = await fgmallClient.get('/fetch-data-packages');
    
    logOperation('FETCH_PACKAGES_RESPONSE', {
      status: response.status,
      packageCount: response.data.length
    });
    
    // Transform and group packages by network
    const transformedPackages = response.data.map(pkg => ({
      ...pkg,
      volumeMB: parseInt(pkg.volume),
      volumeGB: parseFloat((parseInt(pkg.volume) / 1000).toFixed(2)),
      volumeDisplay: formatVolumeDisplay(parseInt(pkg.volume))
    }));
    
    const packagesByNetwork = transformedPackages.reduce((acc, pkg) => {
      if (!acc[pkg.network]) {
        acc[pkg.network] = [];
      }
      acc[pkg.network].push({
        id: pkg.id,
        volumeMB: pkg.volumeMB,
        volumeGB: pkg.volumeGB,
        volumeDisplay: pkg.volumeDisplay,
        price: parseFloat(pkg.console_price),
        description: pkg.description,
        network_id: pkg.network_id
      });
      return acc;
    }, {});
    
    res.json({
      status: 'success',
      data: {
        packages: transformedPackages,
        groupedByNetwork: packagesByNetwork
      }
    });
  } catch (error) {
    logOperation('FETCH_PACKAGES_ERROR', {
      message: error.message,
      response: error.response ? error.response.data : null
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data packages',
      details: error.response ? error.response.data : error.message
    });
  }
});

// Process iShare (AT) order through FGMall
async function processIShareOrder(recipient, capacityGB, reference) {
  try {
    logOperation('ISHARE_ORDER_REQUEST_PREPARED', {
      recipient,
      capacityGB,
      reference
    });
    
    // Format phone number
    const formattedRecipient = formatPhoneNumber(recipient);
    
    // Convert GB to MB for iShare API
    const capacityInMB = capacityGB * 1000;
    
    const payload = {
      recipient_msisdn: formattedRecipient,
      shared_bundle: capacityInMB,
      order_reference: reference
    };
    
    logOperation('ISHARE_ORDER_REQUEST', payload);
    
    const response = await fgmallClient.post('/buy-ishare-package', payload);
    
    logOperation('ISHARE_ORDER_RESPONSE', {
      status: response.status,
      data: response.data
    });
    
    // Check response code
    if (response.data.response_code !== '200') {
      throw new Error(response.data.response_msg || 'iShare order failed');
    }
    
    return {
      success: true,
      data: response.data,
      vendorTranxId: response.data.vendorTranxId,
      responseMsg: response.data.response_msg
    };
  } catch (error) {
    logOperation('ISHARE_ORDER_ERROR', {
      message: error.message,
      response: error.response?.data
    });
    
    return {
      success: false,
      error: {
        message: error.response?.data?.response_msg || error.message,
        details: error.response?.data || 'No response details available'
      }
    };
  }
}

// Process other networks (MTN, Telecel, Vodafone) order through FGMall
async function processOtherNetworkOrder(recipient, capacityGB, network, reference) {
  try {
    logOperation('OTHER_NETWORK_ORDER_REQUEST_PREPARED', {
      recipient,
      capacityGB,
      network,
      reference
    });
    
    // Format phone number
    const formattedRecipient = formatPhoneNumber(recipient);
    
    // Map network names to API network names
    const networkMapping = {
      'YELLO': 'MTN',
      'YELLOW': 'MTN',
      'MTN': 'MTN',
      'TELECEL': 'Telecel',
      'VODAFONE': 'Vodafone'
    };
    
    const apiNetworkName = networkMapping[network.toUpperCase()] || network;
    
    // First, fetch available packages to find matching one
    const packagesResponse = await fgmallClient.get('/fetch-data-packages');
    const networkPackages = packagesResponse.data.filter(pkg => 
      pkg.network.toUpperCase() === apiNetworkName.toUpperCase()
    );
    
    logOperation('AVAILABLE_NETWORK_PACKAGES', {
      network: apiNetworkName,
      packagesFound: networkPackages.length,
      packages: networkPackages.map(p => ({ 
        id: p.id,
        volume: p.volume, 
        volumeGB: p.volumeGB,
        network_id: p.network_id,
        console_price: p.console_price
      }))
    });
    
    // Convert capacity to MB for matching
    const capacityInMB = capacityGB * 1000;
    
    // Find package with matching volume
    let matchingPackage = null;
    
    // First try to match by volume in MB (if volume is stored as string like "10000")
    matchingPackage = networkPackages.find(pkg => parseInt(pkg.volume) === capacityInMB);
    
    // If not found and volumes are stored as GB (small numbers), try GB match
    if (!matchingPackage) {
      matchingPackage = networkPackages.find(pkg => parseInt(pkg.volume) === capacityGB);
    }
    
    if (!matchingPackage) {
      throw new Error(`No ${apiNetworkName} package found for ${capacityGB}GB (${capacityInMB}MB). Available volumes: ${networkPackages.map(p => p.volume).join(', ')}`);
    }
    
    // API expects shared_bundle in MB based on documentation
    const payload = {
      recipient_msisdn: formattedRecipient,
      network_id: matchingPackage.network_id,
      shared_bundle: capacityInMB // Send in MB as per API documentation
    };
    
    logOperation('OTHER_NETWORK_ORDER_REQUEST', {
      endpoint: '/buy-other-package',
      payload: payload,
      packageDetails: {
        id: matchingPackage.id,
        volume: matchingPackage.volume,
        network_id: matchingPackage.network_id,
        price: matchingPackage.console_price
      }
    });
    
    const response = await fgmallClient.post('/buy-other-package', payload);
    
    logOperation('OTHER_NETWORK_ORDER_RESPONSE', {
      status: response.status,
      data: response.data
    });
    
    // Check for success in response
    if (response.data.success === false || response.data.status === 'failed') {
      throw new Error(response.data.message || `${network} order failed`);
    }
    
    return {
      success: true,
      data: response.data,
      transactionCode: response.data.transaction_code,
      message: response.data.message || 'Package purchased successfully'
    };
  } catch (error) {
    logOperation('OTHER_NETWORK_ORDER_ERROR', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return {
      success: false,
      error: {
        message: error.response?.data?.message || error.message,
        details: error.response?.data || 'No response details available',
        status: error.response?.status
      }
    };
  }
}

// Check iShare transaction status
async function checkIShareTransactionStatus(transactionId) {
  try {
    logOperation('ISHARE_STATUS_CHECK_REQUEST', { transactionId });
    
    const response = await fgmallClient.post('/fetch-ishare-transaction', {
      transaction_id: transactionId
    });
    
    logOperation('ISHARE_STATUS_CHECK_RESPONSE', response.data);
    
    return {
      success: true,
      data: response.data,
      status: response.data.api_response_code === '200' ? 'completed' : 'processing'
    };
  } catch (error) {
    logOperation('ISHARE_STATUS_CHECK_ERROR', {
      message: error.message,
      response: error.response?.data
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

// Check other network transaction status
async function checkOtherNetworkTransactionStatus(transactionId) {
  try {
    logOperation('OTHER_NETWORK_STATUS_CHECK_REQUEST', { transactionId });
    
    const response = await fgmallClient.post('/fetch-other-network-transaction', {
      transaction_id: transactionId
    });
    
    logOperation('OTHER_NETWORK_STATUS_CHECK_RESPONSE', response.data);
    
    const deliveryStatus = response.data.order_items?.[0]?.delivery_status || 'processing';
    
    return {
      success: true,
      data: response.data,
      status: deliveryStatus === 'Placed' ? 'completed' : 'processing'
    };
  } catch (error) {
    logOperation('OTHER_NETWORK_STATUS_CHECK_ERROR', {
      message: error.message,
      response: error.response?.data
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

// Generate mixed reference function
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

// Main purchase data endpoint
router.post('/purchase-data', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      userId, 
      phoneNumber, 
      network, 
      capacity, 
      price 
    } = req.body;

    logOperation('DATA_PURCHASE_REQUEST', {
      userId,
      phoneNumber,
      network,
      capacity,
      price,
      timestamp: new Date()
    });

    // Validate inputs
    if (!userId || !phoneNumber || !network || !capacity || !price) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Find user
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check user wallet balance
    if (user.walletBalance < price) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient wallet balance',
        currentBalance: user.walletBalance,
        requiredAmount: price
      });
    }

    // Generate unique references
    const transactionReference = `TRX-${uuidv4()}`;
    let orderReference = '';
    let orderResponse = null;
    let apiOrderId = null;
    let orderStatus = 'processing';
    let processingMethod = '';

    // Process based on network
    if (network === 'AT' || network === 'AIRTELTIGO' || network === 'AT_PREMIUM' || network === 'AirtelTigo') {
      // Process iShare order
      orderReference = generateMixedReference('IS-');
      processingMethod = 'fgmall_ishare';
      
      const ishareResponse = await processIShareOrder(phoneNumber, capacity, orderReference);
      
      if (!ishareResponse.success) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          status: 'error',
          message: ishareResponse.error.message || 'Failed to process iShare order'
        });
      }
      
      orderResponse = ishareResponse.data;
      apiOrderId = ishareResponse.vendorTranxId;
      orderStatus = 'processing';
      
    } else if (network === 'MTN' || network === 'TELECEL' || network === 'VODAFONE' || network === 'Telecel' || network === 'Vodafone' || network === 'YELLO' || network === 'YELLOW') {
      // Process other network orders
      let networkPrefix = network.toUpperCase().substring(0, 3);
      // Special handling for YELLO/YELLOW -> MTN
      if (network.toUpperCase() === 'YELLO' || network.toUpperCase() === 'YELLOW') {
        networkPrefix = 'MTN';
      }
      orderReference = generateMixedReference(`${networkPrefix}-`);
      processingMethod = 'fgmall_other';
      
      const otherNetworkResponse = await processOtherNetworkOrder(phoneNumber, capacity, network, orderReference);
      
      if (!otherNetworkResponse.success) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          status: 'error',
          message: otherNetworkResponse.error.message || `Failed to process ${network} order`
        });
      }
      
      orderResponse = otherNetworkResponse.data;
      apiOrderId = otherNetworkResponse.transactionCode;
      orderStatus = 'completed';
      
    } else {
      // Unsupported network for FGMall
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        status: 'error',
        message: `Network ${network} is not supported by FGMall API`
      });
    }

    // Create Transaction
    const transaction = new Transaction({
      userId,
      type: 'purchase',
      amount: price,
      status: 'completed',
      reference: transactionReference,
      gateway: 'wallet'
    });

    // Create Data Purchase
    const dataPurchase = new DataPurchase({
      userId,
      phoneNumber,
      network,
      capacity,
      gateway: 'wallet',
      method: 'web',
      price,
      status: orderStatus,
      geonetReference: orderReference,
      apiOrderId: apiOrderId,
      apiResponse: orderResponse,
      processingMethod: processingMethod,
      orderReferencePrefix: orderReference.split('-')[0] + '-'
    });

    // Update user wallet
    user.walletBalance -= price;

    // Save all documents
    await transaction.save({ session });
    await dataPurchase.save({ session });
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    logOperation('DATA_PURCHASE_SUCCESS', {
      userId,
      orderStatus,
      orderReference,
      processingMethod,
      newWalletBalance: user.walletBalance
    });

    res.status(201).json({
      status: 'success',
      message: 'Data bundle purchased successfully',
      data: {
        transaction,
        dataPurchase,
        newWalletBalance: user.walletBalance,
        orderStatus: orderStatus,
        orderReference: orderReference,
        processingMethod: processingMethod
      }
    });

  } catch (error) {
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

// Check order status
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    logOperation('ORDER_STATUS_CHECK_REQUEST', { orderId });

    // Find local order
    const localOrder = await DataPurchase.findOne({ 
      $or: [
        { apiOrderId: orderId },
        { geonetReference: orderId }
      ]
    });

    if (!localOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    let statusResponse = null;
    
    // Check status based on processing method
    if (localOrder.processingMethod === 'fgmall_ishare') {
      statusResponse = await checkIShareTransactionStatus(localOrder.apiOrderId);
    } else if (localOrder.processingMethod === 'fgmall_other') {
      statusResponse = await checkOtherNetworkTransactionStatus(localOrder.apiOrderId);
    }

    if (statusResponse && statusResponse.success) {
      // Update local order status if needed
      if (statusResponse.status !== localOrder.status) {
        localOrder.status = statusResponse.status;
        await localOrder.save();
      }
    }

    res.json({
      status: 'success',
      data: {
        localOrder,
        apiStatus: statusResponse ? statusResponse.data : null
      }
    });

  } catch (error) {
    logOperation('ORDER_STATUS_CHECK_ERROR', {
      message: error.message
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to check order status'
    });
  }
});

// Get transaction history from FGMall
router.get('/fgmall-transactions', async (req, res) => {
  try {
    const { type = 'ishare' } = req.query;
    
    logOperation('FETCH_FGMALL_TRANSACTIONS', { type });
    
    let endpoint = type === 'ishare' ? 
      '/fetch-ishare-transactions' : 
      '/fetch-other-network-transactions';
    
    const response = await fgmallClient.get(endpoint);
    
    res.json({
      status: 'success',
      data: response.data
    });
    
  } catch (error) {
    logOperation('FETCH_FGMALL_TRANSACTIONS_ERROR', {
      message: error.message
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transactions from FGMall'
    });
  }
});

// Fetch available networks
router.get('/networks', async (req, res) => {
  try {
    logOperation('FETCH_NETWORKS_REQUEST', { timestamp: new Date() });
    
    const response = await fgmallClient.get('/fetch-networks');
    
    logOperation('FETCH_NETWORKS_RESPONSE', {
      status: response.status,
      data: response.data
    });
    
    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    logOperation('FETCH_NETWORKS_ERROR', {
      message: error.message,
      response: error.response ? error.response.data : null
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch networks',
      details: error.response ? error.response.data : error.message
    });
  }
});

module.exports = router;