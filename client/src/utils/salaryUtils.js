// Utility functions for salary calculations

/**
 * Calculate the number of working days in a month
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @param {Array} holidays - Array of holiday objects with date property
 * @param {string} workerId - The ID of the worker (to check applicable holidays)
 * @returns {number} The number of working days
 */
export const calculateWorkingDays = (year, month, holidays, workerId) => {
  // Get the total number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Count Sundays in the month
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day)); // Using UTC to avoid timezone issues
    if (date.getUTCDay() === 0) { // Sunday is 0
      sundays++;
    }
  }
  
  // Count holidays that apply to this worker
  let applicableHolidays = 0;
  if (holidays && Array.isArray(holidays)) {
    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      // Check if holiday is in the same month and year
      if (holidayDate.getUTCFullYear() === year && holidayDate.getUTCMonth() === month - 1) {
        // Check if holiday applies to all workers or specifically to this worker
        if (holiday.appliesTo === 'all' || 
            (holiday.appliesTo === 'specific' && 
             holiday.employees && 
             Array.isArray(holiday.employees) && 
             holiday.employees.some(emp => emp._id === workerId || emp === workerId))) {
          applicableHolidays++;
        }
      }
    });
  }
  
  // Working days = Total days - Sundays - Applicable holidays
  return Math.max(0, daysInMonth - sundays - applicableHolidays);
};

/**
 * Calculate per-day salary
 * @param {number} monthlySalary - The monthly salary
 * @param {number} workingDays - The number of working days
 * @returns {number} The per-day salary
 */
export const calculatePerDaySalary = (monthlySalary, workingDays) => {
  if (!monthlySalary || workingDays <= 0) return 0;
  return monthlySalary / workingDays;
};

/**
 * Calculate working minutes in a day based on batch schedule
 * @param {Object} batch - The batch object with workingTime, lunchTime, and breakTime
 * @returns {number} The number of working minutes in a day
 */
export const calculateWorkingMinutes = (batch) => {
  if (!batch || !batch.workingTime) return 0;
  
  // Parse working time
  const workingFrom = parseTime(batch.workingTime.from);
  const workingTo = parseTime(batch.workingTime.to);
  
  // Calculate total working time in minutes
  let workingMinutes = (workingTo.hours * 60 + workingTo.minutes) - (workingFrom.hours * 60 + workingFrom.minutes);
  
  // Subtract lunch time if enabled
  if (batch.lunchTime && batch.lunchTime.enabled) {
    const lunchFrom = parseTime(batch.lunchTime.from);
    const lunchTo = parseTime(batch.lunchTime.to);
    const lunchMinutes = (lunchTo.hours * 60 + lunchTo.minutes) - (lunchFrom.hours * 60 + lunchFrom.minutes);
    workingMinutes -= lunchMinutes;
  }
  
  // Subtract break time if enabled
  if (batch.breakTime && batch.breakTime.enabled) {
    const breakFrom = parseTime(batch.breakTime.from);
    const breakTo = parseTime(batch.breakTime.to);
    const breakMinutes = (breakTo.hours * 60 + breakTo.minutes) - (breakFrom.hours * 60 + breakFrom.minutes);
    workingMinutes -= breakMinutes;
  }
  
  return Math.max(0, workingMinutes);
};

/**
 * Calculate per-hour salary based on per-day salary and daily working hours
 * @param {number} perDaySalary - The per-day salary
 * @param {number} dailyWorkingMinutes - The number of working minutes per day
 * @returns {number} The per-hour salary
 */
export const calculatePerHourSalary = (perDaySalary, dailyWorkingMinutes) => {
  if (!perDaySalary || dailyWorkingMinutes <= 0) return 0;
  const dailyWorkingHours = dailyWorkingMinutes / 60;
  return perDaySalary / dailyWorkingHours;
};

/**
 * Calculate per-minute salary based on per-hour salary
 * @param {number} perHourSalary - The per-hour salary
 * @returns {number} The per-minute salary
 */
export const calculatePerMinuteSalary = (perHourSalary) => {
  if (!perHourSalary) return 0;
  return perHourSalary / 60;
};

/**
 * Parse time string (HH:MM) into hours and minutes
 * @param {string} timeString - Time in HH:MM format
 * @returns {Object} Object with hours and minutes properties
 */
const parseTime = (timeString) => {
  if (!timeString) return { hours: 0, minutes: 0 };
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours: isNaN(hours) ? 0 : hours, minutes: isNaN(minutes) ? 0 : minutes };
};

