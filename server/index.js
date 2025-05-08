const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const ConnectDB = require('./DataBaseConnection/connection.js');
// Either import just the router or destructure it from the object
const authRouter = require('./AuthRoutes/Auth.js').router; 
const dataOrderRoutes = require('./orderRou/order.js');
const Deposit = require('./DepositeRoutes/UserDeposite.js');
const Developer = require('./ResellerApi/resellerApi.js')
const HubnetAt = require('./HubnetInteraction/hubnet.js');
const AdminManagement = require('./admin-management/adminManagemet.js')
const passreset = require('./ResetPasword/reset.js')
const Report = require('./Reporting/reporting.js')
const DepositeMorle = require('./DepositeMoorle/moorle.js')
const approveuser = require('./adim-aprove/approve.js')
const registerFriend = require('./regsterFreinds/register.js')
const bulkUpload = require('./bulkPurchase/bulk.js')
const userStats = require('./userInfo/userInfo.js')
const adminOrder = require('./allOrders/allorders.js')
const waiting_orders_export = require('./waitingorders/waiting.js')
const phoneVerification = require('./PhoneVerifyRoutes/Verification.js')
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to Database
ConnectDB();

// Routes
app.use('/api/v1', authRouter); // Use the router property
app.use('/api/v1/data', dataOrderRoutes);
app.use('/api/v1', Deposit);
app.use('/api/developer', Developer)
app.use('/api/v1', HubnetAt);
app.use('/api',AdminManagement)
app.use('/api/v1', passreset);
app.use('/api/reports', Report);
app.use('/api/v1', DepositeMorle);
app.use('/api', approveuser)
app.use('/api', registerFriend);
app.use('/api', bulkUpload);
app.use('/api/v1', userStats);
app.use('/api', adminOrder);
app.use('/api/orders', waiting_orders_export);
app.use('/api/verifications', phoneVerification);

// Default Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});