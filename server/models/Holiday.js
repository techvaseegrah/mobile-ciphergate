const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Holiday Schema
const HolidaySchema = new Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: false }, // Made description optional
  appliesTo: { 
    type: String, 
    enum: ['all', 'specific'], 
    required: true 
  },
  employees: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Worker' 
  }], // Only populated when appliesTo is 'specific'
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Holiday', HolidaySchema);