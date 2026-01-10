import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'New Intake', path: '/jobs/new', icon: '➕' },
    { name: 'Active Jobs', path: '/jobs', icon: '🛠️' },
    { name: 'Cancelled Jobs', path: '/cancelled-jobs', icon: '❌' },
    { name: 'Departments', path: '/departments', icon: '🏢' },
    { name: 'Inventory', path: '/inventory', icon: '📦' },
    { name: 'Suppliers', path: '/suppliers', icon: '🚚' },
    { name: 'Purchases', path: '/purchases', icon: '🛒' },
    { name: 'Workers', path: '/workers', icon: '👤' },
    { name: 'Attendance', path: '/attendance', icon: '📋' },
    { name: 'Holidays', path: '/holidays', icon: '🎉' },
    { name: 'Salary', path: '/admin/salary', icon: '₹' },
    { name: 'Financials', path: '/financials', icon: '💰' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    // Close sidebar on mobile when logout is clicked
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleClickOutside = (e) => {
    // Close sidebar if clicking outside on mobile
    if (window.innerWidth < 768 && e.target.closest('.sidebar') === null && e.target.closest('.sidebar-toggle') === null) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile menu button - only visible on mobile */}
      <button
        className="sidebar-toggle fixed top-4 left-4 z-30 md:hidden bg-slate-800 text-white p-2 rounded-lg shadow-lg"
        onClick={toggleSidebar}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
      
      {/* Sidebar - hidden by default on mobile */}
      <div 
        className={`bg-gradient-to-b from-slate-900 to-indigo-900 text-white w-64 h-screen fixed flex flex-col transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:fixed lg:z-auto lg:w-64 lg:inset-y-0`}>
      
        <div className="p-5 text-xl font-bold border-b border-gray-700 flex flex-col items-center">
          <div className="flex justify-center mb-2">
            <img src={logo} alt="Shreeramanamobiles Logo" className="h-16 w-16 object-contain rounded" />
          </div>
          <div className="text-center text-white">Shreerama<br /><span className="text-blue-400">mobiles</span></div>
          <button 
            className="lg:hidden text-white p-1 rounded-md hover:bg-slate-700 mt-2"
            onClick={toggleSidebar}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  className="flex items-center p-3 rounded-lg transition-colors duration-200 hover:bg-slate-800 hover:text-blue-300"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      toggleSidebar();
                    }
                  }}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center p-3 text-left rounded-lg transition-colors duration-200 hover:bg-slate-800 text-red-400 hover:text-red-300"
          >
            <span className="mr-3">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile - only appears when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden lg:hidden"
          onClick={handleClickOutside}
        ></div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 text-white rounded-lg shadow-xl w-full max-w-md mx-4 border border-slate-700">
            <div className="border-b border-slate-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">
                Confirm Logout
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="mb-6">
                <p className="text-slate-300">
                  Are you sure you want to logout?
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelLogout}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-white hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;