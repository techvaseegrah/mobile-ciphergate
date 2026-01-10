import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Use authenticated API service instead of raw axios
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is already logged in
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the admin authentication API
      const res = await api.post('/admin/login', {
        username,
        password
      });
      
      if (res.data.admin) {
        // Store admin data in localStorage
        localStorage.setItem('admin', JSON.stringify(res.data.admin));
        // Redirect to admin dashboard
        navigate('/dashboard');
      } else {
        setError('Login failed');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Invalid username or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/20">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Shreeramanamobiles Logo" className="h-24 w-24 object-contain rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Shreeramanamobiles</h1>
          <p className="text-blue-200 text-base mb-6">Admin Portal</p>
          
          <div className="text-left">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-white/60"
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/20 border border-white/30 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-white/60 pr-10"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-200 hover:text-white"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-3 border border-white/30 rounded-xl text-white hover:bg-white/10 transition w-full"
                >
                  Back to Home
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:from-blue-700 hover:to-blue-900 w-full disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
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

export default AdminLogin;