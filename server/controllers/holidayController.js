const { Holiday, Worker } = require('../models/Schemas');

// GET /api/holidays: Fetch all holidays with employee details
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find()
      .populate('employees', 'name email') // Populate employee details
      .sort({ date: -1 }); // Sort by date descending
    
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/holidays/:id: Fetch a specific holiday by ID
exports.getHolidayById = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findById(id).populate('employees', 'name email');
    
    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/holidays: Add a new holiday
exports.createHoliday = async (req, res) => {
  try {
    const { name, date, description, appliesTo, employees } = req.body;
    
    // Validate required fields (removed description as required)
    if (!name || !date || !appliesTo) {
      return res.status(400).json({ error: 'Name, Date, and Applies To are required' });
    }
    
    // Validate appliesTo value
    if (appliesTo !== 'all' && appliesTo !== 'specific') {
      return res.status(400).json({ error: 'Invalid appliesTo value' });
    }
    
    // Validate employees array when appliesTo is 'specific'
    if (appliesTo === 'specific' && (!employees || !Array.isArray(employees) || employees.length === 0)) {
      return res.status(400).json({ error: 'Employees are required when appliesTo is specific' });
    }
    
    // Validate employees exist in database when appliesTo is 'specific'
    let employeeIds = [];
    if (appliesTo === 'specific') {
      const workers = await Worker.find({ '_id': { $in: employees } });
      if (workers.length !== employees.length) {
        return res.status(400).json({ error: 'One or more employees not found' });
      }
      employeeIds = employees;
    }
    
    // Create holiday object
    const holidayData = {
      name,
      date: new Date(date),
      description: description || '', // Make description optional
      appliesTo,
      employees: appliesTo === 'specific' ? employeeIds : []
    };
    
    const holiday = new Holiday(holidayData);
    await holiday.save();
    
    // Populate employees for response
    await holiday.populate('employees', 'name email');
    
    res.status(201).json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/holidays/:id: Update a holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, description, appliesTo, employees } = req.body;
    
    // Validate required fields (removed description as required)
    if (!name || !date || !appliesTo) {
      return res.status(400).json({ error: 'Name, Date, and Applies To are required' });
    }
    
    // Validate appliesTo value
    if (appliesTo !== 'all' && appliesTo !== 'specific') {
      return res.status(400).json({ error: 'Invalid appliesTo value' });
    }
    
    // Validate employees array when appliesTo is 'specific'
    if (appliesTo === 'specific' && (!employees || !Array.isArray(employees) || employees.length === 0)) {
      return res.status(400).json({ error: 'Employees are required when appliesTo is specific' });
    }
    
    // Validate employees exist in database when appliesTo is 'specific'
    let employeeIds = [];
    if (appliesTo === 'specific') {
      const workers = await Worker.find({ '_id': { $in: employees } });
      if (workers.length !== employees.length) {
        return res.status(400).json({ error: 'One or more employees not found' });
      }
      employeeIds = employees;
    }
    
    // Prepare update object
    const updateData = {
      name,
      date: new Date(date),
      description: description || '', // Make description optional
      appliesTo,
      employees: appliesTo === 'specific' ? employeeIds : [],
      updatedAt: new Date()
    };
    
    const holiday = await Holiday.findByIdAndUpdate(id, updateData, { new: true }).populate('employees', 'name email');
    
    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    res.status(200).json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/holidays/:id: Remove a holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if holiday exists
    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    // Check if holiday is in the past (cannot delete past holidays)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(holiday.date);
    holidayDate.setHours(0, 0, 0, 0);
    
    if (holidayDate < today) {
      return res.status(400).json({ error: 'Cannot delete past holidays' });
    }
    
    // Delete the holiday
    await Holiday.findByIdAndDelete(id);
    
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};