// routes/userStats.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, Transaction, DataPurchase } = require('../schema/schema'); // Adjust path as needed

/**
 * @route   GET /api/v1/user-stats/:userId
 * @route   POST /api/v1/user-stats
 * @desc    Get user statistics including total deposits, orders, and ranking
 * @access  Private
 */

// GET version - userId from params
router.get('/user-stats/:userId',  async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Call the function to get user stats
    const statsData = await getUserStats(userId);
    
    return res.status(200).json({
      success: true,
      data: statsData
    });
    
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user statistics'
    });
  }
});

// POST version - userId from body
router.post('/user-stats',  async (req, res) => {
  try {
    const userId = req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Call the function to get user stats
    const statsData = await getUserStats(userId);
    
    return res.status(200).json({
      success: true,
      data: statsData
    });
    
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user statistics'
    });
  }
});

// Helper function to get user statistics
async function getUserStats(userId) {
  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }
  
  // Get basic user information
  const user = await User.findById(userId, 'name email phoneNumber walletBalance role approvalStatus createdAt referralCode');
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get total deposits
  const deposits = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'deposit',
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalDeposits = deposits.length > 0 ? deposits[0].total : 0;
  const depositCount = deposits.length > 0 ? deposits[0].count : 0;
  
  // Get total orders
  const orders = await DataPurchase.find({ userId });
  const totalOrders = orders.length;
  
  // Count successful orders
  const successfulOrders = orders.filter(order => 
    ['completed', 'delivered'].includes(order.status)
  ).length;
  
  // Calculate order success rate
  const successRate = totalOrders > 0 
    ? Math.round((successfulOrders / totalOrders) * 100) 
    : 0;
  
  // Get user ranking based on order count
  // First get all users with their order counts
  const userRankings = await DataPurchase.aggregate([
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 }
      }
    },
    {
      $sort: { orderCount: -1 }
    }
  ]);
  
  // Find the current user's position in the rankings
  const userRank = userRankings.findIndex(u => u._id.toString() === userId.toString()) + 1;
  const totalUsers = await User.countDocuments();
  
  // Calculate percentile (lower is better)
  const percentile = totalUsers > 0 
    ? Math.round((userRank / totalUsers) * 100) 
    : 0;
  
  // Get account age in days
  const accountAgeInDays = Math.floor(
    (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
  );
  
  // Return the stats data
  return {
    userInfo: {
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      walletBalance: user.walletBalance,
      accountStatus: user.approvalStatus,
      registrationDate: user.createdAt,
      accountAge: accountAgeInDays
    },
    depositStats: {
      totalAmount: totalDeposits,
      numberOfDeposits: depositCount
    },
    orderStats: {
      totalOrders: totalOrders,
      successfulOrders: successfulOrders,
      successRate: successRate
    },
    ranking: {
      position: userRank,
      outOf: totalUsers,
      percentile: percentile
    }
  };
}

module.exports = router;