const { Worker } = require('../models/Schemas');
const { isWithinAllowedLocation } = require('../utils/geolocation');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// GET /api/workers: Fetch all workers
exports.getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().populate('department batch');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/workers/:id: Fetch a specific worker by ID
exports.getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await Worker.findById(id).populate('department batch');
    
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/workers/:id/face-data: Fetch face data for a specific worker
exports.getWorkerFaceData = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await Worker.findById(id);
    
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // Return only the face data
    res.json({
      faceImages: worker.faceData || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate unique RFID
const generateUniqueRFID = () => {
  // Generate a unique RFID (in real implementation, this could be more sophisticated)
  return 'RFID-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
};

// POST /api/workers: Add a new worker
exports.createWorker = async (req, res) => {
  try {
    const { name, email, password, department, salary, faceData, rfid, batch } = req.body;
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create worker object
    const workerData = {
      name,
      email,
      password: hashedPassword,
      role: 'Technician' // Default role
    };
    
    // Add RFID if provided
    if (rfid) {
      workerData.rfid = rfid;
    }
    
    // Add department if provided
    if (department) {
      workerData.department = department;
    }
    
    // Add salary if provided
    if (salary !== undefined && salary !== null && salary !== '') {
      workerData.salary = Number(salary);
    }
    
    // Add batch if provided
    if (batch) {
      workerData.batch = batch;
    }
    
    // Add face data if provided (ensure it's an array)
    if (faceData) {
      workerData.faceData = Array.isArray(faceData) ? faceData : [faceData];
    } else {
      workerData.faceData = [];
    }
    
    const worker = new Worker(workerData);
    await worker.save();
    res.status(201).json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/workers/:id: Update a worker
exports.updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, department, salary, faceData, rfid, batch } = req.body;
    
    // Prepare update object
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (department) updateData.department = department;
    if (salary !== undefined && salary !== null && salary !== '') updateData.salary = Number(salary); // Allow updating salary
    if (faceData) updateData.faceData = Array.isArray(faceData) ? faceData : [faceData];
    if (rfid) updateData.rfid = rfid; // Allow updating RFID
    if (batch) updateData.batch = batch; // Allow updating batch
    
    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    const worker = await Worker.findByIdAndUpdate(id, updateData, { new: true }).populate('department batch');
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.status(200).json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/workers/:id: Remove a worker
exports.deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedWorker = await Worker.findByIdAndDelete(id);
    
    if (!deletedWorker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    res.json({ message: 'Worker deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/workers/login: Authenticate worker
exports.loginWorker = async (req, res) => {
  try {
    const { workerId, password } = req.body;
    
    // Find worker by ID
    const worker = await Worker.findById(workerId).populate('department');
    
    if (!worker) {
      return res.status(401).json({ error: 'Invalid worker ID or password' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, worker.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid worker ID or password' });
    }
    
    // Return worker data without password
    const workerData = {
      _id: worker._id,
      name: worker.name,
      email: worker.email,
      role: worker.role,
      department: worker.department,
      rfid: worker.rfid
    };
    
    res.json({ worker: workerData, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/workers/attendance: Record attendance
exports.recordAttendance = async (req, res) => {
  try {
    const { workerId, method, rfid, latitude, longitude } = req.body;
    
    // Find worker by ID or RFID
    const worker = rfid 
      ? await Worker.findOne({ rfid }) 
      : await Worker.findById(workerId);
    
    if (!worker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Worker not found' 
      });
    }
    
    // Get admin location settings
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin settings not found' 
      });
    }
    
    // Validate location if provided, but skip for face and rfid methods (admin attendance)
    console.log('Location data received:', { latitude, longitude });
    console.log('Admin location settings:', admin.locationSettings);
    console.log('Method:', method);
    
    // Check if method is face or rfid (admin attendance) to skip location validation
    const isAdminAttendance = method === 'face' || method === 'rfid';
    console.log('Is admin attendance (face/rfid):', isAdminAttendance);
    console.log('Method comparison - face:', method === 'face', 'rfid:', method === 'rfid');
    
    if (isAdminAttendance) {
      console.log('Location validation skipped for admin attendance (face/rfid method)');
    } else {
      // Only validate location for non-admin attendance methods
      console.log('Processing location validation for non-admin attendance');
      if (admin.locationSettings && admin.locationSettings.enabled) {
        if (latitude !== undefined && longitude !== undefined) {
          const workerLocation = { latitude, longitude };
          const isAdminLocationValid = isWithinAllowedLocation(admin.locationSettings, workerLocation);
          
          if (!isAdminLocationValid) {
            console.log('Worker is outside allowed location');
            return res.status(400).json({ 
              success: false, 
              message: 'You are outside the allowed attendance location' 
            });
          } else {
            console.log('Worker is within allowed location');
          }
        } else {
          // Location is required but not provided
          console.log('Location is required but not provided');
          return res.status(400).json({ 
            success: false, 
            message: 'Location permission is required to mark attendance' 
          });
        }
      } else {
        console.log('Location validation skipped (not enabled or not configured)');
      }
    }
    
    // Check if worker is on cooldown (last punch was within 1 minute)
    const now = new Date();
    if (worker.attendanceRecords && worker.attendanceRecords.length > 0) {
      // Get the most recent attendance record by checking the latest checkIn or checkOut time
      let lastPunchTime = null;
      
      // Sort records by date to get the most recent ones first
      const sortedRecords = [...worker.attendanceRecords].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      // Look through records to find the most recent punch (checkIn or checkOut)
      for (const record of sortedRecords) {
        // Check checkOut time first (more likely to be the most recent)
        if (record.checkOut) {
          const checkOutTime = new Date(record.checkOut);
          if (!lastPunchTime || checkOutTime > lastPunchTime) {
            lastPunchTime = checkOutTime;
          }
        }
        
        // Check checkIn time
        if (record.checkIn) {
          const checkInTime = new Date(record.checkIn);
          if (!lastPunchTime || checkInTime > lastPunchTime) {
            lastPunchTime = checkInTime;
          }
        }
        
        // If we found a punch time, we can stop looking
        if (lastPunchTime) {
          break;
        }
      }
      
      // If we found a previous punch time, check if it's within the cooldown period
      if (lastPunchTime) {
        const timeDiff = now - lastPunchTime;
        console.log(`Last punch was ${timeDiff}ms ago for worker ${worker.name}`);
        
        // If less than 1 minute (60000 ms) has passed, reject the request
        if (timeDiff < 60000) {
          const remainingTime = Math.ceil((60000 - timeDiff) / 1000);
          console.log(`Rejecting punch for worker ${worker.name} - ${remainingTime} seconds remaining in cooldown`);
          return res.status(400).json({ 
            success: false,
            reason: "COOLDOWN_ACTIVE",
            remainingTime: remainingTime,
            message: `Please wait ${remainingTime} seconds before next punch`
          });
        }
      }
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's attendance records
    const todayRecords = worker.attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    
    // Sort today's records by date to get the latest
    todayRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let attendanceRecord;
    
    if (method === 'checkIn') {
      // For checkIn, we either update the latest record that doesn't have checkIn
      // or create a new record
      
      // Look for a record from today that doesn't have checkIn yet
      const incompleteRecord = todayRecords.find(record => !record.checkIn);
      
      if (incompleteRecord) {
        // Update existing record
        incompleteRecord.checkIn = new Date();
        incompleteRecord.method = 'checkIn';
        attendanceRecord = incompleteRecord;
      } else {
        // Create new record
        attendanceRecord = {
          date: new Date(),
          checkIn: new Date(),
          method: 'checkIn'
        };
        worker.attendanceRecords.push(attendanceRecord);
      }
    } else if (method === 'checkOut') {
      // For checkOut, we update the latest record that has checkIn but no checkOut
      
      // Look for a record from today that has checkIn but no checkOut
      const checkOutRecord = [...todayRecords].reverse().find(record => record.checkIn && !record.checkOut);
      
      if (checkOutRecord) {
        // Update existing record
        checkOutRecord.checkOut = new Date();
        checkOutRecord.method = 'checkOut';
        attendanceRecord = checkOutRecord;
      } else {
        // If no record with checkIn found, create a new record with only checkOut
        attendanceRecord = {
          date: new Date(),
          checkOut: new Date(),
          method: 'checkOut'
        };
        worker.attendanceRecords.push(attendanceRecord);
      }
    } else {
      // For face attendance, we'll determine if it's check-in or check-out based on existing records
      const now = new Date();
      
      // Look for a record from today that has checkIn but no checkOut (for checkout)
      const checkOutRecord = [...todayRecords].reverse().find(record => record.checkIn && !record.checkOut);
      
      if (checkOutRecord) {
        // Checkout
        checkOutRecord.checkOut = now;
        checkOutRecord.method = 'face';
        attendanceRecord = checkOutRecord;
      } else {
        // Check-in
        const incompleteRecord = todayRecords.find(record => !record.checkIn);
        
        if (incompleteRecord) {
          // Update existing record
          incompleteRecord.checkIn = now;
          incompleteRecord.method = 'face';
          attendanceRecord = incompleteRecord;
        } else {
          // Create new record
          attendanceRecord = {
            date: now,
            checkIn: now,
            method: 'face'
          };
          worker.attendanceRecords.push(attendanceRecord);
        }
      }
    }
    
    await worker.save();
    console.log(`Attendance recorded successfully for worker ${worker.name}`);
    res.status(200).json({ 
      success: true,
      message: "Attendance punched successfully",
      attendanceRecord: {
        workerName: worker.name,
        date: attendanceRecord.date,
        checkIn: attendanceRecord.checkIn,
        checkOut: attendanceRecord.checkOut,
        method: attendanceRecord.method
      }
    });
  } catch (err) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET /api/workers/attendance: Get attendance records
exports.getAttendanceRecords = async (req, res) => {
  try {
    const workers = await Worker.find().populate('department');
    res.status(200).json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};