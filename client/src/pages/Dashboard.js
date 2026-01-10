import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    total_revenue_today: 0,
    active_jobs_count: 0,
    jobs_ready_for_pickup: 0,
    low_stock_count: 0,
    recent_jobs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const fetchDashboardSummary = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setDashboardData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data');
      setLoading(false);
      
      // If it's a 401 error, redirect to login
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('admin');
        navigate('/admin/login');
      }
    }
  }, []);

  // Fetch dashboard summary from the backend
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      fetchDashboardSummary();
    }
  }, [fetchDashboardSummary]);

  // Format currency
  const formatCurrency = (amount) => {
    // Use Rs instead of $ for Indian Rupees
    return `Rs ${Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Intake': return 'bg-gray-200 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Done': return 'bg-green-100 text-green-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen transition-all duration-300">
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">Welcome to your repair shop management system</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-2 mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Revenue Today</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboardData.total_revenue_today)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-2 mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Active Jobs</p>
              <p className="text-lg font-bold text-gray-900">{dashboardData.active_jobs_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-2 mr-3">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Ready for Pickup</p>
              <p className="text-lg font-bold text-gray-900">{dashboardData.jobs_ready_for_pickup}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-red-100 p-2 mr-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Low Stock</p>
              <p className="text-lg font-bold text-gray-900">{dashboardData.low_stock_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Taken By</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData.recent_jobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-4 text-center text-gray-500 text-sm">
                    No recent jobs found
                  </td>
                </tr>
              ) : (
                dashboardData.recent_jobs.map((job) => (
                  <tr key={job._id}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      ...{job._id.slice(-6)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {job.customer?.name || 'N/A'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 truncate max-w-[80px]">
                      {job.device_model || 'N/A'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-1 inline-flex text-[0.6rem] leading-4 font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell truncate max-w-[80px]">
                      {job.taken_by_worker?.name || 'N/A'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.repair_job_taken_time).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;