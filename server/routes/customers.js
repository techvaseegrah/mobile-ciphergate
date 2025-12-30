const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Map the endpoints to the controller functions
router.get('/', customerController.getAllCustomers);        // GET /api/customers

// IMPORTANT: You must export the router
module.exports = router;