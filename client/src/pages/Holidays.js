import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    appliesTo: 'all', // 'all' or 'specific'
  });
  
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch holidays and workers from the backend
  useEffect(() => {
    fetchHolidays();
    fetchWorkers();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch holidays');
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch workers');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle employee selection
  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...holidays];
    
    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end day
      
      filtered = filtered.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= start && holidayDate <= end;
      });
    }
    
    // Upcoming only filter
    if (showUpcomingOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate >= today;
      });
    }
    
    return filtered;
  };

  // Clear filters
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setShowUpcomingOnly(false);
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      date: '',
      description: '',
      appliesTo: 'all'
    });
    setSelectedEmployees([]);
    setIsEditing(false);
    setEditingHolidayId(null);
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (holiday) => {
    setFormData({
      name: holiday.name,
      date: formatDateForInput(holiday.date),
      description: holiday.description,
      appliesTo: holiday.appliesTo
    });
    
    if (holiday.appliesTo === 'specific' && holiday.employees) {
      setSelectedEmployees(holiday.employees.map(emp => emp._id));
    } else {
      setSelectedEmployees([]);
    }
    
    setIsEditing(true);
    setEditingHolidayId(holiday._id);
    setShowModal(true);
  };

  // Format date for input field
  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if holiday is in the past
  const isPastHoliday = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateString);
    holidayDate.setHours(0, 0, 0, 0);
    return holidayDate < today;
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingHolidayId(null);
    setFormData({
      name: '',
      date: '',
      description: '',
      appliesTo: 'all'
    });
    setSelectedEmployees([]);
    setError('');
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation (removed description as required field)
    if (!formData.name || !formData.date) {
      setError('Name and Date are required');
      return;
    }
    
    if (formData.appliesTo === 'specific' && selectedEmployees.length === 0) {
      setError('Please select at least one employee');
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        employees: formData.appliesTo === 'specific' ? selectedEmployees : []
      };
      
      if (isEditing) {
        // Update existing holiday
        await api.put(`/holidays/${editingHolidayId}`, submitData);
        setSuccess('Holiday updated successfully');
      } else {
        // Create new holiday
        await api.post('/holidays', submitData);
        setSuccess('Holiday created successfully');
      }
      
      closeModal();
      fetchHolidays(); // Refresh the list
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} holiday`);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await api.delete(`/holidays/${id}`);
        setSuccess('Holiday deleted successfully');
        fetchHolidays(); // Refresh the list
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to delete holiday');
      }
    }
  };

  // Get status badge
  const getStatusBadge = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateString);
    holidayDate.setHours(0, 0, 0, 0);
    
    if (holidayDate < today) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">Past</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-200 text-green-800">Upcoming</span>;
    }
  };

  // Get applies to text (modified to show only names without emails)
  const getAppliesToText = (holiday) => {
    if (holiday.appliesTo === 'all') {
      return 'All Employees';
    } else {
      if (holiday.employees && holiday.employees.length > 0) {
        return `${holiday.employees.length} Employee${holiday.employees.length > 1 ? 's' : ''}`;
      } else {
        return 'None Selected';
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading holidays...</div>
      </div>
    );
  }

  const filteredHolidays = applyFilters();

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Holiday Management</h2>
          <p className="text-gray-600">Manage company holidays</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Add Holiday
        </button>
      </div>

      {error && !showModal && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && !showModal && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Apply Range
              </button>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => setShowUpcomingOnly(!showUpcomingOnly)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  showUpcomingOnly 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showUpcomingOnly ? 'Showing Upcoming' : 'Show Upcoming'}
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Holidays List */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <h3 className="p-4 text-lg font-semibold">
            Holidays List ({filteredHolidays.length})
          </h3>
        </div>
        {filteredHolidays.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No holidays found. Click "Add Holiday" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHolidays.map((holiday) => (
                  <tr key={holiday._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateForDisplay(holiday.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {holiday.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getAppliesToText(holiday)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(holiday.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(holiday.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openEditModal(holiday)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(holiday._id)}
                        disabled={isPastHoliday(holiday.date)}
                        className={`${
                          isPastHoliday(holiday.date) 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        title={isPastHoliday(holiday.date) ? 'Cannot delete past holidays' : ''}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Holiday' : 'Add New Holiday'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. New Year's Day"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                
                <div className="md:col-span-2 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description / Reason
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Describe the holiday..."
                  ></textarea>
                </div>
                
                <div className="md:col-span-2 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applies To *
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="appliesToAll"
                        name="appliesTo"
                        value="all"
                        checked={formData.appliesTo === 'all'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="appliesToAll" className="ml-2 block text-sm text-gray-700">
                        All Employees
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="appliesToSpecific"
                        name="appliesTo"
                        value="specific"
                        checked={formData.appliesTo === 'specific'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="appliesToSpecific" className="ml-2 block text-sm text-gray-700">
                        Specific Employees
                      </label>
                    </div>
                  </div>
                </div>
                
                {formData.appliesTo === 'specific' && (
                  <div className="md:col-span-2 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Employees
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {workers.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No workers available</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {workers.map((worker) => (
                            <div key={worker._id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`worker-${worker._id}`}
                                checked={selectedEmployees.includes(worker._id)}
                                onChange={() => handleEmployeeToggle(worker._id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`worker-${worker._id}`} className="ml-2 block text-sm text-gray-700">
                                {worker.name} {/* Removed email display */}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}
              
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  {isEditing ? 'Update Holiday' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;