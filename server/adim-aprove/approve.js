const express = require('express');
const router = express.Router();
const { User, ReferralBonus } = require('../schema/schema'); // Adjust path as needed
const jwt = require('jsonwebtoken');
const  authMiddleware = require('../middlewareUser/middleware'); // Adjust path as needed

// Middleware to check if user is authenticated
// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
//   }
// };

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required' });
  }
  next();
};

// NEW ROUTE: Check approval status by userId (can be used with localStorage)
router.get('/check-approval/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId format
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }
    
    // Find user by ID
    const user = await User.findById(userId);
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Handle users that might not have the approvalStatus field
    if (!user.hasOwnProperty('approvalStatus')) {
      // Existing users without the field are considered approved automatically
      return res.status(200).json({ 
        success: true, 
        userId: user._id,
        approvalStatus: 'approved' 
      });
    }
    
    // Return approval status for users with the field
    return res.status(200).json({ 
      success: true,
      userId: user._id,
      approvalStatus: user.approvalStatus,
      reason: user.approvalStatus === 'rejected' ? user.rejectionReason : null
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking approval status', 
      error: error.message 
    });
  }
});

// Route to check if user is approved (for user's own status)
router.get('/user/approval-status', authMiddleware, async (req, res) => {
  try {
    // Handle users that might not have the approvalStatus field
    if (!req.user.hasOwnProperty('approvalStatus')) {
      // Existing users without the field are considered approved automatically
      return res.status(200).json({ success: true, approvalStatus: 'approved' });
    }
    
    return res.status(200).json({ 
      success: true, 
      approvalStatus: req.user.approvalStatus,
      reason: req.user.approvalStatus === 'rejected' ? req.user.rejectionReason : null
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error checking approval status', error: error.message });
  }
});

// Route to get all pending users
router.get('/admin/users/pending', async (req, res) => {
  try {
    const pendingUsers = await User.find({ approvalStatus: "pending" })
      .select("name email phoneNumber referredBy createdAt")
      .sort({ createdAt: -1 });
    
    return res.status(200).json({ success: true, count: pendingUsers.length, data: pendingUsers });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching pending users", error: error.message });
  }
});

/// Route to approve a user
router.put('/admin/users/:userId/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId format
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }
    
    // Check if user exists
    const userToApprove = await User.findById(userId);
    if (!userToApprove) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Check approval status
    if (!userToApprove.hasOwnProperty('approvalStatus')) {
      // If user doesn't have approvalStatus field, add it and set to approved
      userToApprove.approvalStatus = "approved";
      userToApprove.approvedBy = req.user._id;
      userToApprove.approvedAt = Date.now();
      await userToApprove.save();
      
      return res.status(200).json({ 
        success: true, 
        message: "User approval status updated successfully" 
      });
    }
    
    // If user is already approved
    if (userToApprove.approvalStatus === "approved") {
      return res.status(200).json({ 
        success: true, 
        message: "User is already approved" 
      });
    }
    
    // Update user's approval status
    userToApprove.approvalStatus = "approved";
    userToApprove.approvedBy = req.user._id;
    userToApprove.approvedAt = Date.now();
    await userToApprove.save();
    
    // Process referral if applicable
    if (userToApprove.referredBy) {
      try {
        // Find and update any pending referral bonus
        const updatedBonus = await ReferralBonus.findOneAndUpdate(
          { referredUserId: userToApprove._id, status: "pending" },
          { status: "credited" },
          { new: true }
        );
        
        // If a bonus was found and updated, update the referrer's wallet
        if (updatedBonus) {
          const referringUser = await User.findOne({ referralCode: userToApprove.referredBy });
          if (referringUser) {
            referringUser.walletBalance = (referringUser.walletBalance || 0) + 10; // Add bonus
            await referringUser.save();
          }
        }
      } catch (referralError) {
        console.error("Error processing referral bonus:", referralError);
        // Continue with the approval process even if referral processing fails
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: "User approved successfully" 
    });
  } catch (error) {
    console.error("Error approving user:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error approving user", 
      error: error.message 
    });
  }
});

// Route to reject a user
router.put('/admin/users/:userId/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }
    
    // Check if user exists
    const userToReject = await User.findById(userId);
    if (!userToReject) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Check if user already has approval status
    if (!userToReject.hasOwnProperty('approvalStatus')) {
      return res.status(400).json({ 
        success: false, 
        message: "This user was created before the approval system was implemented and can't be rejected" 
      });
    }
    
    // Update user's approval status
    userToReject.approvalStatus = "rejected";
    userToReject.rejectionReason = rejectionReason;
    await userToReject.save();
    
    return res.status(200).json({ success: true, message: "User rejected successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error rejecting user", error: error.message });
  }
});

// Authentication middleware that checks approval status
const authWithApprovalMiddleware = async (req, res, next) => {
  try {
    // First run the normal auth middleware
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Set user in request
    req.user = user;
    
    // Check approval status only if the field exists
    // This ensures backward compatibility with existing users
    if (user.hasOwnProperty('approvalStatus') && user.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: user.approvalStatus === 'pending' 
          ? 'Your account is pending approval by an administrator' 
          : `Your account has been rejected. Reason: ${user.rejectionReason || 'Not specified'}`
      });
    }
    
    // User is authenticated and either approved or an existing user
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
  }
};

module.exports = router;