/**
 * Calculate deduction for a single day based on attendance records
 * @param {Object} attendanceRecord - The attendance record for a day
 * @param {Object} batch - The worker's batch
 * @param {number} perMinuteSalary - The per-minute salary
 * @returns {Object} Object containing deduction minutes and deduction amount
 */
export const calculateDailyDeduction = (attendanceRecord, batch, perMinuteSalary) => {
  if (!attendanceRecord || !batch) {
    return { deductionMinutes: 0, deductionAmount: 0 };
  }
  
  // If no check-in, no deduction calculation needed (will be handled as absent)
  if (!attendanceRecord.checkIn) {
    return { deductionMinutes: 0, deductionAmount: 0 };
  }
  
  // If no check-out, we can't calculate deductions accurately
  if (!attendanceRecord.checkOut) {
    return { deductionMinutes: 0, deductionAmount: 0 };
  }
  
  const checkInTime = new Date(attendanceRecord.checkIn);
  const checkOutTime = new Date(attendanceRecord.checkOut);
  
  // Validate dates
  if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
    return { deductionMinutes: 0, deductionAmount: 0 };
  }
  
  // Get batch timings
  const workingFrom = parseTime(batch.workingTime.from);
  const workingTo = parseTime(batch.workingTime.to);
  
  // Calculate shift start and end times for the day
  const shiftStartDate = new Date(checkInTime);
  shiftStartDate.setHours(workingFrom.hours, workingFrom.minutes, 0, 0);
  
  const shiftEndDate = new Date(checkInTime);
  shiftEndDate.setHours(workingTo.hours, workingTo.minutes, 0, 0);
  
  let deductionMinutes = 0;
  
  // Calculate late entry deduction (even 1 minute late)
  if (checkInTime > shiftStartDate) {
    // Late entry - deduct minutes
    const lateMinutes = Math.ceil((checkInTime - shiftStartDate) / (1000 * 60));
    deductionMinutes += Math.max(0, lateMinutes);
  }
  
  // Calculate early exit deduction (even 1 minute early)
  if (checkOutTime < shiftEndDate) {
    // Early exit - deduct minutes
    const earlyMinutes = Math.ceil((shiftEndDate - checkOutTime) / (1000 * 60));
    deductionMinutes += Math.max(0, earlyMinutes);
  }
  
  // Handle lunch break deductions
  if (batch.lunchTime && batch.lunchTime.enabled) {
    const lunchFrom = parseTime(batch.lunchTime.from);
    const lunchTo = parseTime(batch.lunchTime.to);
    
    // Calculate lunch start and end times for the day
    const lunchStartDate = new Date(checkInTime);
    lunchStartDate.setHours(lunchFrom.hours, lunchFrom.minutes, 0, 0);
    
    const lunchEndDate = new Date(checkInTime);
    lunchEndDate.setHours(lunchTo.hours, lunchTo.minutes, 0, 0);
    
    // Check if punch in is during lunch
    if (checkInTime >= lunchStartDate && checkInTime <= lunchEndDate) {
      // Deduct minutes for punching in during lunch
      const minutesInLunch = Math.ceil((checkInTime - lunchStartDate) / (1000 * 60)) + 1;
      deductionMinutes += Math.max(0, minutesInLunch);
    }
    
    // Check if punch out is during lunch
    if (checkOutTime >= lunchStartDate && checkOutTime <= lunchEndDate) {
      // Deduct minutes for punching out during lunch
      const minutesInLunch = Math.ceil((lunchEndDate - checkOutTime) / (1000 * 60)) + 1;
      deductionMinutes += Math.max(0, minutesInLunch);
    }
  }
  
  const deductionAmount = deductionMinutes * perMinuteSalary;
  
  return { deductionMinutes, deductionAmount };
};

/**
 * Calculate total salary for a month
 * @param {Object} worker - The worker object
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @param {Array} holidays - Array of holiday objects
 * @param {Array} attendanceRecords - Array of attendance records for the month
 * @param {Object} batch - The worker's batch
 * @returns {Object} Object containing salary calculation details
 */
