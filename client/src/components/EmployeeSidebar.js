import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const EmployeeSidebar = ({ worker, onLogout, isOpen, toggleSidebar }) => {
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    // Close sidebar on mobile when logout is clicked
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  const confirmLogout = () => {
    onLogout();
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
        className="sidebar-toggle fixed top-4 left-4 z-30 md:hidden bg-gray-800 text-white p-2 rounded-lg shadow-lg"
        onClick={toggleSidebar}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
      
      {/* Sidebar - hidden by default on mobile */}
      <div 
        className={`bg-gray-800 text-white w-64 min-h-screen fixed left-0 top-0 bottom-0 overflow-y-auto transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto lg:w-64`}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Repair Shop</h1>
            <p className="text-sm text-gray-400">Employee Portal</p>
          </div>
          <button 
            className="lg:hidden text-white p-1 rounded-md hover:bg-gray-700"
            onClick={toggleSidebar}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
            <div className="ml-3">
              <p className="font-medium">{worker?.name}</p>
              <p className="text-sm text-gray-400">{worker?.role}</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-4">
          <Link
            to={`/employee/${worker?._id}/dashboard`}
            className={`flex items-center px-4 py-3 text-sm font-medium transition ${
              isActive(`/employee/${worker?._id}/dashboard`)
                ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => {
              if (window.innerWidth < 768) {
                toggleSidebar();
              }
            }}
          >
            <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          
          {/* Attendance Button */}
          <Link
            to={`/employee/${worker?._id}/attendance`}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
            onClick={() => {
              if (window.innerWidth < 768) {
                toggleSidebar();
              }
            }}
          >
            <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Attendance
          </Link>
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center p-3 text-left hover:bg-gray-800 rounded transition text-red-400 hover:text-red-300"
          >
            <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
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

export default EmployeeSidebar;