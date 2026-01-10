const { Part, Category } = require('../models/Schemas');
const mongoose = require('mongoose');

// GET /api/inventory: Fetch all parts (sort by name) with populated category and supplier
exports.getAllParts = async (req, res) => {
  try {
    const parts = await Part.find({}).select('name sku category supplier compatible_models stock min_stock_alert cost_price selling_price location color createdAt updatedAt').populate('category').populate('supplier', 'name').sort({ name: 1 });
    res.json(parts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/inventory: Add a new part
exports.createPart = async (req, res) => {
  try {
    const part = new Part(req.body);
    await part.save();
    
    // Populate category and supplier before sending response
    const populatedPart = await Part.findById(part._id).select('name sku category supplier compatible_models stock min_stock_alert cost_price selling_price location color createdAt updatedAt').populate('category').populate('supplier', 'name');
    res.status(201).json(populatedPart);
  } catch (err) {
    // More detailed error handling
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: 'Validation Error: ' + messages.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A part with this SKU already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/inventory/:id: Update part details
exports.updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating part with ID:', id);
    console.log('Request body:', req.body);
    
    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid part ID format' });
    }
    
    // Check if SKU already exists for another part
    if (req.body.sku) {
      const existingPart = await Part.findOne({ sku: req.body.sku, _id: { $ne: id } });
      if (existingPart) {
        return res.status(400).json({ error: 'A part with this SKU already exists' });
      }
    }
    
    const updatedPart = await Part.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    
    if (!updatedPart) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    // Populate category and supplier before sending response
    const populatedPart = await Part.findById(updatedPart._id).select('name sku category supplier compatible_models stock min_stock_alert cost_price selling_price location color createdAt updatedAt').populate('category').populate('supplier', 'name');
    res.json(populatedPart);
  } catch (err) {
    console.error('Error updating part:', err);
    // More detailed error handling
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: 'Validation Error: ' + messages.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Duplicate key error. A part with this SKU may already exist.' });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/inventory/:id: Remove a part
exports.deletePart = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPart = await Part.findByIdAndDelete(id);
    
    if (!deletedPart) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    res.json({ message: 'Part deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};