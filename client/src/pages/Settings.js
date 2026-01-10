import React, { useState, useEffect } from 'react';
import { getBatches, createBatch, updateBatch, deleteBatch } from '../utils/batchUtils';
import api from '../services/api';

const Settings = () => {
  const [batches, setBatches] = useState([]);
  const [locationSettings, setLocationSettings] = useState({
    enabled: false,
    latitude: 0,
    longitude: 0,
    radius: 100
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [currentBatch, setCurrentBatch] = useState({
    id: null,
    name: '',
    workingTime: { from: '', to: '' },
    lunchTime: { from: '', to: '', enabled: true },
    breakTime: { from: '', to: '', enabled: true }
  });

  // Load batches and location settings on component mount
  useEffect(() => {
    const loadBatches = async () => {
      const loadedBatches = await getBatches();
      setBatches(loadedBatches);
    };
    
    const loadLocationSettings = async () => {
      try {
        const response = await api.get('/admin/location-settings');
        setLocationSettings(response.data);
      } catch (error) {
        console.error('Error loading location settings:', error);
      }
    };
    
    loadBatches();
    loadLocationSettings();
  }, []);

  const handleAddNewBatch = () => {
    setCurrentBatch({
      id: null,
      name: '',
      workingTime: { from: '', to: '' },
      lunchTime: { from: '', to: '', enabled: true },
      breakTime: { from: '', to: '', enabled: true }
    });
    setShowModal(true);
  };

  const handleEditBatch = (batch) => {
    setCurrentBatch(batch);
    setShowModal(true);
  };

  const confirmDeleteBatch = (batch) => {
    setBatchToDelete(batch);
    setShowDeleteConfirm(true);
  };

  const handleDeleteBatch = async () => {
    if (batchToDelete) {
      try {
        await deleteBatch(batchToDelete._id);
        const updatedBatches = batches.filter(batch => batch._id !== batchToDelete._id);
        setBatches(updatedBatches);
      } catch (error) {
        console.error('Error deleting batch:', error);
        // You might want to show an error message to the user
      }
      setShowDeleteConfirm(false);
      setBatchToDelete(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setCurrentBatch(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setCurrentBatch(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLocationChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setLocationSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleToggle = (section) => {
    setCurrentBatch(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        enabled: !prev[section].enabled
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (currentBatch._id) {
        // Edit existing batch
        const updatedBatch = await updateBatch(currentBatch._id, {
          name: currentBatch.name,
          workingTime: currentBatch.workingTime,
          lunchTime: currentBatch.lunchTime,
          breakTime: currentBatch.breakTime
        });
        
        // Update the batches state with the updated batch
        const updatedBatches = batches.map(batch => 
          batch._id === currentBatch._id ? { ...updatedBatch, _id: currentBatch._id } : batch
        );
        setBatches(updatedBatches);
      } else {
        // Add new batch
        const newBatchData = {
          name: currentBatch.name,
          workingTime: currentBatch.workingTime,
          lunchTime: currentBatch.lunchTime,
          breakTime: currentBatch.breakTime
        };
        
        const newBatch = await createBatch(newBatchData);
        setBatches([...batches, newBatch]);
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      // You might want to show an error message to the user
    }
    
    setShowModal(false);
  };

  const handleSaveLocationSettings = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put('/admin/location-settings', locationSettings);
      
      if (response.status === 200) {
        alert('Location settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving location settings:', error);
      alert('Error saving location settings');
    }
  };

  const getCurrentLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please use a modern browser with location services enabled.');
      return;
    }
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      alert('Location services require a secure connection (HTTPS). Please access this application over HTTPS or localhost.');
      return;
    }
    
    console.log('Attempting to get current location in Settings...');
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location retrieved successfully in Settings:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        
        setLocationSettings(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setIsGettingLocation(false);
        alert('Location captured successfully!');
      },
      (error) => {
        console.error('Geolocation error in Settings:', error);
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please ensure location services are enabled on your device and try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or check your network connection.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location. Please try again.';
            break;
        }
        console.error('Location error details in Settings:', errorMessage);
        alert(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: false, // Try with lower accuracy first
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 60000 // Accept positions up to 1 minute old
      }
    );
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setBatchToDelete(null);
  };

  return (
    <div className="p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Settings</h1>
        
        {/* Location Settings Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Location Settings</h2>
          
          <form onSubmit={handleSaveLocationSettings}>
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={locationSettings.enabled}
                  onChange={handleLocationChange}
                  className="rounded text-blue-600"
                />
                <span className="ml-2 text-gray-700 text-sm sm:text-base">Enable Location Restriction</span>
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                When enabled, workers can only mark attendance when within the specified location
              </p>
            </div>
            
            {locationSettings.enabled && (
              <>
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="latitude">
                      Latitude
                    </label>
                    <input
                      type="number"
                      id="latitude"
                      name="latitude"
                      value={locationSettings.latitude}
                      onChange={handleLocationChange}
                      step="any"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="longitude">
                      Longitude
                    </label>
                    <input
                      type="number"
                      id="longitude"
                      name="longitude"
                      value={locationSettings.longitude}
                      onChange={handleLocationChange}
                      step="any"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="radius">
                    Radius (meters)
                  </label>
                  <input
                    type="number"
                    id="radius"
                    name="radius"
                    value={locationSettings.radius}
                    onChange={handleLocationChange}
                    min="10"
                    max="1000"
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Recommended range: 50-1000 meters. Workers must be within this radius to mark attendance.
                  </p>
                </div>
                
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className={`bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded focus:outline-none focus:shadow-outline transition text-xs sm:text-sm ${
                      isGettingLocation ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isGettingLocation ? 'Getting Location...' : 'Capture Current Location'}
                  </button>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Click to automatically fill in your current location coordinates
                  </p>
                </div>
              </>
            )}
            
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 sm:py-2 sm:px-6 rounded focus:outline-none focus:shadow-outline transition text-sm"
              >
                Save Location Settings
              </button>
            </div>
          </form>
        </div>
        
        {/* Batch Management Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Batch Management</h2>
            <button
              onClick={handleAddNewBatch}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded focus:outline-none focus:shadow-outline transition text-sm"
            >
              Add New Batch
            </button>
          </div>
          
          {/* Batches List */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs sm:text-sm leading-normal">
                  <th className="py-2 px-3 sm:py-3 sm:px-6 text-left">Batch Name</th>
                  <th className="py-2 px-3 sm:py-3 sm:px-6 text-left">Working Hours</th>
                  <th className="py-2 px-3 sm:py-3 sm:px-6 text-left hidden md:table-cell">Lunch Time</th>
                  <th className="py-2 px-3 sm:py-3 sm:px-6 text-left hidden md:table-cell">Break Time</th>
                  <th className="py-2 px-3 sm:py-3 sm:px-6 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-xs sm:text-sm">
                {batches.map(batch => (
                  <tr key={batch.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-3 sm:py-3 sm:px-6">{batch.name}</td>
                    <td className="py-2 px-3 sm:py-3 sm:px-6">{batch.workingTime.from} - {batch.workingTime.to}</td>
                    <td className="py-2 px-3 sm:py-3 sm:px-6 hidden md:table-cell">
                      {batch.lunchTime.enabled 
                        ? `${batch.lunchTime.from} - ${batch.lunchTime.to}` 
                        : 'Disabled'}
                    </td>
                    <td className="py-2 px-3 sm:py-3 sm:px-6 hidden md:table-cell">
                      {batch.breakTime.enabled 
                        ? `${batch.breakTime.from} - ${batch.breakTime.to}` 
                        : 'Disabled'}
                    </td>
                    <td className="py-2 px-3 sm:py-3 sm:px-6">
                      <div className="flex item-center gap-2">
                        <button
                          onClick={() => handleEditBatch(batch)}
                          className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => confirmDeleteBatch(batch)}
                          className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Adding/Editing Batch */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg">
            <div className="border-b px-4 py-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                {currentBatch.id ? 'Edit Batch' : 'Add New Batch'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
                <div className="mb-3">
                  <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="name">
                    Batch Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={currentBatch.name}
                    onChange={handleChange}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                
                {/* Working Time */}
                <div className="mb-4">
                  <h4 className="text-base sm:text-lg font-medium text-gray-700 mb-2">Working Time</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="workingTime.from">
                        From
                      </label>
                      <input
                        type="time"
                        id="workingTime.from"
                        name="workingTime.from"
                        value={currentBatch.workingTime.from}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="workingTime.to">
                        To
                      </label>
                      <input
                        type="time"
                        id="workingTime.to"
                        name="workingTime.to"
                        value={currentBatch.workingTime.to}
                        onChange={handleChange}
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Lunch Time */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base sm:text-lg font-medium text-gray-700">Lunch Time</h4>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={currentBatch.lunchTime.enabled}
                        onChange={() => handleToggle('lunchTime')}
                        className="rounded text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 text-sm">Enable</span>
                    </label>
                  </div>
                  
                  {currentBatch.lunchTime.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="lunchTime.from">
                          From
                        </label>
                        <input
                          type="time"
                          id="lunchTime.from"
                          name="lunchTime.from"
                          value={currentBatch.lunchTime.from}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="lunchTime.to">
                          To
                        </label>
                        <input
                          type="time"
                          id="lunchTime.to"
                          name="lunchTime.to"
                          value={currentBatch.lunchTime.to}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Break Time */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base sm:text-lg font-medium text-gray-700">Break Time</h4>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={currentBatch.breakTime.enabled}
                        onChange={() => handleToggle('breakTime')}
                        className="rounded text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 text-sm">Enable</span>
                    </label>
                  </div>
                  
                  {currentBatch.breakTime.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="breakTime.from">
                          From
                        </label>
                        <input
                          type="time"
                          id="breakTime.from"
                          name="breakTime.from"
                          value={currentBatch.breakTime.from}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="breakTime.to">
                          To
                        </label>
                        <input
                          type="time"
                          id="breakTime.to"
                          name="breakTime.to"
                          value={currentBatch.breakTime.to}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t px-4 py-3 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-gray-600 hover:text-gray-800 font-medium rounded-md transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-6 rounded focus:outline-none focus:shadow-outline transition text-sm"
                >
                  {currentBatch.id ? 'Update Batch' : 'Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="border-b px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
            </div>
            
            <div className="px-4 py-3">
              <p className="text-gray-700 text-sm">
                Are you sure you want to delete this batch <strong>"{batchToDelete?.name}"</strong>? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="border-t px-4 py-3 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-gray-600 hover:text-gray-800 font-medium rounded-md transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-6 rounded focus:outline-none focus:shadow-outline transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;