const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { 
  getPurchases,
  getPurchasesBySupplier,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase
} = require('../controllers/purchaseController');

// All routes are protected and require admin access
router.route('/')
  .get(protect, adminOnly, getPurchases)
  .post(protect, adminOnly, createPurchase);

router.route('/supplier/:id')
  .get(protect, adminOnly, getPurchasesBySupplier);

router.route('/:id')
  .get(protect, adminOnly, getPurchaseById)
  .put(protect, adminOnly, updatePurchase)
  .delete(protect, adminOnly, deletePurchase);

module.exports = router;