// Updated TextVerifiedService class with wallet deduction only (no refunds)
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");
const { User, Transaction } = require('../schema/schema'); // Adjust path as needed

// TextVerified API Configuration
const TEXTVERIFIED_API_URL = "https://www.textverified.com/api/pub/v2";
const API_USERNAME = 'unimarketgh@gmail.com';
const API_KEY = 'NbBsj5YTOnzZx24ubGiqkD0x5U6UdAthZavYAFSvvKYvQeQhvwbqZOGExJEpjYvi';
const VERIFICATION_COST = 21; // Fixed cost in Ghana Cedis

// Token storage schema - for caching bearer tokens
const TokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Phone Verification Schema - tracks verification requests
const PhoneVerificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  serviceName: { 
    type: String, 
    required: true 
  },
  capability: { 
    type: String, 
    enum: ["sms", "voice"], 
    default: "sms" 
  },
  textVerifiedId: { 
    type: String 
  },
  phoneNumber: { 
    type: String 
  },
  verificationCode: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ["pending", "active", "verified", "failed", "canceled", "expired"],
    default: "pending"
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date 
  },
  areaCodeSelectOption: { 
    type: [String]
  },
  carrierSelectOption: { 
    type: [String]
  },
  totalCost: {
    type: Number,
    default: VERIFICATION_COST // Set default cost to 21 GH₵
  },
  // Used only if the service isn't in TextVerified's list
  serviceNotListedName: {
    type: String
  },
  // Reference to SMS or voice call details
  messageDetails: {
    messageId: { type: String },
    receivedAt: { type: Date },
    content: { type: String }
  },
  // Payment tracking
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction"
  }
});

// Indexes for efficient queries
PhoneVerificationSchema.index({ userId: 1 });
PhoneVerificationSchema.index({ textVerifiedId: 1 });
PhoneVerificationSchema.index({ status: 1 });
PhoneVerificationSchema.index({ createdAt: 1 });
PhoneVerificationSchema.index({ expiresAt: 1 });

// Token model - for managing API authentication
const Token = mongoose.model("Token", TokenSchema);

// PhoneVerification model
const PhoneVerification = mongoose.model("PhoneVerification", PhoneVerificationSchema);

/**
 * TextVerified API service for phone verification
 */
class TextVerifiedService {
  /**
   * Get a valid bearer token for API authentication
   * @returns {Promise<string>} Valid bearer token
   */
  static async getBearerToken() {
    try {
      // Check if we have a valid cached token
      const validToken = await Token.findOne({
        expiresAt: { $gt: new Date(Date.now() + 60000) } // Token valid for at least 1 more minute
      }).sort({ expiresAt: -1 });
      
      if (validToken) {
        return validToken.token;
      }
      
      // No valid token found, request a new one
      const response = await axios.post(`${TEXTVERIFIED_API_URL}/auth`, {}, {
        headers: {
          'X-API-USERNAME': API_USERNAME,
          'X-API-KEY': API_KEY
        }
      });
      
      if (response.data && response.data.token) {
        // Save the new token
        const expiresAt = new Date(response.data.expiresAt);
        const newToken = new Token({
          token: response.data.token,
          expiresAt
        });
        await newToken.save();
        
        return response.data.token;
      } else {
        throw new Error('Failed to get bearer token from TextVerified API');
      }
    } catch (error) {
      console.error('Error getting bearer token:', error);
      throw error;
    }
  }
  
