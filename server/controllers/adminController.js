const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// POST /api/admin/login: Authenticate admin
exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find admin by username
    const admin = await Admin.findOne({ username }).select('+password');
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Return admin data with token
    const adminData = {
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      locationSettings: admin.locationSettings,
      token: generateToken(admin._id, admin.role)
    };
    
    res.json({ admin: adminData, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/register: Register a new admin
exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if admin already exists
    const adminExists = await Admin.findOne({ $or: [{ username }, { email }] });
    
    if (adminExists) {
      return res.status(400).json({ error: 'Admin already exists with this username or email' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin
    const admin = new Admin({
      username,
      email,
      password: hashedPassword
    });
    
    await admin.save();
    
    // Return admin data with token
    const adminData = {
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      locationSettings: admin.locationSettings,
      token: generateToken(admin._id, admin.role)
    };
    
    res.status(201).json({ admin: adminData, message: 'Admin registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/location-settings: Get location settings
exports.getLocationSettings = async (req, res) => {
  try {
    // Get the first admin (assuming single admin setup)
    const admin = await Admin.findOne();
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({
      enabled: admin.locationSettings.enabled,
      latitude: admin.locationSettings.latitude,
      longitude: admin.locationSettings.longitude,
      radius: admin.locationSettings.radius
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/public-location-settings: Get location settings for public access (used by workers)
exports.getPublicLocationSettings = async (req, res) => {
  try {
    // Get the first admin (assuming single admin setup)
    const admin = await Admin.findOne();
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Only return location settings if enabled
    if (!admin.locationSettings.enabled) {
      return res.json({
        enabled: false,
        latitude: 0,
        longitude: 0,
        radius: 0
      });
    }
    
    res.json({
      enabled: admin.locationSettings.enabled,
      latitude: admin.locationSettings.latitude,
      longitude: admin.locationSettings.longitude,
      radius: admin.locationSettings.radius
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/location-settings: Update location settings
exports.updateLocationSettings = async (req, res) => {
  try {
    const { enabled, latitude, longitude, radius } = req.body;
    
    // Get the first admin (assuming single admin setup)
    const admin = await Admin.findOne();
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Update location settings
    admin.locationSettings = {
      enabled: enabled !== undefined ? enabled : admin.locationSettings.enabled,
      latitude: latitude !== undefined ? latitude : admin.locationSettings.latitude,
      longitude: longitude !== undefined ? longitude : admin.locationSettings.longitude,
      radius: radius !== undefined ? radius : admin.locationSettings.radius
    };
    
    await admin.save();
    
    res.json({
      enabled: admin.locationSettings.enabled,
      latitude: admin.locationSettings.latitude,
      longitude: admin.locationSettings.longitude,
      radius: admin.locationSettings.radius,
      message: 'Location settings updated successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};