const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');

// GET /api/holidays: Fetch all holidays
router.get('/', holidayController.getAllHolidays);

// GET /api/holidays/:id: Fetch a specific holiday by ID
router.get('/:id', holidayController.getHolidayById);

// POST /api/holidays: Add a new holiday
router.post('/', holidayController.createHoliday);

// PUT /api/holidays/:id: Update a holiday
router.put('/:id', holidayController.updateHoliday);

// DELETE /api/holidays/:id: Remove a holiday
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;