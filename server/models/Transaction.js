const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Transaction Schema
const TransactionSchema = new Schema({
  type: { 
    type: String, 
    enum: ['Income', 'Expense'],
    required: true
  },
  category: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  payment_method: { 
    type: String, 
    enum: ['Cash', 'Card', 'Online/UPI']
  },
  reference_job_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Job'
  },
  description: { 
    type: String 
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Transaction', TransactionSchema);