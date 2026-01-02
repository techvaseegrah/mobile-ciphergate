const { Job, Customer, Worker, Part, Settings } = require('../models/Schemas');
const { sendCustomerNotification } = require('../services/communicationService');
const mongoose = require('mongoose');

// POST /api/jobs
exports.createJob = async (req, res) => {
  try {
    const { 
      customerName, 
      customerPhone, 
      customerEmail,
      customerAddress,
      device_brand,
      device_model, 
      imei_number,
      serial_number,
      device_condition,
      reported_issue, 
      repair_type,
      urgency_level,
      estimated_delivery_date,
      service_charges,
      parts_cost,
      advance_payment,
      payment_method,
      total_amount,
      taken_by_worker_id,
      job_card_number,
      customer_photo,
      device_video
    } = req.body;

    // 1. Find or Create Customer
    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = await new Customer({ 
        name: customerName, 
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress
      }).save();
    } else {
      // Update customer info if provided
      if (customerEmail) customer.email = customerEmail;
      if (customerAddress) customer.address = customerAddress;
      await customer.save();
    }

    // 2. Handle auto-incrementing bill number
    let finalJobCardNumber = job_card_number;
    
    // Get or create settings document
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    // If no job card number is provided, generate the next sequential number
    if (!job_card_number || job_card_number.trim() === '') {
      // Increment the last bill number
      settings.lastBillNumber += 1;
      await settings.save();
      
      finalJobCardNumber = settings.lastBillNumber.toString();
    } else {
      // If a job card number is provided, check if it's greater than the current max
      // This ensures we don't reuse numbers that have already been used
      const providedNumber = parseInt(job_card_number);
      if (providedNumber > settings.lastBillNumber) {
        settings.lastBillNumber = providedNumber;
        await settings.save();
      }
    }
    
    // 3. Create Job
    const jobData = {
      customer: customer._id,
      device_brand,
      device_model,
      imei_number,
      serial_number,
      device_condition,
      reported_issue,
      repair_type,
      urgency_level,
      estimated_delivery_date,
      service_charges,
      parts_cost,
      advance_payment,
      payment_method,
      total_amount,
      job_card_number: finalJobCardNumber,
      customer_photo,
      device_video
    };

    // Only add taken_by_worker if it's provided, not empty, and is a valid ObjectId
    if (taken_by_worker_id && taken_by_worker_id.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(taken_by_worker_id)) {
        jobData.taken_by_worker = taken_by_worker_id;
      }
      // If it's not valid, we simply don't add it to jobData
    }

    const newJob = new Job(jobData);
    await newJob.save();

    // 3. Trigger Notification
    await sendCustomerNotification('INTAKE', newJob, customerPhone);

    res.status(201).json({ success: true, job: newJob });
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/:id
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id)
      .populate('customer')
      .populate('taken_by_worker', 'name')
      .populate('assigned_technician', 'name')
      .populate('delivery_worker', 'name')
      .populate({
        path: 'parts_used.part',
        select: 'name sku cost_price category supplier',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'supplier', select: 'name' }
        ]
      });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/worker/:workerId
exports.getJobsByWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    
    // Validate workerId
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ error: 'Invalid worker ID' });
    }
    
    // Find jobs where the worker is assigned as the technician
    const jobs = await Job.find({ assigned_technician: workerId })
      .populate('customer')
      .populate('taken_by_worker', 'name')
      .populate('assigned_technician', 'name')
      .populate('delivery_worker', 'name')
      .sort({ repair_job_taken_time: -1 });
      
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/jobs/:id/update
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // contains status, parts_used, assigned_technician etc.

    // Handle 'Done' Logic
    if (updates.status === 'Done') {
      updates.repair_done_time = new Date();
    }

    // Update the job
    const job = await Job.findByIdAndUpdate(id, updates, { new: true })
      .populate('customer')
      .populate('assigned_technician', 'name')
      .populate('delivery_worker', 'name')
      .populate('department', 'name')
      .populate({
        path: 'parts_used.part',
        select: 'name sku cost_price category supplier',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'supplier', select: 'name' }
        ]
      });

    // Handle Inventory Deduction if parts were added (simplified logic)
    if (updates.parts_used) {
       // Logic to iterate parts_used and decrement Stock in Part collection would go here
    }

    // Trigger 'Done' Notification
    if (updates.status === 'Done') {
      await sendCustomerNotification('DONE', job, job.customer.phone);
    }

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/active
exports.getActiveJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: { $nin: ['Picked Up', 'Cancelled'] } })
      .populate('customer')
      .populate('taken_by_worker', 'name')
      .sort({ repair_job_taken_time: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/cancelled
exports.getCancelledJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'Cancelled' })
      .populate('customer')
      .populate('taken_by_worker', 'name')
      .sort({ cancelled_at: -1 });
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching cancelled jobs:', err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/jobs/:id/cancel
exports.cancelJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    
    const job = await Job.findByIdAndUpdate(
      id,
      { 
        status: 'Cancelled', 
        cancellation_reason,
        cancelled_at: new Date()
      },
      { new: true }
    )
      .populate('customer')
      .populate('taken_by_worker', 'name');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jobs/next-bill-number
exports.getNextBillNumber = async (req, res) => {
  try {
    // Get or create settings document
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    // Return the next bill number (don't increment yet)
    const nextBillNumber = settings.lastBillNumber + 1;
    res.json({ nextBillNumber: nextBillNumber.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};