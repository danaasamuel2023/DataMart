const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");

// TextVerified API Configuration
const TEXTVERIFIED_API_URL = "https://www.textverified.com/api/pub/v2";
const API_USERNAME = 'unimarketgh@gmail.com';
const API_KEY = 'NbBsj5YTOnzZx24ubGiqkD0x5U6UdAthZavYAFSvvKYvQeQhvwbqZOGExJEpjYvi';

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
    type: Number
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
          numberType: numberType  // Add this required parameter
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
        totalCost: verificationDetails.totalCost,
        expiresAt: new Date(verificationDetails.endsAt)
      });
      
      await phoneVerification.save();
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
      
      return response.data;
    } catch (error) {
      console.error(`Error getting verification details for ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Reactivate an existing verification
   * @param {string} id - TextVerified verification ID
   * @returns {Promise<Object>} Reactivated verification
   */
  static async reactivateVerification(id) {
    try {
      const token = await this.getBearerToken();
      
      const response = await axios.post(`${TEXTVERIFIED_API_URL}/verifications/${id}/reactivate`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update our verification record
      const verification = await PhoneVerification.findOne({ textVerifiedId: id });
      if (verification) {
        verification.status = 'active';
        verification.expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes from now
        await verification.save();
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error reactivating verification ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Report a problem with a verification
   * @param {string} id - TextVerified verification ID
   * @returns {Promise<Object>} Report result
   */
  static async reportVerification(id) {
    try {
      const token = await this.getBearerToken();
      
      const response = await axios.post(`${TEXTVERIFIED_API_URL}/verifications/${id}/report`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update our verification record
      const verification = await PhoneVerification.findOne({ textVerifiedId: id });
      if (verification) {
        verification.status = 'failed';
        await verification.save();
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error reporting verification ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a verification
   * @param {string} id - TextVerified verification ID
   * @returns {Promise<Object>} Cancel result
   */
  static async cancelVerification(id) {
    try {
      const token = await this.getBearerToken();
      
      const response = await axios.post(`${TEXTVERIFIED_API_URL}/verifications/${id}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update our verification record
      const verification = await PhoneVerification.findOne({ textVerifiedId: id });
      if (verification) {
        verification.status = 'canceled';
        await verification.save();
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error canceling verification ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Reuse a verification
   * @param {string} id - TextVerified verification ID
   * @returns {Promise<Object>} Reuse result
   */
  static async reuseVerification(id) {
    try {
      const token = await this.getBearerToken();
      
      const response = await axios.post(`${TEXTVERIFIED_API_URL}/verifications/${id}/reuse`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error reusing verification ${id}:`, error);
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
      
      const response = await axios.get(`${TEXTVERIFIED_API_URL}/sms`, {
        params: {
          reservationId: id
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update our verification record with the message
      if (response.data && response.data.length > 0) {
        const verification = await PhoneVerification.findOne({ textVerifiedId: id });
        if (verification) {
          verification.status = 'verified';
          verification.verificationCode = response.data[0].body;
          verification.messageDetails = {
            messageId: response.data[0].id,
            receivedAt: new Date(response.data[0].receivedAt),
            content: response.data[0].body
          };
          await verification.save();
        }
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error listing SMS for verification ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Poll for verification messages
   * @param {string} id - TextVerified verification ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<string|null>} Verification code if received, null otherwise
   */
  static async pollForVerification(id, maxAttempts = 12, interval = 5000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const messages = await this.listSms(id);
        if (messages && messages.length > 0) {
          return messages[0].body;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Error during polling attempt ${i + 1} for verification ${id}:`, error);
      }
    }
    
    // No verification code received after all attempts
    const verification = await PhoneVerification.findOne({ textVerifiedId: id });
    if (verification) {
      verification.status = 'expired';
      await verification.save();
    }
    
    return null;
  }
}

// Webhook handler for TextVerified callbacks (if their service supports it)
class WebhookHandler {
  static async handleSmsWebhook(req, res) {
    try {
      const { reservationId, messageId, body, receivedAt } = req.body;
      
      // Find the verification record
      const verification = await PhoneVerification.findOne({ textVerifiedId: reservationId });
      if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
      }
      
      // Update verification record
      verification.status = 'verified';
      verification.verificationCode = body;
      verification.messageDetails = {
        messageId,
        receivedAt: new Date(receivedAt),
        content: body
      };
      await verification.save();
      
      // Send success response
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = { 
  PhoneVerification, 
  Token, 
  TextVerifiedService, 
  WebhookHandler 
};