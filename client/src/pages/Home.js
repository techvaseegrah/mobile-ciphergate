import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/20">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Shreeramanamobiles Logo" className="h-24 w-24 object-contain rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Shreeramanamobiles</h1>
          <p className="text-blue-200 text-base mb-6">Mobile Repair Management System</p>
          
          <div className="flex flex-col gap-4 justify-center items-center">
            <div className="group w-full">
              <button
                onClick={handleAdminLogin}
                className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform group-hover:scale-[1.02] group-hover:shadow-xl hover:from-blue-700 hover:to-blue-900"
              >
                <span>Admin Panel</span>
              </button>
            </div>
            
            <div className="relative h-6 flex items-center w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-400"></div>
              </div>
              <div className="relative flex justify-center text-gray-300 font-bold text-sm bg-slate-900 px-3">
                OR
              </div>
            </div>
            
            <div className="group w-full">
              <button
                onClick={handleEmployeeLogin}
                className="w-full flex items-center justify-center bg-gradient-to-r from-emerald-600 to-emerald-800 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform group-hover:scale-[1.02] group-hover:shadow-xl hover:from-emerald-700 hover:to-emerald-900"
              >
                <span>Staff Access</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 px-4 py-3 text-center border-t border-white/10">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Shreeramanamobiles. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;