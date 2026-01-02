const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// Map the endpoints to the controller functions
router.post('/', jobController.createJob);                    // POST /api/jobs
router.get('/next-bill-number', jobController.getNextBillNumber); // GET /api/jobs/next-bill-number
router.get('/active', jobController.getActiveJobs);          // GET /api/jobs/active
router.get('/cancelled', jobController.getCancelledJobs);     // GET /api/jobs/cancelled
router.get('/worker/:workerId', jobController.getJobsByWorker); // GET /api/jobs/worker/:workerId
router.get('/:id', jobController.getJobById);                // GET /api/jobs/:id
router.put('/:id/update', jobController.updateJob);          // PUT /api/jobs/:id/update
router.put('/:id/cancel', jobController.cancelJob);          // PUT /api/jobs/:id/cancel

// IMPORTANT: You must export the router
module.exports = router;