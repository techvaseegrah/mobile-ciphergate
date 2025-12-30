const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Map the endpoints to the controller functions
router.get('/', categoryController.getAllCategories);        // GET /api/categories
router.post('/', categoryController.createCategory);        // POST /api/categories
router.put('/:id', categoryController.updateCategory);      // PUT /api/categories/:id
router.delete('/:id', categoryController.deleteCategory);   // DELETE /api/categories/:id

// IMPORTANT: You must export the router
module.exports = router;