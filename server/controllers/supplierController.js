const asyncHandler = require('express-async-handler');
const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private/Admin
const getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({}).sort({ name: 1 });
  res.json(suppliers);
});

// @desc    Get supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private/Admin
const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  res.json(supplier);
});

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private/Admin
const createSupplier = asyncHandler(async (req, res) => {
  const { 
    name, 
    contactPerson, 
    email, 
    phone, 
    address, 
    gstNumber, 
    paymentTerms,
    isActive = true
  } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Supplier name is required');
  }

  // Check if supplier already exists
  const supplierExists = await Supplier.findOne({ name });
  if (supplierExists) {
    res.status(400);
    throw new Error('Supplier with this name already exists');
  }

  const supplier = new Supplier({
    name,
    contactPerson,
    email,
    phone,
    address,
    gstNumber,
    paymentTerms,
    isActive
  });

  const createdSupplier = await supplier.save();
  res.status(201).json(createdSupplier);
});

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
const updateSupplier = asyncHandler(async (req, res) => {
  const { 
    name, 
    contactPerson, 
    email, 
    phone, 
    address, 
    gstNumber, 
    paymentTerms,
    isActive
  } = req.body;

  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  // Check if another supplier with the same name already exists
  if (name && name !== supplier.name) {
    const supplierExists = await Supplier.findOne({ name, _id: { $ne: req.params.id } });
    if (supplierExists) {
      res.status(400);
      throw new Error('Supplier with this name already exists');
    }
  }

  supplier.name = name || supplier.name;
  supplier.contactPerson = contactPerson || supplier.contactPerson;
  supplier.email = email || supplier.email;
  supplier.phone = phone || supplier.phone;
  supplier.address = address || supplier.address;
  supplier.gstNumber = gstNumber || supplier.gstNumber;
  supplier.paymentTerms = paymentTerms || supplier.paymentTerms;
  supplier.isActive = isActive !== undefined ? isActive : supplier.isActive;

  const updatedSupplier = await supplier.save();
  res.json(updatedSupplier);
});

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  await supplier.remove();
  res.json({ message: 'Supplier removed successfully' });
});

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};