import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Use authenticated API service instead of raw axios
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const EmployeeLogin = () => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch all workers
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await api.get('/workers');
        setWorkers(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch workers');
      }
    };

    fetchWorkers();
  }, []);

  const handleWorkerSelect = (worker) => {
    setSelectedWorker(worker);
    setShowPasswordForm(true);
    setPassword('');
    setShowPassword(false);
    setError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the authentication API
      const res = await api.post('/workers/login', {
        workerId: selectedWorker._id,
        password
      });
      
      if (res.data.worker) {
        // Store worker data in localStorage or context for use in the dashboard
        localStorage.setItem('employee', JSON.stringify(res.data.worker));
        // Redirect to employee dashboard
        navigate(`/employee/${selectedWorker._id}/dashboard`);
      } else {
        setError('Login failed');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Invalid password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setShowPasswordForm(false);
    setSelectedWorker(null);
    setPassword('');
    setShowPassword(false);
    setError('');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-white/20">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Shreeramanamobiles Logo" className="h-24 w-24 object-contain rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Shreeramanamobiles</h1>
          <p className="text-blue-200 text-base mb-6">Employee Portal</p>
          
          <div className="text-left">
            {error && !showPasswordForm && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <p className="text-blue-200 mb-4">Select an employee to login:</p>
            {workers.length === 0 ? (
              <div className="text-center py-8 text-blue-200">
                No employees found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map((worker) => (
                  <div 
                    key={worker._id}
                    className="bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/20 cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
                    onClick={() => handleWorkerSelect(worker)}
                  >
                    <div className="flex items-center">
                      <div className="bg-slate-200 border-2 border-dashed rounded-xl w-16 h-16" />
                      <div className="ml-4">
                        <h3 className="font-semibold text-white">{worker.name}</h3>
                        <p className="text-sm text-blue-200">{worker.email}</p>
                        <p className="text-sm text-blue-200">
                          {worker.department ? worker.department.name : 'No Department'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              <button
                onClick={handleBackToHome}
                className="px-4 py-3 border border-white/30 rounded-xl text-white hover:bg-white/10 transition w-full"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-white mb-4">Login as {selectedWorker?.name}</h2>
              
              <div className="text-left">
                {error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-4">
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
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-200 hover:text-white"
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
                      onClick={handleBackToList}
                      className="px-4 py-3 border border-white/30 rounded-xl text-white hover:bg-white/10 transition w-full"
                    >
                      Back to List
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:from-blue-700 hover:to-blue-900 w-full disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Login'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Shreeramanamobiles. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default EmployeeLogin;