import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ActiveJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    api.get('/jobs/active')
      .then(res => {
        setJobs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch jobs');
        setLoading(false);
      });
  }, []);

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
      <div className="p-8 bg-gray-100 min-h-screen ml-64 flex items-center justify-center">
        <div className="text-xl">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen ml-64">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen ml-64">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Jobs</h1>
        <p className="text-gray-600">Manage ongoing repair jobs</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Job List ({jobs.length})</h2>
        </div>
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No active jobs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map(job => (
                  <tr key={job._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ...{job._id.slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.customer?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.device_model || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.reported_issue?.substring(0, 30) || 'N/A'}{job.reported_issue?.length > 30 ? '...' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/jobs/${job._id}`} className="text-blue-600 hover:text-blue-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveJobs;