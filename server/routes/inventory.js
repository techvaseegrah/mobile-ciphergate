const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Map the endpoints to the controller functions
router.get('/', inventoryController.getAllParts);        // GET /api/inventory
router.post('/', inventoryController.createPart);       // POST /api/inventory
router.put('/:id', inventoryController.updatePart);     // PUT /api/inventory/:id
router.delete('/:id', inventoryController.deletePart);  // DELETE /api/inventory/:id

// IMPORTANT: You must export the router
module.exports = router;