export const calculateMonthlySalary = (worker, year, month, holidays, attendanceRecords, batch) => {
  // Validate inputs
  if (!worker || !worker.salary) {
    return {
      originalMonthlySalary: 0,
      earnedSalary: 0,
      finalSalary: 0,
      totalWorkingDays: 0,
      presentDays: 0,
      absentDays: 0,
      totalDeductionMinutes: 0,
      totalDeductionAmount: 0,
      attendancePercentage: 0,
      perMinuteSalary: 0,
      dailyBreakdown: []
    };
  }
  
  // Calculate working days
  const totalWorkingDays = calculateWorkingDays(year, month, holidays, worker._id);
  
  // Calculate per-day salary
  const perDaySalary = calculatePerDaySalary(worker.salary, totalWorkingDays);
  
  // Calculate working minutes per day
  const dailyWorkingMinutes = calculateWorkingMinutes(batch);
  
  // Calculate per-hour salary
  const perHourSalary = calculatePerHourSalary(perDaySalary, dailyWorkingMinutes);
  
  // Calculate per-minute salary
  const perMinuteSalary = calculatePerMinuteSalary(perHourSalary);
  
  // Filter attendance records for the selected month and year
  const monthAttendanceRecords = Array.isArray(attendanceRecords) 
    ? attendanceRecords.filter(record => {
        if (!record || !record.date) return false;
        const recordDate = new Date(record.date);
        // Ensure we're comparing the correct month and year
        return recordDate.getUTCFullYear() === year && recordDate.getUTCMonth() === month - 1;
      })
    : [];
  
  // Calculate present and absent days
  let presentDays = 0;
  let totalDeductionMinutes = 0;
  let totalDeductionAmount = 0;
  
  // Create daily breakdown
  const dailyBreakdown = [];
  
  // For each day in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    // Create date object for current day (using UTC to avoid timezone issues)
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    
    // Skip Sundays
    if (currentDate.getUTCDay() === 0) {
      dailyBreakdown.push({
        date: currentDate.toISOString().split('T')[0],
        inTime: null,
        outTime: null,
        status: 'Off (Sunday)',
        deductedMinutes: 0,
        salaryEarned: 0
      });
      continue;
    }
    
    // Check if it's a holiday
    let isHoliday = false;
    if (Array.isArray(holidays)) {
      isHoliday = holidays.some(holiday => {
        if (!holiday || !holiday.date) return false;
        const holidayDate = new Date(holiday.date);
        return holidayDate.getUTCDate() === day && 
               holidayDate.getUTCMonth() === month - 1 && 
               holidayDate.getUTCFullYear() === year &&
               (holiday.appliesTo === 'all' || 
                (holiday.appliesTo === 'specific' && 
                 holiday.employees && 
                 Array.isArray(holiday.employees) && 
                 holiday.employees.some(emp => emp._id === worker._id || emp === worker._id)));
      });
    }
    
    if (isHoliday) {
      dailyBreakdown.push({
        date: currentDate.toISOString().split('T')[0],
        inTime: null,
        outTime: null,
        status: 'Off (Holiday)',
        deductedMinutes: 0,
        salaryEarned: 0
      });
      continue;
    }
    
    // Find attendance record for this day
    const dayRecord = monthAttendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      // Compare using UTC to avoid timezone issues
      return recordDate.getUTCDate() === day && 
             recordDate.getUTCMonth() === month - 1 && 
             recordDate.getUTCFullYear() === year;
    });
    
    if (dayRecord && dayRecord.checkIn) {
      // Worker was present
      presentDays++;
      
      // Calculate deductions for this day
      const { deductionMinutes, deductionAmount } = calculateDailyDeduction(dayRecord, batch, perMinuteSalary);
      totalDeductionMinutes += deductionMinutes;
      totalDeductionAmount += deductionAmount;
      
      // Calculate salary earned for this day
      const salaryEarned = Math.max(0, perDaySalary - deductionAmount);
      
      dailyBreakdown.push({
        date: currentDate.toISOString().split('T')[0],
        inTime: dayRecord.checkIn,
        outTime: dayRecord.checkOut,
        status: 'Present',
        deductedMinutes: deductionMinutes,
        salaryEarned: salaryEarned
      });
    } else {
      // Worker was absent
      // Deduct full day salary for absent day
      const absentDeduction = perDaySalary;
      totalDeductionAmount += absentDeduction;
      
      dailyBreakdown.push({
        date: currentDate.toISOString().split('T')[0],
        inTime: null,
        outTime: null,
        status: 'Absent',
        deductedMinutes: dailyWorkingMinutes, // Deduct full working day minutes for absent
        salaryEarned: 0
      });
    }
  }
  
  // Calculate absent days
  const absentDays = totalWorkingDays - presentDays;
  
  // Calculate earned salary (per-day salary * present days minus deductions)
  const earnedSalary = Math.max(0, (perDaySalary * presentDays) - totalDeductionAmount);
  
  // Calculate final salary (original - (absent days * per-day salary) - deductions)
  const finalSalary = Math.max(0, worker.salary - (perDaySalary * absentDays) - totalDeductionAmount);
  
  // Calculate attendance percentage
  const attendancePercentage = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;
  
  return {
    originalMonthlySalary: worker.salary,
    earnedSalary: earnedSalary,
    finalSalary: finalSalary,
    totalWorkingDays,
    presentDays,
    absentDays,
    totalDeductionMinutes,
    totalDeductionAmount,
    attendancePercentage,
    perMinuteSalary,
    dailyBreakdown
  };
};

