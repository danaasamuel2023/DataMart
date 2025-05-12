// Updated TextVerifiedService class with wallet deduction and refund capability
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
    enum: ["pending", "active", "verified", "failed", "canceled", "expired", "refunded"],
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
    enum: ["pending", "paid", "refunded"],
    default: "pending"
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction"
  },
  refundTransactionId: {
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
  
  /**
   * Process refund for expired verification with no code
   * @param {string} verificationId - Database ID of verification to refund
   * @returns {Promise<Object>} Refund result
   */
  static async processRefundForExpiredVerification(verificationId) {
    try {
      console.log(`[processRefundForExpiredVerification] Processing refund for verification ${verificationId}`);
      
      // Find the verification
      const verification = await PhoneVerification.findById(verificationId);
      
      if (!verification) {
        throw new Error(`Verification with ID ${verificationId} not found`);
      }
      
      // Check if refund is needed and valid
      if (verification.status === 'refunded') {
        console.log(`[processRefundForExpiredVerification] Verification ${verificationId} already refunded`);
        return { 
          success: false, 
          message: 'Already refunded', 
          verification 
        };
      }
      
      if (verification.status === 'verified') {
        console.log(`[processRefundForExpiredVerification] Verification ${verificationId} is verified, no refund needed`);
        return {
          success: false,
          message: 'Verification is verified, no refund needed',
          verification
        };
      }
      
      // Double-check with the API to ensure it's really expired/failed
      try {
        const apiDetails = await this.getVerificationDetails(verification.textVerifiedId);
        
        // If the API shows it's actually verified, don't refund
        if (apiDetails.state === 'verified') {
          // Try to get the verification code
          const messages = await this.listSms(verification.textVerifiedId);
          
          // If we got a code, update and don't refund
          if (messages && messages.length > 0) {
            console.log(`[processRefundForExpiredVerification] Found verification code for ${verificationId}, no refund needed`);
            return {
              success: false,
              message: 'Verification code found, no refund needed',
              verification
            };
          }
        }
        
        // If API state doesn't match our expected states for refund, don't refund
        const refundableStates = ['expired', 'failed', 'canceled'];
        if (!refundableStates.includes(apiDetails.state) && 
            !refundableStates.includes(verification.status)) {
          console.log(`[processRefundForExpiredVerification] Verification ${verificationId} state (${apiDetails.state}) not eligible for refund`);
          return {
            success: false,
            message: `Verification state (${apiDetails.state}) not eligible for refund`,
            verification
          };
        }
      } catch (apiError) {
        console.error(`[processRefundForExpiredVerification] Error checking API state:`, apiError);
        // Continue with refund if we can't check API (assume it's expired)
      }
      
      // Find the user to refund
      const user = await User.findById(verification.userId);
      
      if (!user) {
        throw new Error(`User with ID ${verification.userId} not found`);
      }
      
      // Create refund transaction
      const refundTransaction = await Transaction.create({
        userId: verification.userId,
        type: 'refund',
        amount: verification.totalCost,
        status: 'completed',
        reference: `refund_verification_${verification.textVerifiedId}`,
        gateway: 'wallet',
        description: `Refund for expired verification service: ${verification.serviceName}`
      });
      
      // Add money back to user's wallet
      user.walletBalance += verification.totalCost;
      await user.save();
      
      // Update verification record
      verification.status = 'refunded';
      verification.paymentStatus = 'refunded';
      verification.refundTransactionId = refundTransaction._id;
      await verification.save();
      
      console.log(`[processRefundForExpiredVerification] Refunded ${verification.totalCost} GH₵ to user ${verification.userId}. New balance: ${user.walletBalance} GH₵`);
      
      return {
        success: true,
        message: `Refunded ${verification.totalCost} GH₵ for expired verification`,
        verification,
        refundTransaction,
        newBalance: user.walletBalance
      };
    } catch (error) {
      console.error(`[processRefundForExpiredVerification] Error processing refund:`, error);
      throw error;
    }
  }
  
  /**
   * Poll for verification code with a timeout
   * @param {string} id - TextVerified verification ID
   * @param {number} maxAttempts - Maximum number of attempts
   * @param {number} interval - Interval between attempts in ms
   * @returns {Promise<string|null>} Verification code or null
   */
  static async pollForVerification(id, maxAttempts = 5, interval = 2000) {
    console.log(`[pollForVerification] Starting poll for ${id}, max attempts: ${maxAttempts}, interval: ${interval}ms`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`[pollForVerification] Attempt ${attempt + 1}/${maxAttempts} for ${id}`);
        
        // Check API state first
        const apiDetails = await this.getVerificationDetails(id);
        console.log(`[pollForVerification] API state: ${apiDetails.state}`);
        
        // If the API state indicates the verification is no longer active
        if (apiDetails.state !== 'active' && apiDetails.state !== 'verificationPending') {
          // If it's verified, try to get the code
          if (apiDetails.state === 'verified') {
            const messages = await this.listSms(id);
            
            if (messages && messages.length > 0) {
              const verification = await PhoneVerification.findOne({ textVerifiedId: id });
              console.log(`[pollForVerification] Found code for ${id} on attempt ${attempt + 1}: ${verification.verificationCode}`);
              return verification.verificationCode;
            }
          }
          
          // If expired/canceled/failed, update our record
          const mappedStatus = this.mapApiStateToStatus(apiDetails.state);
          const verification = await PhoneVerification.findOne({ textVerifiedId: id });
          
          if (verification && verification.status !== mappedStatus) {
            verification.status = mappedStatus;
            await verification.save();
            console.log(`[pollForVerification] Updated status to ${mappedStatus} for ${id}`);
            
            // If verification expired without code, process refund
            if (mappedStatus === 'expired' || mappedStatus === 'failed') {
              // Check if there's a code first
              const messages = await this.listSms(id);
              
              if (!messages || messages.length === 0) {
                console.log(`[pollForVerification] Verification ${id} expired without code, will process refund`);
                // Don't wait for refund processing to complete here
                this.processRefundForExpiredVerification(verification._id)
                  .then(result => console.log(`[pollForVerification] Refund processing result:`, result))
                  .catch(err => console.error(`[pollForVerification] Refund processing error:`, err));
              }
            }
          }
          
          // No point in continuing to poll
          return null;
        }
        
        // Check for SMS messages
        const messages = await this.listSms(id);
        
        if (messages && messages.length > 0) {
          // Get the updated verification with the code
          const verification = await PhoneVerification.findOne({ textVerifiedId: id });
          
          if (verification && verification.verificationCode) {
            console.log(`[pollForVerification] Found code for ${id} on attempt ${attempt + 1}: ${verification.verificationCode}`);
            return verification.verificationCode;
          }
        }
        
        // If this is not the last attempt, wait before trying again
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error(`[pollForVerification] Error on attempt ${attempt + 1}:`, error);
        // Continue to next attempt despite error
      }
    }
    
    console.log(`[pollForVerification] No code found for ${id} after ${maxAttempts} attempts`);
    return null;
  }
  
  /**
   * Check for expired verifications that need refunds
   * @returns {Promise<Object>} Refund processing results
   */
  static async checkAndProcessPendingRefunds() {
    try {
      console.log(`[checkAndProcessPendingRefunds] Checking for expired verifications to refund`);
      
      // Find expired or failed verifications that haven't been refunded
      const expiredVerifications = await PhoneVerification.find({
        status: { $in: ['expired', 'failed'] },
        paymentStatus: { $ne: 'refunded' }
      });
      
      console.log(`[checkAndProcessPendingRefunds] Found ${expiredVerifications.length} expired verifications to check`);
      
      const results = {
        total: expiredVerifications.length,
        processed: 0,
        refunded: 0,
        errors: 0,
        details: []
      };
      
      // Process each verification
      for (const verification of expiredVerifications) {
        try {
          results.processed++;
          
          // Check if this verification already has a code
          if (verification.verificationCode) {
            console.log(`[checkAndProcessPendingRefunds] Verification ${verification._id} has a code, not refunding`);
            results.details.push({
              id: verification._id,
              result: 'skipped',
              reason: 'Has verification code'
            });
            continue;
          }
          
          // Process the refund
          const refundResult = await this.processRefundForExpiredVerification(verification._id);
          
          if (refundResult.success) {
            results.refunded++;
            results.details.push({
              id: verification._id,
              result: 'refunded',
              amount: verification.totalCost
            });
          } else {
            results.details.push({
              id: verification._id,
              result: 'skipped',
              reason: refundResult.message
            });
          }
        } catch (error) {
          console.error(`[checkAndProcessPendingRefunds] Error processing refund for ${verification._id}:`, error);
          results.errors++;
          results.details.push({
            id: verification._id,
            result: 'error',
            error: error.message
          });
        }
      }
      
      console.log(`[checkAndProcessPendingRefunds] Results: ${results.refunded} refunded, ${results.errors} errors`);
      return results;
    } catch (error) {
      console.error(`[checkAndProcessPendingRefunds] Error checking for refunds:`, error);
      throw error;
    }
  }
  
  /**
   * Map TextVerified API states to our status values
   * @param {string} apiState - API state
   * @returns {string} Mapped status
   */
  static mapApiStateToStatus(apiState) {
    switch (apiState) {
      case 'active':
      case 'verificationPending': 
        return 'active';
      case 'verified': 
        return 'verified';
      case 'canceled': 
        return 'canceled';
      case 'expired': 
        return 'expired';
      default: 
        return 'failed';
    }
  }
}

module.exports = { 
  PhoneVerification, 
  Token, 
  TextVerifiedService,
  VERIFICATION_COST
};