  /**
   * Get list of available services from TextVerified
   * @param {string} type - Type of service (verification, renewable, nonrenewable)
   * @returns {Promise<Array>} List of available services
   */
  static async getServiceList(type = 'verification', numberType = 'mobile') {
    try {
      const token = await this.getBearerToken();
      
      const response = await axios.get(`${TEXTVERIFIED_API_URL}/services`, {
        params: {
          reservationType: type,
          numberType: numberType
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting service list:', error);
      throw error;
    }
  }
  
  /**
   * Create a new phone verification
   * @param {Object} data - Verification request data
   * @returns {Promise<Object>} Created verification
   */
  static async createVerification(data) {
    try {
      // First check if user has sufficient balance
      const user = await User.findById(data.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.walletBalance < VERIFICATION_COST) {
        throw new Error(`Insufficient wallet balance. Required: ${VERIFICATION_COST} GH₵, Available: ${user.walletBalance} GH₵`);
      }
      
      const token = await this.getBearerToken();
      
      // Create verification with TextVerified API
      const response = await axios.post(`${TEXTVERIFIED_API_URL}/verifications`, {
        serviceName: data.serviceName,
        capability: data.capability || 'sms',
        areaCodeSelectOption: data.areaCodeSelectOption,
        carrierSelectOption: data.carrierSelectOption,
        serviceNotListedName: data.serviceNotListedName
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Extract verification ID from the location header
      const verificationUrl = response.data.href;
      const textVerifiedId = verificationUrl.split('/').pop();
      
      // Get verification details
      const verificationDetails = await this.getVerificationDetails(textVerifiedId);
      
      // Deduct from user's wallet
      user.walletBalance -= VERIFICATION_COST;
      await user.save();
      
      // Create transaction record for this payment
      const transaction = await Transaction.create({
        userId: data.userId,
        type: 'purchase',
        amount: VERIFICATION_COST,
        status: 'completed',
        reference: `verification_${textVerifiedId}`,
        gateway: 'wallet',
        description: `Payment for ${data.serviceName} verification service`
      });
      
      // Create verification record in our database
      const phoneVerification = new PhoneVerification({
        userId: data.userId,
        serviceName: data.serviceName,
        capability: data.capability || 'sms',
        textVerifiedId,
        phoneNumber: verificationDetails.number,
        status: 'active',
        areaCodeSelectOption: data.areaCodeSelectOption,
        carrierSelectOption: data.carrierSelectOption,
        serviceNotListedName: data.serviceNotListedName,
        totalCost: VERIFICATION_COST, // Fixed cost in Ghana Cedis
        expiresAt: new Date(verificationDetails.endsAt),
        paymentStatus: 'paid',
        transactionId: transaction._id
      });
      
      await phoneVerification.save();
      
      console.log(`[createVerification] Deducted ${VERIFICATION_COST} GH₵ from user ${data.userId} wallet. New balance: ${user.walletBalance} GH₵`);
      
      return phoneVerification;
    } catch (error) {
      console.error('Error creating verification:', error);
      throw error;
    }
  }
  
  /**
   * Get verification details from TextVerified
   * @param {string} id - TextVerified verification ID
   * @returns {Promise<Object>} Verification details
   */
  static async getVerificationDetails(id) {
    try {
      const token = await this.getBearerToken();
      
      const response = await axios.get(`${TEXTVERIFIED_API_URL}/verifications/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`[getVerificationDetails] Details for ${id}:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`Error getting verification details for ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * List SMS messages for a verification
   * @param {string} id - TextVerified verification ID
   * @returns {Promise<Array>} List of SMS messages
   */
  static async listSms(id) {
    try {
      const token = await this.getBearerToken();
      
      // Make request to fetch SMS messages using proper pagination endpoints
      const response = await axios.get(`${TEXTVERIFIED_API_URL}/sms`, {
        params: {
          reservationId: id,
          reservationType: 'verification'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`[listSms] Response for ID ${id}:`, JSON.stringify(response.data, null, 2));
      
      // Check if we got valid SMS data
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.log(`[listSms] No SMS messages found for ID ${id}`);
        return [];
      }
      
      const messages = response.data.data.map(sms => ({
        id: sms.id,
        from: sms.from,
        to: sms.to,
        receivedAt: sms.createdAt,
        body: sms.smsContent || sms.parsedCode,
        parsedCode: sms.parsedCode
      }));
      
      console.log(`[listSms] Found ${messages.length} messages for ID ${id}`);
      
      // Update our verification record with the message if available
      if (messages && messages.length > 0) {
        const verification = await PhoneVerification.findOne({ textVerifiedId: id });
        if (verification) {
          verification.status = 'verified';
          // Use parsedCode if available, otherwise use the full SMS content
          verification.verificationCode = messages[0].parsedCode || messages[0].body;
          verification.messageDetails = {
            messageId: messages[0].id,
            receivedAt: new Date(messages[0].receivedAt),
            content: messages[0].body
          };
          await verification.save();
          console.log(`[listSms] Updated verification ${id} with code: ${verification.verificationCode}`);
        }
      }
      
      return messages;
    } catch (error) {
      console.error(`[listSms] Error listing SMS for verification ${id}:`, error);
      if (error.response) {
        console.error(`[listSms] Error response status: ${error.response.status}`);
        console.error(`[listSms] Error response data:`, error.response.data);
      }
      throw error;
    }
  }
}

module.exports = { 
  PhoneVerification, 
  Token, 
  TextVerifiedService,
  VERIFICATION_COST
};