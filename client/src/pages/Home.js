import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is already logged in
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleAdminLogin = () => {
    navigate('/admin/login');
  };

  const handleEmployeeLogin = () => {
    navigate('/employee/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Repair Shop Management</h1>
          <p className="text-gray-600">Welcome to your repair shop management system</p>
        </div>
        
        <div className="p-8">
          <div className="space-y-6">
            <button
              onClick={handleAdminLogin}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Admin Login
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>
            
            <button
              onClick={handleEmployeeLogin}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Employee Login
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Repair Shop Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;