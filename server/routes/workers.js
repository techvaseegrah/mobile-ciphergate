const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');

// Map the endpoints to the controller functions
router.get('/', workerController.getAllWorkers);        // GET /api/workers
router.get('/:id', workerController.getWorkerById);     // GET /api/workers/:id
router.post('/', workerController.createWorker);       // POST /api/workers
router.put('/:id', workerController.updateWorker);     // PUT /api/workers/:id
router.delete('/:id', workerController.deleteWorker);  // DELETE /api/workers/:id
router.post('/login', workerController.loginWorker);   // POST /api/workers/login
router.post('/attendance', workerController.recordAttendance); // POST /api/workers/attendance
router.get('/attendance', workerController.getAttendanceRecords); // GET /api/workers/attendance
router.get('/:id/face-data', workerController.getWorkerFaceData); // GET /api/workers/:id/face-data

// IMPORTANT: You must export the router
module.exports = router;