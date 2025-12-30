const { Batch } = require('../models/Schemas');

// GET /api/batches: Fetch all batches
exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find();
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/batches/:id: Fetch a specific batch by ID
exports.getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/batches: Add a new batch
exports.createBatch = async (req, res) => {
  try {
    const { name, workingTime, lunchTime, breakTime } = req.body;
    
    const batch = new Batch({
      name,
      workingTime,
      lunchTime,
      breakTime
    });
    
    await batch.save();
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/batches/:id: Update a batch
exports.updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, workingTime, lunchTime, breakTime } = req.body;
    
    const batch = await Batch.findByIdAndUpdate(
      id, 
      { name, workingTime, lunchTime, breakTime },
      { new: true, runValidators: true }
    );
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/batches/:id: Remove a batch
exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByIdAndDelete(id);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json({ message: 'Batch deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};