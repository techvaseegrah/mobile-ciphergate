const asyncHandler = require('express-async-handler');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const { Part } = require('../models/Schemas');

// @desc    Get all purchases with filtering
// @route   GET /api/purchases
// @access  Private/Admin
const getPurchases = asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    supplier, 
    paymentStatus, 
    minAmount, 
    maxAmount, 
    invoiceNumber,
    part
  } = req.query;

  // Build filter object
  let filter = {};

  // Date range filter
  if (startDate || endDate) {
    filter.purchaseDate = {};
    if (startDate) {
      filter.purchaseDate.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.purchaseDate.$lte = new Date(endDate);
    }
  }

  // Supplier filter
  if (supplier) {
    filter.supplier = supplier;
  }

  // Payment status filter (can be multiple statuses)
  if (paymentStatus) {
    const statuses = Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus];
    filter.paymentStatus = { $in: statuses };
  }

  // Amount range filter
  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.totalAmount = {};
    if (minAmount !== undefined) {
      filter.totalAmount.$gte = parseFloat(minAmount);
    }
    if (maxAmount !== undefined) {
      filter.totalAmount.$lte = parseFloat(maxAmount);
    }
  }

  // Invoice number filter (partial match)
  if (invoiceNumber) {
    filter.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
  }

  // Part filter
  if (part) {
    filter['items.part'] = part;
  }

  const purchases = await Purchase.find(filter)
    .populate('supplier', 'name')
    .populate('items.part', 'name sku')
    .sort({ purchaseDate: -1 });
    
  res.json(purchases);
});

// @desc    Get purchases by supplier ID
// @route   GET /api/purchases/supplier/:id
// @access  Private/Admin
const getPurchasesBySupplier = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ supplier: req.params.id })
    .populate('items.part', 'name sku')
    .sort({ purchaseDate: -1 });
    
  res.json(purchases);
});

// @desc    Get purchase by ID
// @route   GET /api/purchases/:id
// @access  Private/Admin
const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate('supplier', 'name contactPerson email phone')
    .populate('items.part', 'name sku category')
    .populate('items.part.category', 'name');

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  res.json(purchase);
});

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private/Admin
const createPurchase = asyncHandler(async (req, res) => {
  const { 
    supplier,
    purchaseDate,
    invoiceNumber,
    items,
    subtotal,
    tax,
    discount,
    totalAmount,
    paymentStatus,
    notes
  } = req.body;

  // Validate required fields
  if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Supplier and items are required');
  }

  // Validate that supplier exists
  const supplierExists = await Supplier.findById(supplier);
  if (!supplierExists) {
    res.status(400);
    throw new Error('Supplier not found');
  }

  // Validate items and calculate totals if not provided
  let calculatedSubtotal = 0;
  for (const item of items) {
    if (!item.part || !item.quantity || !item.unitPrice) {
      res.status(400);
      throw new Error('Each item must have a part, quantity, and unit price');
    }
    
    // Validate that part exists
    const partExists = await Part.findById(item.part);
    if (!partExists) {
      res.status(400);
      throw new Error(`Part with ID ${item.part} not found`);
    }
    
    item.totalPrice = item.quantity * item.unitPrice;
    calculatedSubtotal += item.totalPrice;
  }

  // Use provided subtotal or calculate it
  const finalSubtotal = subtotal || calculatedSubtotal;
  const finalTax = tax || 0;
  const finalDiscount = discount || 0;
  const finalTotalAmount = totalAmount || (finalSubtotal + finalTax - finalDiscount);

  const purchase = new Purchase({
    supplier,
    purchaseDate: purchaseDate || Date.now(),
    invoiceNumber,
    items,
    subtotal: finalSubtotal,
    tax: finalTax,
    discount: finalDiscount,
    totalAmount: finalTotalAmount,
    paymentStatus: paymentStatus || 'Pending',
    notes
  });

  const createdPurchase = await purchase.save();
  
  // Automatically update inventory quantities
  for (const item of items) {
    const part = await Part.findById(item.part);
    if (part) {
      part.stock = (part.stock || 0) + item.quantity;
      await part.save();
    }
  }
  
  // Populate the response
  const populatedPurchase = await Purchase.findById(createdPurchase._id)
    .populate('supplier', 'name')
    .populate('items.part', 'name sku');
    
  res.status(201).json(populatedPurchase);
});

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private/Admin
const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  const { 
    supplier,
    purchaseDate,
    invoiceNumber,
    items,
    subtotal,
    tax,
    discount,
    totalAmount,
    paymentStatus,
    notes
  } = req.body;

  // Update fields if provided
  purchase.supplier = supplier || purchase.supplier;
  purchase.purchaseDate = purchaseDate || purchase.purchaseDate;
  purchase.invoiceNumber = invoiceNumber || purchase.invoiceNumber;
  purchase.items = items || purchase.items;
  purchase.subtotal = subtotal !== undefined ? subtotal : purchase.subtotal;
  purchase.tax = tax !== undefined ? tax : purchase.tax;
  purchase.discount = discount !== undefined ? discount : purchase.discount;
  purchase.totalAmount = totalAmount !== undefined ? totalAmount : purchase.totalAmount;
  purchase.paymentStatus = paymentStatus || purchase.paymentStatus;
  purchase.notes = notes || purchase.notes;

  // Get the original purchase to calculate inventory differences
  const originalPurchase = await Purchase.findById(req.params.id);
  
  const updatedPurchase = await purchase.save();
  
  // Update inventory quantities based on the difference between old and new items
  // First, revert the old items
  if (originalPurchase && originalPurchase.items) {
    for (const item of originalPurchase.items) {
      const part = await Part.findById(item.part);
      if (part) {
        part.stock = (part.stock || 0) - item.quantity;
        await part.save();
      }
    }
  }
  
  // Then add the new items
  if (items) {
    for (const item of items) {
      const part = await Part.findById(item.part);
      if (part) {
        part.stock = (part.stock || 0) + item.quantity;
        await part.save();
      }
    }
  }
  
  // Populate the response
  const populatedPurchase = await Purchase.findById(updatedPurchase._id)
    .populate('supplier', 'name')
    .populate('items.part', 'name sku');
    
  res.json(populatedPurchase);
});

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private/Admin
const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  // Decrease inventory quantities when deleting a purchase
  if (purchase.items) {
    for (const item of purchase.items) {
      const part = await Part.findById(item.part);
      if (part) {
        part.stock = (part.stock || 0) - item.quantity;
        // Ensure stock doesn't go negative
        if (part.stock < 0) part.stock = 0;
        await part.save();
      }
    }
  }

  await purchase.deleteOne();
  res.json({ message: 'Purchase removed successfully' });
});

module.exports = {
  getPurchases,
  getPurchasesBySupplier,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase
};