const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Map the endpoints to the controller functions
router.get('/', departmentController.getDepartments);        // GET /api/departments
router.post('/', departmentController.createDepartment);    // POST /api/departments
router.put('/:id', departmentController.updateDepartment);  // PUT /api/departments/:id
router.delete('/:id', departmentController.deleteDepartment); // DELETE /api/departments/:id

// IMPORTANT: You must export the router
module.exports = router;