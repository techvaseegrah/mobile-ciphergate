
router.post('/', workerController.createWorker);
router.get('/', workerController.getWorkers);
router.put('/:id', workerController.updateWorker);
router.delete('/:id', workerController.deleteWorker);
router.post('/attendance', workerController.recordAttendance); // Add attendance route
router.get('/attendance', workerController.getAttendanceRecords); // Get attendance records

module.exports = router;