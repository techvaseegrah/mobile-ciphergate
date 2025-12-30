const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Map the endpoints to the controller functions
router.post('/', transactionController.createTransaction);           // POST /api/transactions
router.get('/', transactionController.getAllTransactions);          // GET /api/transactions
router.get('/summary', transactionController.getTransactionSummary); // GET /api/transactions/summary

// IMPORTANT: You must export the router
module.exports = router;