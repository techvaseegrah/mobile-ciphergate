const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Map the endpoints to the controller functions
router.get('/summary', protect, adminOnly, dashboardController.getDashboardSummary); // GET /api/dashboard/summary
router.get('/financials', protect, adminOnly, dashboardController.getFinancialData); // GET /api/dashboard/financials

// IMPORTANT: You must export the router
module.exports = router;