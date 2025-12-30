import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const EmployeeSidebar = ({ worker, onLogout }) => {
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div className="bg-gray-800 text-white w-64 min-h-screen fixed left-0 top-0 bottom-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Repair Shop</h1>
          <p className="text-sm text-gray-400">Employee Portal</p>
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