const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { User, DataPurchase, Transaction } = require('../schema/schema');

// Enhanced logging function
const logOperation = (operation, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${operation}]`, JSON.stringify(data, null, 2));
  };

router.post('/purchase-hubnet-data', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { 
        userId, 
        phoneNumber, 
        network, 
        dataAmountGB, 
        price,
        referrerNumber 
      } = req.body;
  
      logOperation('HUBNET_DATA_PURCHASE_REQUEST', {
        userId,
        phoneNumber,
        network,
        dataAmountGB,
        price,
        referrerNumber,
        timestamp: new Date()
      });
  
      // Validate inputs
      if (!userId || !phoneNumber || !network || !dataAmountGB || !price) {
        logOperation('HUBNET_DATA_PURCHASE_VALIDATION_ERROR', {
          missingFields: {
            userId: !userId,
            phoneNumber: !phoneNumber,
            network: !network,
            dataAmountGB: !dataAmountGB,
            price: !price
          }
        });
        
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }
  
      // Find user
      const user = await User.findById(userId).session(session);
      if (!user) {
        logOperation('HUBNET_DATA_PURCHASE_USER_NOT_FOUND', { userId });
        throw new Error('User not found');
      }
  
      logOperation('HUBNET_DATA_PURCHASE_USER_FOUND', {
        userId,
        currentBalance: user.walletBalance,
        requestedPurchaseAmount: price
      });
  
      // Check user wallet balance
      if (user.walletBalance < price) {
        logOperation('HUBNET_DATA_PURCHASE_INSUFFICIENT_BALANCE', {
          userId,
          walletBalance: user.walletBalance,
          requiredAmount: price,
          shortfall: price - user.walletBalance
        });
        
        return res.status(400).json({
          status: 'error',
          message: 'Insufficient wallet balance',
          currentBalance: user.walletBalance,
          requiredAmount: price
        });
      }
  
      // Generate unique references
      const transactionReference = `HUB-TRX-${uuidv4()}`;
      const orderReference = Math.floor(1000 + Math.random() * 900000); // Generates a number between 1000 and 9999
      console.log(orderReference);
      
  
      // Convert data amount from GB to MB for Hubnet API
      const volumeInMB = parseFloat(dataAmountGB) * 1000;
  
      // Get network code for Hubnet
      const getNetworkCode = (type) => {
        switch (type.toLowerCase()) {
          case 'airteltigo': return 'at';
          case 'mtn': return 'mtn';
          case 'big-time': return 'big-time';
          default: return type.toLowerCase();
        }
      };
  
      const networkCode = getNetworkCode(network);
  
      logOperation('HUBNET_ORDER_REQUEST_PREPARED', {
        networkCode,
        phoneNumber,
        volumeInMB,
        reference: orderReference,
        referrer: referrerNumber || phoneNumber,
        timestamp: new Date()
      });
  
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
        throw new Error(hubnetData.message || 'Failed to process data purchase with Hubnet');
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
        capacity: `${dataAmountGB}`,
        gateway: 'wallet',
        method: 'web',
        price,
        status: 'completed', // Initially set as processing until confirmed
        hubnetReference: orderReference,
        referrerNumber: referrerNumber || null,
        geonetReference:orderReference
      });
  
      logOperation('HUBNET_DATA_PURCHASE_DOCUMENTS_CREATED', {
        transaction: transaction.toJSON(),
        dataPurchase: dataPurchase.toJSON()
      });
  
      // Update user wallet
      const previousBalance = user.walletBalance;
      user.walletBalance -= price;
  
      logOperation('USER_WALLET_UPDATE', {
        userId,
        previousBalance,
        newBalance: user.walletBalance,
        deduction: price
      });
  
      // Save all documents
      await transaction.save({ session });
      await dataPurchase.save({ session });
      await user.save({ session });
  
      logOperation('HUBNET_DATA_PURCHASE_DOCUMENTS_SAVED', {
        transaction: transaction._id,
        dataPurchase: dataPurchase._id,
        userUpdated: user._id
      });
  
      // Commit transaction
      await session.commitTransaction();
      logOperation('DATABASE_TRANSACTION_COMMITTED', { timestamp: new Date() });
  
      res.status(201).json({
        status: 'success',
        message: 'Data bundle purchase initiated successfully',
        data: {
          transaction,
          dataPurchase,
          newWalletBalance: user.walletBalance,
          hubnetResponse: hubnetData
        }
      });
  
    } catch (error) {
      // Rollback transaction
      await session.abortTransaction();
      logOperation('DATABASE_TRANSACTION_ABORTED', {
        reason: error.message,
        timestamp: new Date()
      });
  
      logOperation('HUBNET_DATA_PURCHASE_ERROR', {
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
        message: 'Failed to purchase data bundle',
        details: error.response ? error.response.data : error.message
      });
    } finally {
      // End the session
      session.endSession();
      logOperation('DATABASE_SESSION_ENDED', { timestamp: new Date() });
    }
  });
module.exports = router;