const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

// Map the endpoints to the controller functions
router.get('/', batchController.getAllBatches);        // GET /api/batches
router.get('/:id', batchController.getBatchById);     // GET /api/batches/:id
router.post('/', batchController.createBatch);        // POST /api/batches
router.put('/:id', batchController.updateBatch);      // PUT /api/batches/:id
router.delete('/:id', batchController.deleteBatch);   // DELETE /api/batches/:id

// IMPORTANT: You must export the router
module.exports = router;