/**
 * Format time duration as "Xh Ym Zs"
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours}h ${minutes}m ${seconds}s`;
};

/**
 * Check if a date is a working day (not Sunday and not a holiday)
 * @param {Date} date - The date to check
 * @param {Array} holidays - Array of holiday objects
 * @param {string} workerId - The ID of the worker
 * @returns {boolean} True if it's a working day, false otherwise
 */
export const isWorkingDay = (date, holidays, workerId) => {
  // Check if it's Sunday
  if (date.getDay() === 0) {
    return false;
  }
  
  // Check if it's a holiday
  let isHoliday = false;
  if (Array.isArray(holidays)) {
    isHoliday = holidays.some(holiday => {
      if (!holiday || !holiday.date) return false;
      const holidayDate = new Date(holiday.date);
      return holidayDate.getDate() === date.getDate() && 
             holidayDate.getMonth() === date.getMonth() && 
             holidayDate.getFullYear() === date.getFullYear() &&
             (holiday.appliesTo === 'all' || 
              (holiday.appliesTo === 'specific' && 
               holiday.employees && 
               Array.isArray(holiday.employees) && 
               holiday.employees.some(emp => emp._id === workerId || emp === workerId)));
    });
  }
  
  return !isHoliday;
};

/**
 * Calculate lunch break violations
 * @param {Object} attendanceRecord - The attendance record for a day
 * @param {Object} batch - The worker's batch
 * @returns {Object} Object containing lunch violation details
 */
export const calculateLunchViolation = (attendanceRecord, batch) => {
  if (!attendanceRecord || !batch || !batch.lunchTime || !batch.lunchTime.enabled) {
    return { violated: false, violationMinutes: 0 };
  }
  
  const checkInTime = new Date(attendanceRecord.checkIn);
  const checkOutTime = new Date(attendanceRecord.checkOut);
  
  if (!checkInTime || !checkOutTime || isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
    return { violated: false, violationMinutes: 0 };
  }
  
  // Get lunch time
  const lunchFrom = parseTime(batch.lunchTime.from);
  const lunchTo = parseTime(batch.lunchTime.to);
  
  // Calculate lunch start and end times for the day
  const lunchStartDate = new Date(checkInTime);
  lunchStartDate.setHours(lunchFrom.hours, lunchFrom.minutes, 0, 0);
  
  const lunchEndDate = new Date(checkInTime);
  lunchEndDate.setHours(lunchTo.hours, lunchTo.minutes, 0, 0);
  
  // Check if worker took lunch break
  // A violation occurs if:
  // 1. Worker punched in during lunch time
  // 2. Worker punched out during lunch time
  // 3. Worker didn't take the full lunch break
  
  let violationMinutes = 0;
  
  // Check if punch in is during lunch
  if (checkInTime >= lunchStartDate && checkInTime <= lunchEndDate) {
    // Deduct minutes for punching in during lunch
    const minutesInLunch = Math.ceil((checkInTime - lunchStartDate) / (1000 * 60)) + 1;
    violationMinutes += Math.max(0, minutesInLunch);
  }
  
  // Check if punch out is during lunch
  if (checkOutTime >= lunchStartDate && checkOutTime <= lunchEndDate) {
    // Deduct minutes for punching out during lunch
    const minutesInLunch = Math.ceil((lunchEndDate - checkOutTime) / (1000 * 60)) + 1;
    violationMinutes += Math.max(0, minutesInLunch);
  }
  
  return { 
    violated: violationMinutes > 0, 
    violationMinutes 
  };
};