import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import JobIntake from './pages/JobIntake';
import ActiveJobs from './pages/ActiveJobs';
import Departments from './pages/Departments';
import Inventory from './pages/Inventory';
import Workers from './pages/Workers';
import JobDetail from './pages/JobDetail';
import Financials from './pages/Financials';
import Dashboard from './pages/Dashboard';
import EmployeeLogin from './pages/EmployeeLogin';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import Attendance from './pages/Attendance';
import WorkerAttendance from './pages/WorkerAttendance';
import Settings from './pages/Settings';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Holidays from './pages/Holidays';
import Salary from './pages/Salary';
import CancelledJobs from './pages/CancelledJobs';

import EmployeeSidebar from './components/EmployeeSidebar';

// Component to conditionally render Sidebar
const ConditionalSidebar = ({ location, isSidebarOpen, toggleSidebar }) => {
  const hideSidebarRoutes = ['/', '/admin/login', '/employee/login'];
  
  // Check if current route is in the list of routes where sidebar should be hidden
  const shouldHideSidebar = hideSidebarRoutes.includes(location.pathname);
  
  // Also check if we're on an employee dashboard route
  const isEmployeeDashboard = location.pathname.startsWith('/employee/') && location.pathname.endsWith('/dashboard');
  
  // Also check if we're on an employee attendance route
  const isEmployeeAttendance = location.pathname.startsWith('/employee/') && location.pathname.endsWith('/attendance');
  
  // Show sidebar only if not on login/home pages and user is authenticated
  // For employees, show sidebar on attendance page but not on dashboard
  const showSidebar = !shouldHideSidebar && !(isEmployeeDashboard && !isEmployeeAttendance) && (localStorage.getItem('admin') || (localStorage.getItem('employee') && (isEmployeeAttendance || location.pathname.startsWith('/employee/') && location.pathname.endsWith('/dashboard'))));
  
  // Simplified logic: show sidebar for authenticated users except on specific hidden routes
  const isAdmin = localStorage.getItem('admin');
  const isEmployee = localStorage.getItem('employee');
  const showSidebarSimple = !shouldHideSidebar && (isAdmin || (isEmployee && (isEmployeeAttendance || isEmployeeDashboard)));
  
  // Handle employee sidebar
  if (isEmployee && (isEmployeeAttendance || isEmployeeDashboard)) {
    // Parse employee data from localStorage
    try {
      const employee = JSON.parse(localStorage.getItem('employee'));
      return (
        <EmployeeSidebar 
          worker={employee} 
          onLogout={() => {
            localStorage.removeItem('employee');
            window.location.href = '/employee/login';
          }}
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      );
    } catch (e) {
      return null;
    }
  }
  
  return showSidebarSimple ? <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} /> : null;
};

// Component that has access to Router context
function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      <ConditionalSidebar location={location} isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`flex-1 transition-all duration-300 ${location.pathname.startsWith('/employee/') ? '' : 'lg:ml-64'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs/new" element={<JobIntake />} />
          <Route path="/jobs" element={<ActiveJobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/admin/salary" element={<Salary />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/cancelled-jobs" element={<CancelledJobs />} />
          <Route path="/employee/login" element={<EmployeeLogin />} />
          <Route path="/employee/:id/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/:id/attendance" element={<WorkerAttendance />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;