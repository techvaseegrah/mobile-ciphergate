const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { 
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');

// All routes are protected and require admin access
router.route('/')
  .get(protect, adminOnly, getSuppliers)
  .post(protect, adminOnly, createSupplier);

router.route('/:id')
  .get(protect, adminOnly, getSupplierById)
  .put(protect, adminOnly, updateSupplier)
  .delete(protect, adminOnly, deleteSupplier);

module.exports = router;