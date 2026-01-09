import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { exportInventory } from '../utils/reportUtils';

const Inventory = () => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPartId, setEditingPartId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    stock: 0,
    min_stock_alert: 5,
    cost_price: 0,
    selling_price: 0,
    location: '',
    supplier: ''
  });
  const [customCategory, setCustomCategory] = useState('');

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const fetchParts = async () => {
    try {
      const res = await api.get('/inventory');
      setParts(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch inventory');
      setLoading(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
      
      // Set default category if none selected
      if (res.data.length > 0 && !formData.category) {
        setFormData(prev => ({
          ...prev,
          category: res.data[0]._id
        }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch categories');
    }
  }, [formData.category]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
      // Not a critical error, so we won't set error state
    }
  };
  
  // Filter parts based on search term
  const filteredParts = parts.filter(part => {
    const searchLower = searchTerm.toLowerCase();
    return (
      part.name.toLowerCase().includes(searchLower) ||
      part.sku.toLowerCase().includes(searchLower) ||
      (part.category?.name && part.category.name.toLowerCase().includes(searchLower)) ||
      (part.supplier?.name && part.supplier.name.toLowerCase().includes(searchLower))
    );
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setShowCategoryModal(true);
    } else {
      setFormData({
        ...formData,
        category: value
      });
    }
  };

  const handleCustomCategorySubmit = async () => {
    if (customCategory.trim()) {
      try {
        const res = await api.post('/categories', {
          name: customCategory.trim()
        });
        
        // Add new category to the list
        setCategories(prev => [...prev, res.data]);
        
        // Set the new category as selected
        setFormData({
          ...formData,
          category: res.data._id
        });
        
        setShowCategoryModal(false);
        setCustomCategory('');
        setSuccess('Category created successfully');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to create category');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.name.trim()) {
      setError('Part name is required');
      return;
    }
    
    if (!formData.sku || !formData.sku.trim()) {
      setError('SKU is required');
      return;
    }
    
    if (!formData.category) {
      setError('Category is required');
      return;
    }
    
    // Make sure category is a valid ObjectId string
    if (typeof formData.category !== 'string' || formData.category.length === 0) {
      setError('Please select a valid category');
      return;
    }
    
    try {
      // Prepare data for submission
      let submitData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category,
        stock: Number(formData.stock) || 0,
        min_stock_alert: Number(formData.min_stock_alert) || 0,
        cost_price: Number(formData.cost_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        location: formData.location,
        supplier: formData.supplier
      };
      
      // Remove empty fields to avoid validation errors
      if (!submitData.category || submitData.category === '') {
        delete submitData.category;
      }
      
      // Remove supplier field if it's empty (to avoid validation errors)
      if (!submitData.supplier || submitData.supplier === '') {
        delete submitData.supplier;
      }
      
      // Remove location field if it's empty
      if (!submitData.location || submitData.location === '') {
        delete submitData.location;
      }
      
      if (isEditing) {
        // Update existing part
        await api.put(`/inventory/${editingPartId}`, submitData);
        setSuccess('Part updated successfully');
      } else {
        // Create new part
        await api.post('/inventory', submitData);
        setSuccess('Part added successfully');
      }
      setShowModal(false);
      setFormData({
        name: '',
        sku: '',
        category: categories.length > 0 ? categories[0]._id : '',
        stock: 0,
        min_stock_alert: 5,
        cost_price: 0,
        selling_price: 0,
        location: '',
        supplier: ''
      });
      setIsEditing(false);
      setEditingPartId(null);
      fetchParts(); // Refresh the list
    } catch (err) {
      console.error(err);
      // More detailed error handling
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 400) {
        setError('Invalid data provided. Please check all fields.');
      } else if (err.response?.status === 404) {
        setError('Part not found. It may have been deleted.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again or contact support.');
      } else {
        setError(`Failed to ${isEditing ? 'update' : 'add'} part. Please try again.`);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingPartId(null);
    setFormData({
      name: '',
      sku: '',
      category: categories.length > 0 ? categories[0]._id : '',
      stock: 0,
      min_stock_alert: 5,
      cost_price: 0,
      selling_price: 0,
      location: '',
      supplier: ''
    });
    setError('');
    setSuccess('');
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCustomCategory('');
  };

  const handleEdit = (part) => {
    setFormData({
      name: part.name,
      sku: part.sku,
      category: part.category?._id || (categories.length > 0 ? categories[0]._id : ''),
      stock: part.stock,
      min_stock_alert: part.min_stock_alert,
      cost_price: part.cost_price,
      selling_price: part.selling_price,
      location: part.location || '',
      supplier: part.supplier?._id || ''
    });
    setIsEditing(true);
    setEditingPartId(part._id);
    setShowModal(true);
  };
  
  const handleDelete = async (partId) => {
    if (window.confirm('Are you sure you want to delete this part? This action cannot be undone.')) {
      try {
        setDeleting(true);
        await api.delete(`/inventory/${partId}`);
        setSuccess('Part deleted successfully!');
        fetchParts(); // Refresh the parts list
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error(err);
        setError('Failed to delete part. Please try again.');
        
        // Clear error message after 5 seconds
        setTimeout(() => setError(''), 5000);
      } finally {
        setDeleting(false);
      }
    }
  };

  // Fetch parts, categories, and suppliers from the backend
  useEffect(() => {
    fetchParts();
    fetchCategories();
    fetchSuppliers();
  }, [fetchCategories]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage your repair shop parts inventory</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Add New Product
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

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Product' : 'Add New Product'}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4">
                <div className="mb-4 text-sm text-gray-600">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Part Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. iPhone 12 Screen"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SKU *
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. SCR-IP12-BLK"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <div className="flex space-x-2">
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleCategoryChange}
                          className="flex-1 border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          required
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(true)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Shelf A, Bin 5"
                      />
                    </div>
                                          
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier
                      </label>
                      <select
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select a supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        min="0"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Stock Alert
                      </label>
                      <input
                        type="number"
                        name="min_stock_alert"
                        value={formData.min_stock_alert}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        min="0"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost Price (Rs)
                      </label>
                      <input
                        type="number"
                        name="cost_price"
                        value={formData.cost_price}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Price (Rs)
                      </label>
                      <input
                        type="number"
                        name="selling_price"
                        value={formData.selling_price}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
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
                  disabled={!formData.name || !formData.sku || !formData.category}
                >
                  {isEditing ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Category Modal - Appears on top of Add Product Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Category</h3>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter category name"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeCategoryModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomCategorySubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                disabled={!customCategory.trim()}
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Parts Inventory ({parts.length})</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="w-full md:w-auto">
              <input
                type="text"
                placeholder="Search parts by name, SKU, category, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportInventory(api, 'pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm"
              >
                Export PDF
              </button>
              <button
                onClick={() => exportInventory(api, 'excel')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition text-sm"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>
        {filteredParts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No parts match your search.' : 'No parts found in inventory.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map((part) => (
                  <tr key={part._id} className={part.stock <= part.min_stock_alert ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{part.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.category?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={part.stock <= part.min_stock_alert ? 'text-red-600 font-bold' : ''}>
                        {part.stock}
                      </span>
                      {part.stock <= part.min_stock_alert && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.supplier?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Rs {part.selling_price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(part)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(part._id)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default Inventory;