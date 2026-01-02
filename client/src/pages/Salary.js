import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { calculateMonthlySalary } from '../utils/salaryUtils';

const Salary = () => {
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Default to current month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Default to current year
  
  // Report data
  const [reportData, setReportData] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Generate realistic mock attendance data for worker "6926f6cc5ea6ccfe339a7210"
  const generateMockAttendanceData = () => {
    const mockAttendance = [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // Current month (0-indexed)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Generate attendance records for each working day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      
      // Skip Sundays (day 0 is Sunday)
      if (date.getDay() === 0) {
        continue;
      }
      
      // Simulate realistic attendance patterns
      // Most days the worker is present (90% attendance)
      const isPresent = Math.random() > 0.1;
      
      if (isPresent) {
        // Normal working hours: 9 AM to 6 PM with 1-hour lunch break (12 PM to 1 PM)
        // But add variations for realism
        
        // Regular check-in time (9:00 AM ± 30 minutes)
        const checkInMinutes = 540 + Math.floor(Math.random() * 31) - 15; // 540 = 9 AM in minutes
        const checkInHour = Math.floor(checkInMinutes / 60);
        const checkInMinute = checkInMinutes % 60;
        
        // Regular check-out time (6:00 PM ± 30 minutes)
        const checkOutMinutes = 1080 + Math.floor(Math.random() * 31) - 15; // 1080 = 6 PM in minutes
        const checkOutHour = Math.floor(checkOutMinutes / 60);
        const checkOutMinute = checkOutMinutes % 60;
        
        // Occasionally simulate late arrivals (10% chance)
        const isLate = Math.random() > 0.9;
        let finalCheckInHour = checkInHour;
        let finalCheckInMinute = checkInMinute;
        
        if (isLate) {
          // Late by 30-90 minutes
          const lateMinutes = 30 + Math.floor(Math.random() * 61);
          const totalMinutes = checkInMinutes + lateMinutes;
          finalCheckInHour = Math.floor(totalMinutes / 60);
          finalCheckInMinute = totalMinutes % 60;
        }
        
        // Occasionally simulate early departures (10% chance)
        const isEarly = Math.random() > 0.9;
        let finalCheckOutHour = checkOutHour;
        let finalCheckOutMinute = checkOutMinute;
        
        if (isEarly) {
          // Early by 30-90 minutes
          const earlyMinutes = 30 + Math.floor(Math.random() * 61);
          const totalMinutes = checkOutMinutes - earlyMinutes;
          finalCheckOutHour = Math.floor(totalMinutes / 60);
          finalCheckOutMinute = totalMinutes % 60;
        }
        
        mockAttendance.push({
          date: date.toISOString(),
          checkIn: new Date(year, month, day, finalCheckInHour, finalCheckInMinute).toISOString(),
          checkOut: new Date(year, month, day, finalCheckOutHour, finalCheckOutMinute).toISOString(),
          method: 'face'
        });
      }
      // For absent days, we simply don't add an attendance record
    }
    
    return mockAttendance;
  };

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch workers
        const workersRes = await api.get('/workers');
        let workersData = workersRes.data;
        
        // Add mock attendance data specifically for worker "6926f6cc5ea6ccfe339a7210"
        workersData = workersData.map(worker => {
          if (worker._id === '6926f6cc5ea6ccfe339a7210') {
            return {
              ...worker,
              attendanceRecords: generateMockAttendanceData()
            };
          }
          return worker;
        });
        
        setWorkers(workersData);
        setFilteredWorkers(workersData);
        
        // Fetch holidays
        const holidaysRes = await api.get('/holidays');
        setHolidays(holidaysRes.data);
        
        // Fetch batches
        const batchesRes = await api.get('/batches');
        setBatches(batchesRes.data);
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter workers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredWorkers(workers);
    } else {
      const filtered = workers.filter(worker => 
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (worker.department && worker.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredWorkers(filtered);
    }
  }, [searchTerm, workers]);

  const handleViewReport = (worker) => {
    setSelectedWorker(worker);
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedWorker(null);
    setReportData(null);
  };

  const generateReport = async () => {
    if (!selectedWorker) return;
    
    try {
      // Get worker's batch (might be populated or just an ID)
      const workerBatch = batches.find(batch => batch._id === selectedWorker.batch?._id) || 
                         batches.find(batch => batch._id === selectedWorker.batch) ||
                         selectedWorker.batch;
      
      // Calculate salary data
      const salaryData = calculateMonthlySalary(
        selectedWorker,
        selectedYear,
        selectedMonth,
        holidays,
        selectedWorker.attendanceRecords || [],
        workerBatch
      );
      
      setReportData(salaryData);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate salary report');
    }
  };

  // Generate year options for the dropdown
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return amount ? `₹${amount.toFixed(2)}` : '₹0.00';
  };

  // Format percentage
  const formatPercentage = (percentage) => {
    return percentage ? `${percentage.toFixed(2)}%` : '0.00%';
  };

  // Format time in 12-hour format
  const formatTime12Hour = (timeString) => {
    if (!timeString) return '--:--:--';
    
    const date = new Date(timeString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
    
    return `${hours}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
  };

  // Calculate total working hours
  const calculateTotalWorkingHours = (dailyBreakdown, batch) => {
    if (!dailyBreakdown || !batch) return 0;
    
    // Calculate working minutes per day from batch
    let dailyWorkingMinutes = 0;
    if (batch.workingTime) {
      const workingFrom = batch.workingTime.from.split(':').map(Number);
      const workingTo = batch.workingTime.to.split(':').map(Number);
      dailyWorkingMinutes = (workingTo[0] * 60 + workingTo[1]) - (workingFrom[0] * 60 + workingFrom[1]);
      
      // Subtract lunch time if enabled
      if (batch.lunchTime && batch.lunchTime.enabled) {
        const lunchFrom = batch.lunchTime.from.split(':').map(Number);
        const lunchTo = batch.lunchTime.to.split(':').map(Number);
        const lunchMinutes = (lunchTo[0] * 60 + lunchTo[1]) - (lunchFrom[0] * 60 + lunchFrom[1]);
        dailyWorkingMinutes -= lunchMinutes;
      }
      
      // Subtract break time if enabled
      if (batch.breakTime && batch.breakTime.enabled) {
        const breakFrom = batch.breakTime.from.split(':').map(Number);
        const breakTo = batch.breakTime.to.split(':').map(Number);
        const breakMinutes = (breakTo[0] * 60 + breakTo[1]) - (breakFrom[0] * 60 + breakFrom[1]);
        dailyWorkingMinutes -= breakMinutes;
      }
    }
    
    // Count present days
    const presentDays = dailyBreakdown.filter(day => day.status === 'Present').length;
    
    // Total working hours = present days * daily working minutes / 60
    return (presentDays * dailyWorkingMinutes) / 60;
  };

  // Calculate per-hour salary
  const calculatePerHourSalary = (perDaySalary, batch) => {
    if (!perDaySalary || !batch || !batch.workingTime) return 0;
    
    // Calculate working minutes per day from batch
    let dailyWorkingMinutes = 0;
    const workingFrom = batch.workingTime.from.split(':').map(Number);
    const workingTo = batch.workingTime.to.split(':').map(Number);
    dailyWorkingMinutes = (workingTo[0] * 60 + workingTo[1]) - (workingFrom[0] * 60 + workingFrom[1]);
    
    // Subtract lunch time if enabled
    if (batch.lunchTime && batch.lunchTime.enabled) {
      const lunchFrom = batch.lunchTime.from.split(':').map(Number);
      const lunchTo = batch.lunchTime.to.split(':').map(Number);
      const lunchMinutes = (lunchTo[0] * 60 + lunchTo[1]) - (lunchFrom[0] * 60 + lunchFrom[1]);
      dailyWorkingMinutes -= lunchMinutes;
    }
    
    // Subtract break time if enabled
    if (batch.breakTime && batch.breakTime.enabled) {
      const breakFrom = batch.breakTime.from.split(':').map(Number);
      const breakTo = batch.breakTime.to.split(':').map(Number);
      const breakMinutes = (breakTo[0] * 60 + breakTo[1]) - (breakFrom[0] * 60 + breakFrom[1]);
      dailyWorkingMinutes -= breakMinutes;
    }
    
    // Calculate per-hour salary
    const dailyWorkingHours = dailyWorkingMinutes / 60;
    return perDaySalary / dailyWorkingHours;
  };

  // Generate PDF report
  const generatePDFReport = () => {
    if (!reportData || !selectedWorker) return;
    
    // Get worker's batch
    const workerBatch = batches.find(batch => batch._id === selectedWorker.batch?._id) || 
                       batches.find(batch => batch._id === selectedWorker.batch) ||
                       selectedWorker.batch;
    
    // Calculate per-hour salary
    const perHourSalary = calculatePerHourSalary(
      reportData.originalMonthlySalary / reportData.totalWorkingDays,
      workerBatch
    );
    
    // Create a simple HTML structure for the PDF
    const workerName = selectedWorker.name;
    const workerId = selectedWorker._id;
    const department = selectedWorker.department ? selectedWorker.department.name : 'N/A';
    
    // Create HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Report - ${workerName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary-section { margin-bottom: 30px; }
          .summary-label { font-weight: bold; display: inline-block; width: 200px; }
          .summary-value { display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .status-present { background-color: #d4edda; color: #155724; padding: 3px 8px; border-radius: 10px; }
          .status-absent { background-color: #f8d7da; color: #721c24; padding: 3px 8px; border-radius: 10px; }
          .status-off { background-color: #e2e3e5; color: #383d41; padding: 3px 8px; border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Salary Report</h1>
          <h2>${workerName}</h2>
          <p>Employee ID: ${workerId} | Department: ${department}</p>
          <p>Period: ${selectedMonth}/${selectedYear}</p>
        </div>
        
        <div class="summary-section">
          <h3>Summary</h3>
          <div>
            <span class="summary-label">Employee Name:</span>
            <span class="summary-value">${workerName}</span>
          </div>
          <div>
            <span class="summary-label">Employee ID:</span>
            <span class="summary-value">${workerId}</span>
          </div>
          <div>
            <span class="summary-label">Original Salary:</span>
            <span class="summary-value">${formatCurrency(reportData.originalMonthlySalary)}</span>
          </div>
          <div>
            <span class="summary-label">Actual Earned Salary:</span>
            <span class="summary-value">${formatCurrency(reportData.earnedSalary)}</span>
          </div>
          <div>
            <span class="summary-label">Total Final Salary:</span>
            <span class="summary-value">${formatCurrency(reportData.finalSalary)}</span>
          </div>
          <div>
            <span class="summary-label">Total Days in Period:</span>
            <span class="summary-value">${new Date(selectedYear, selectedMonth, 0).getDate()}</span>
          </div>
          <div>
            <span class="summary-label">Total Working Days:</span>
            <span class="summary-value">${reportData.totalWorkingDays}</span>
          </div>
          <div>
            <span class="summary-label">Total Absent Days:</span>
            <span class="summary-value">${reportData.absentDays}</span>
          </div>
          <div>
            <span class="summary-label">Total Holidays:</span>
            <span class="summary-value">0</span>
          </div>
          <div>
            <span class="summary-label">Total Sundays:</span>
            <span class="summary-value">${Math.floor(new Date(selectedYear, selectedMonth, 0).getDate() / 7)}</span>
          </div>
          <div>
            <span class="summary-label">Actual Working Days:</span>
            <span class="summary-value">${reportData.presentDays}</span>
          </div>
          <div>
            <span class="summary-label">Total Working Hours:</span>
            <span class="summary-value">${calculateTotalWorkingHours(reportData.dailyBreakdown, workerBatch).toFixed(2)} hrs</span>
          </div>
          <div>
            <span class="summary-label">Total Permission Time:</span>
            <span class="summary-value">${reportData.totalDeductionMinutes.toFixed(2)} mins</span>
          </div>
          <div>
            <span class="summary-label">Absent Deduction:</span>
            <span class="summary-value">${formatCurrency((reportData.absentDays * (reportData.originalMonthlySalary / reportData.totalWorkingDays)) || 0)}</span>
          </div>
          <div>
            <span class="summary-label">Permission Deduction:</span>
            <span class="summary-value">${formatCurrency(reportData.totalDeductionAmount - ((reportData.absentDays * (reportData.originalMonthlySalary / reportData.totalWorkingDays)) || 0))}</span>
          </div>
          <div>
            <span class="summary-label">Total Deductions:</span>
            <span class="summary-value">${formatCurrency(reportData.totalDeductionAmount)}</span>
          </div>
          <div>
            <span class="summary-label">Attendance Rate:</span>
            <span class="summary-value">${formatPercentage(reportData.attendancePercentage)}</span>
          </div>
          <div>
            <span class="summary-label">Per Hour Salary:</span>
            <span class="summary-value">${formatCurrency(perHourSalary)}</span>
          </div>
          <div>
            <span class="summary-label">Per Minute Salary:</span>
            <span class="summary-value">${formatCurrency(reportData.perMinuteSalary)}</span>
          </div>
        </div>
        
        <h3>Daily Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>IN Time</th>
              <th>OUT Time</th>
              <th>Status</th>
              <th>Deducted Minutes</th>
              <th>Salary Earned</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add daily breakdown rows
    reportData.dailyBreakdown.forEach(day => {
      const statusClass = day.status === 'Present' ? 'status-present' : 
                         day.status === 'Absent' ? 'status-absent' : 'status-off';
                         
      htmlContent += `
        <tr>
          <td>${day.date}</td>
          <td>${formatTime12Hour(day.inTime)}</td>
          <td>${formatTime12Hour(day.outTime)}</td>
          <td><span class="${statusClass}">${day.status}</span></td>
          <td class="text-right">${day.deductedMinutes}</td>
          <td class="text-right">${formatCurrency(day.salaryEarned)}</td>
        </tr>
      `;
    });
    
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_report_${workerName}_${selectedMonth}_${selectedYear}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading salary data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Salary Management</h2>
          <p className="text-gray-600">Manage employee salaries and view reports</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Employees
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee name or department..."
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Salary Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-lg font-semibold">Employee Salaries</h3>
          <p className="text-gray-600 mt-1">List of all employees with their salary information</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Monthly Salary</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (This Month)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fine / Deduction (This Month)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map(worker => (
                  <tr key={worker._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.department ? worker.department.name : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.salary ? formatCurrency(worker.salary) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.salary ? formatCurrency(worker.salary) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹0
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewReport(worker)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Report Modal */}
      {showReportModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Salary Report – {selectedWorker.name}
              </h3>
              <button
                onClick={closeReportModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {generateYearOptions().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={generateReport}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Generate Report
                  </button>
                </div>
              </div>

              {/* Report Content */}
              {reportData ? (
                <div className="space-y-6">
                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={generatePDFReport}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                      </svg>
                      Download PDF
                    </button>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Employee Name:</span> {selectedWorker.name}
                      </div>
                      <div>
                        <span className="font-medium">Employee ID:</span> {selectedWorker._id}
                      </div>
                      <div>
                        <span className="font-medium">Original Salary:</span> {formatCurrency(reportData.originalMonthlySalary)}
                      </div>
                      <div>
                        <span className="font-medium">Actual Earned Salary:</span> {formatCurrency(reportData.earnedSalary)}
                      </div>
                      <div>
                        <span className="font-medium">Total Final Salary:</span> {formatCurrency(reportData.finalSalary)}
                      </div>
                      <div>
                        <span className="font-medium">Total Days in Period:</span> {new Date(selectedYear, selectedMonth, 0).getDate()}
                      </div>
                      <div>
                        <span className="font-medium">Total Working Days:</span> {reportData.totalWorkingDays}
                      </div>
                      <div>
                        <span className="font-medium">Total Absent Days:</span> {reportData.absentDays}
                      </div>
                      <div>
                        <span className="font-medium">Total Holidays:</span> 0
                      </div>
                      <div>
                        <span className="font-medium">Total Sundays:</span> {Math.floor(new Date(selectedYear, selectedMonth, 0).getDate() / 7)}
                      </div>
                      <div>
                        <span className="font-medium">Actual Working Days:</span> {reportData.presentDays}
                      </div>
                      <div>
                        <span className="font-medium">Total Working Hours:</span> {calculateTotalWorkingHours(reportData.dailyBreakdown, selectedWorker.batch).toFixed(2)} hrs
                      </div>
                      <div>
                        <span className="font-medium">Total Permission Time:</span> {reportData.totalDeductionMinutes.toFixed(2)} mins
                      </div>
                      <div>
                        <span className="font-medium">Absent Deduction:</span> {formatCurrency((reportData.absentDays * (reportData.originalMonthlySalary / reportData.totalWorkingDays)) || 0)}
                      </div>
                      <div>
                        <span className="font-medium">Permission Deduction:</span> {formatCurrency(reportData.totalDeductionAmount - ((reportData.absentDays * (reportData.originalMonthlySalary / reportData.totalWorkingDays)) || 0))}
                      </div>
                      <div>
                        <span className="font-medium">Total Deductions:</span> {formatCurrency(reportData.totalDeductionAmount)}
                      </div>
                      <div>
                        <span className="font-medium">Attendance Rate:</span> {formatPercentage(reportData.attendancePercentage)}
                      </div>
                      <div>
                        <span className="font-medium">Per Hour Salary:</span> {formatCurrency(calculatePerHourSalary(
                          reportData.originalMonthlySalary / reportData.totalWorkingDays,
                          selectedWorker.batch
                        ))}
                      </div>
                      <div>
                        <span className="font-medium">Per Minute Salary:</span> {formatCurrency(reportData.perMinuteSalary)}
                      </div>
                    </div>
                  </div>

                  {/* Daily Breakdown Table */}
                  <div className="bg-white rounded shadow overflow-hidden">
                    <div className="border-b border-gray-200 p-4">
                      <h4 className="text-lg font-semibold">Daily Breakdown</h4>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IN Time</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OUT Time</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deducted Minutes</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Earned</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.dailyBreakdown.map((day, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {day.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTime12Hour(day.inTime)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTime12Hour(day.outTime)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  day.status === 'Present' ? 'bg-green-200 text-green-800' :
                                  day.status === 'Absent' ? 'bg-red-200 text-red-800' :
                                  'bg-gray-200 text-gray-800'
                                }`}>
                                  {day.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {day.deductedMinutes}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(day.salaryEarned)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-600">
                    Click "Generate Report" to view the salary report.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;