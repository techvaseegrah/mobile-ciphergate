const { Category } = require('../models/Schemas');

// GET /api/categories: Fetch all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/categories: Add a new category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    const category = new Category({ name: name.trim() });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/categories/:id: Update category details
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Check if another category with the same name exists
    const existingCategory = await Category.findOne({ name: name.trim(), _id: { $ne: id } });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(id, { name: name.trim() }, { new: true, runValidators: true });
    
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/categories/:id: Remove a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    
    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};