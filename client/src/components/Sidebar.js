import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'New Intake', path: '/jobs/new', icon: '➕' },
    { name: 'Active Jobs', path: '/jobs', icon: '🛠️' },
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
  };

  const confirmLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div className="w-64 bg-gray-900 text-white h-screen fixed flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-gray-700">
          Repair<span className="text-blue-500">Pro</span>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link 
                  to={item.path} 
                  className="flex items-center p-3 hover:bg-gray-800 rounded transition"
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center p-3 text-left hover:bg-gray-800 rounded transition text-red-400 hover:text-red-300"
          >
            <span className="mr-3">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Logout
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to logout?
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelLogout}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
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