// routes/adminDeviceRoutes.js
const express = require('express');
const router = express.Router();
const { User, DataPurchase, Transaction, ReferralBonus, DataInventory } = require('../schema/schema');
const mongoose = require('mongoose');
const auth = require('../blockMiddleware/middle');
const adminAuth = require('../adminMiddleware/middleware');
const axios = require('axios');

/**
 * Middleware to ensure device schema fields exist
 * This middleware will initialize the blockedDevices array if not present
 */
const ensureDeviceSchema = async (req, res, next) => {
  try {
    if (!req.params.id) {
      return next();
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize blockedDevices array if it doesn't exist
    if (!user.blockedDevices) {
      user.blockedDevices = [];
      await user.save();
    }

    // Initialize lastLogin object if it doesn't exist
    if (!user.lastLogin) {
      user.lastLogin = {
        deviceId: null,
        ipAddress: null,
        userAgent: null,
        timestamp: null
      };
      await user.save();
    }

    next();
  } catch (err) {
    console.error('Error in ensureDeviceSchema middleware:', err);
    res.status(500).json({ msg: 'Server error in device schema middleware' });
  }
};

/**
 * @route   GET /api/admin/users/:id/blocked-devices
 * @desc    Get a user's blocked devices
 * @access  Admin
 */
router.get('/users/:id/blocked-devices', auth, adminAuth, ensureDeviceSchema, async (req, res) => {
  try {
    // Find user with populated admin names for blocked devices
    const user = await User.findById(req.params.id)
      .select('name email phoneNumber blockedDevices lastLogin')
      .populate('blockedDevices.blockedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Format the response
    const formattedBlockedDevices = user.blockedDevices.map(device => {
      return {
        deviceId: device.deviceId,
        userAgent: device.userAgent || 'Not provided',
        ipAddress: device.ipAddress || 'Not provided',
        reason: device.reason || 'Administrative action',
        blockedAt: device.blockedAt,
        blockedBy: device.blockedBy ? device.blockedBy._id : null,
        blockedByName: device.blockedBy ? device.blockedBy.name : 'Unknown Admin'
      };
    });
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        lastLogin: user.lastLogin
      },
      blockedDevices: formattedBlockedDevices
    });
    
  } catch (err) {
    console.error('Error fetching blocked devices:', err);
    res.status(500).json({ msg: 'Server error while fetching blocked devices' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/block-device
 * @desc    Block a user's device
 * @access  Admin
 */
router.put('/users/:id/block-device', auth, adminAuth, ensureDeviceSchema, async (req, res) => {
  try {
    const { deviceId, reason, userAgent, ipAddress } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ msg: 'Device ID is required' });
    }
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if device is already blocked
    const deviceAlreadyBlocked = user.blockedDevices.some(
      device => device.deviceId === deviceId
    );
    
    if (deviceAlreadyBlocked) {
      return res.status(400).json({ msg: 'This device is already blocked for this user' });
    }
    
    // Add device to blocked devices
    user.blockedDevices.push({
      deviceId,
      userAgent: userAgent || 'Not provided',
      ipAddress: ipAddress || 'Not provided',
      reason: reason || 'Administrative action',
      blockedAt: Date.now(),
      blockedBy: req.user.id // Admin who blocked the device
    });
    
    await user.save();
    
    // Send notification to user if applicable
    try {
      if (user.phoneNumber) {
        const formattedPhone = user.phoneNumber.replace(/^\+/, '');
        const message = `DATAMART: One of your devices has been blocked from accessing your account due to security concerns. Please contact support for more information.`;
        
        // Send SMS using your existing sendSMS function
        if (typeof sendSMS === 'function') {
          await sendSMS(formattedPhone, message, {
            useCase: 'transactional',
            senderID: 'Bundle'
          });
        }
      }
    } catch (smsError) {
      console.error('Failed to send device block SMS:', smsError.message);
      // Continue with the operation even if SMS fails
    }
    
    res.json({
      msg: 'Device successfully blocked',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        blockedDevices: user.blockedDevices.map(device => ({
          deviceId: device.deviceId,
          blockedAt: device.blockedAt,
          reason: device.reason
        }))
      }
    });
    
  } catch (err) {
    console.error('Error blocking device:', err);
    res.status(500).json({ msg: 'Server error while blocking device' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/unblock-device/:deviceId
 * @desc    Unblock a user's device
 * @access  Admin
 */
router.put('/users/:id/unblock-device/:deviceId', auth, adminAuth, ensureDeviceSchema, async (req, res) => {
  try {
    const { id, deviceId } = req.params;
    
    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if device exists in blocked devices
    const deviceIndex = user.blockedDevices.findIndex(
      device => device.deviceId === deviceId
    );
    
    if (deviceIndex === -1) {
      return res.status(400).json({ msg: 'This device is not blocked for this user' });
    }
    
    // Remove device from blocked devices
    user.blockedDevices.splice(deviceIndex, 1);
    await user.save();
    
    // Send notification to user if applicable
    try {
      if (user.phoneNumber) {
        const formattedPhone = user.phoneNumber.replace(/^\+/, '');
        const message = `DATAMART: Your previously blocked device has been unblocked. You can now access your account from this device.`;
        
        // Send SMS using your existing sendSMS function
        if (typeof sendSMS === 'function') {
          await sendSMS(formattedPhone, message, {
            useCase: 'transactional',
            senderID: 'Bundle'
          });
        }
      }
    } catch (smsError) {
      console.error('Failed to send device unblock SMS:', smsError.message);
      // Continue with the operation even if SMS fails
    }
    
    res.json({
      msg: 'Device successfully unblocked',
      user: {
        id: user._id,
        name: user.name,
        blockedDevices: user.blockedDevices.map(device => ({
          deviceId: device.deviceId,
          blockedAt: device.blockedAt,
          reason: device.reason
        }))
      }
    });
    
  } catch (err) {
    console.error('Error unblocking device:', err);
    res.status(500).json({ msg: 'Server error while unblocking device' });
  }
});

module.exports = router;