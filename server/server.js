const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import routes
const jobRoutes = require('./routes/jobs');
const departmentRoutes = require('./routes/departments');
const inventoryRoutes = require('./routes/inventory');
const workerRoutes = require('./routes/workers');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');
const categoryRoutes = require('./routes/categories');
const supplierRoutes = require('./routes/suppliers');
const purchaseRoutes = require('./routes/purchases');
const holidayRoutes = require('./routes/holidays');
const whatsappRoutes = require('./routes/whatsapp');

// Import Admin model
const Admin = require('./models/Admin');

// Initialize app
const app = express();

// Configure CORS to allow credentials
app.use(cors({
  origin: 'http://localhost:3000', // Frontend origin
  credentials: true // Allow cookies to be sent with requests
}));

// Middleware
// Increase payload size limit for face images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Connected');
  // Initialize default admin user
  initializeDefaultAdmin();
})
.catch(err => console.log(err));

// Function to initialize default admin user
async function initializeDefaultAdmin() {
  try {
    // Check if default admin credentials are set in environment variables
    const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME;
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL;
    
    if (!defaultUsername || !defaultPassword || !defaultEmail) {
      console.log('Default admin credentials not set in environment variables');
      return;
    }
    
    // Check if admin with default username already exists
    const existingAdmin = await Admin.findOne({ username: defaultUsername });
    
    if (existingAdmin) {
      console.log(`Admin user '${defaultUsername}' already exists`);
      return;
    }
    
    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
    
    // Create the default admin user
    const defaultAdmin = new Admin({
      username: defaultUsername,
      email: defaultEmail,
      password: hashedPassword
    });
    
    await defaultAdmin.save();
    console.log(`Default admin user '${defaultUsername}' created successfully`);
  } catch (error) {
    console.error('Error initializing default admin:', error.message);
  }
}

// Use routes
const batchRoutes = require('./routes/batches');
app.use('/api/jobs', jobRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Repair Shop API' });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});