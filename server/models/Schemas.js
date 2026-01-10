const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 1. Worker Schema
const WorkerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Manager', 'Technician', 'Admin'], default: 'Technician' },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  faceData: [{ type: String }], // Store multiple face images as base64 strings
  rfid: { type: String, unique: true }, // RFID field (optional)
  salary: { type: Number }, // Salary field (optional)
  batch: { type: Schema.Types.ObjectId, ref: 'Batch' }, // Batch field (optional)
  attendanceRecords: [{ 
    date: { type: Date, default: Date.now },
    checkIn: { type: Date },
    checkOut: { type: Date },
    method: { type: String, enum: ['face', 'rfid', 'checkIn', 'checkOut'] } // Attendance method
  }]
});

// 2. Customer Schema
const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  address: String
});

// 3. Category Schema
const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// 4. Part Schema (Inventory)
const PartSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true, required: true },
  category: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category',
    required: true
  },
  supplier: { 
    type: Schema.Types.ObjectId, 
    ref: 'Supplier'
  },
  compatible_models: [{ type: String }],
  stock: { type: Number, default: 0 },
  min_stock_alert: { type: Number, default: 5 },
  cost_price: { type: Number },
  selling_price: { type: Number },
  location: { type: String },
  color: { type: String }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// 5. Department Schema
const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// 6. Job Schema
const JobSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  device_brand: String,
  device_model: String,
  imei_number: String,
  serial_number: String,
  device_condition: String,
  reported_issue: String,
  repair_type: { 
    type: String, 
    enum: ['hardware', 'software', 'diagnostics'], 
    default: 'hardware' 
  },
  urgency_level: { 
    type: String, 
    enum: ['normal', 'express', 'urgent'], 
    default: 'normal' 
  },
  estimated_delivery_date: Date,
  service_charges: Number,
  parts_cost: Number,
  advance_payment: Number,
  payment_method: { 
    type: String, 
    enum: ['cash', 'card', 'upi', 'bank_transfer'], 
    default: 'cash' 
  },
  total_amount: Number,
  discount_amount: { type: Number, default: 0 },
  job_card_number: String,
  status: { 
    type: String, 
    enum: ['Intake', 'Pending Approval', 'In Progress', 'Done', 'Picked Up', 'Cancelled'], 
    default: 'Intake' 
  },
  cancellation_reason: String,
  cancelled_at: Date,
  taken_by_worker: { type: Schema.Types.ObjectId, ref: 'Worker' },
  assigned_technician: { type: Schema.Types.ObjectId, ref: 'Worker' },
  repair_job_taken_time: { type: Date, default: Date.now },
  repair_done_time: Date,
  service_notes: String,
  estimated_cost: Number,
  final_customer_price: Number,
  delivery_worker: { type: Schema.Types.ObjectId, ref: 'Worker' },
  parts_used: [{
    part: { type: Schema.Types.ObjectId, ref: 'Part' },
    quantity: Number,
    price_type: { type: String, enum: ['Internal', 'Outsourced'] },
    edited_cost: Number // Store edited cost for this part in this job
  }],
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  customer_photo: { type: String }, // Store customer photo as base64 string or URL
  device_video: { type: String } // Store device video as base64 string or URL
});

// Batch Schema
const BatchSchema = new Schema({
  name: { type: String, required: true },
  workingTime: {
    from: { type: String, required: true },
    to: { type: String, required: true }
  },
  lunchTime: {
    from: { type: String },
    to: { type: String },
    enabled: { type: Boolean, default: true }
  },
  breakTime: {
    from: { type: String },
    to: { type: String },
    enabled: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Create a simple settings schema to store the last bill number
const SettingsSchema = new Schema({
  lastBillNumber: { type: Number, default: 0 }
});

// Exports
module.exports = {
  Worker: mongoose.model('Worker', WorkerSchema),
  Customer: mongoose.model('Customer', CustomerSchema),
  Category: mongoose.model('Category', CategorySchema),
  Part: mongoose.model('Part', PartSchema),
  Job: mongoose.model('Job', JobSchema),
  Department: mongoose.model('Department', DepartmentSchema),
  Batch: mongoose.model('Batch', BatchSchema),
  Settings: mongoose.model('Settings', SettingsSchema),
  Holiday: require('./Holiday')
};