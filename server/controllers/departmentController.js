const { Department } = require('../models/Schemas');

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if department already exists
    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({ error: 'Department already exists' });
    }
    
    const newDepartment = new Department({ name });
    await newDepartment.save();
    res.status(201).json(newDepartment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const updatedDepartment = await Department.findByIdAndUpdate(
      id, 
      { name }, 
      { new: true, runValidators: true }
    );
    
    if (!updatedDepartment) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(updatedDepartment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedDepartment = await Department.findByIdAndDelete(id);
    
    if (!deletedDepartment) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};