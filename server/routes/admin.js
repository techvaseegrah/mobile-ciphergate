const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Map the endpoints to the controller functions
router.post('/login', adminController.loginAdmin);        // POST /api/admin/login
router.post('/register', adminController.registerAdmin);  // POST /api/admin/register
router.get('/location-settings', adminController.getLocationSettings);  // GET /api/admin/location-settings
router.get('/public-location-settings', adminController.getPublicLocationSettings);  // GET /api/admin/public-location-settings
router.put('/location-settings', adminController.updateLocationSettings);  // PUT /api/admin/location-settings

// IMPORTANT: You must export the router
module.exports = router;