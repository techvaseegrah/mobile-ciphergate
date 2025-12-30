const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  part: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const purchaseSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  items: [purchaseItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partial', 'Overdue'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Purchase', purchaseSchema);