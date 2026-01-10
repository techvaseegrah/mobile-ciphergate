import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [filterSupplier, setFilterSupplier] = useState('');

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    paymentStatus: [],
    minAmount: '',
    maxAmount: '',
    invoiceNumber: '',
    part: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    supplier: '',
    cost_price: '',
    selling_price: '',
    stock: 1,
    min_stock_alert: 5,
    location: '',
    color: ''
  });
  const [formData, setFormData] = useState({
    supplier: filterSupplier || '',
    purchaseDate: '',
    invoiceNumber: '',
    items: [{ part: '', quantity: 1, unitPrice: 0, showSearch: false, searchTerm: '', filteredParts: [] }],
    subtotal: 0,
    tax: 0,
    discount: 0,
    totalAmount: 0,
    paymentStatus: 'Pending',
    notes: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);

  // Dropdown data
  const [suppliers, setSuppliers] = useState([]);
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Parse supplier ID from URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const supplierId = queryParams.get('supplier');
    if (supplierId) {
      setFilterSupplier(supplierId);
    }
  }, [location]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch suppliers, parts, and categories (always needed for form)
      const [suppliersRes, partsRes, categoriesRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/inventory'),
        api.get('/categories')
      ]);

      setSuppliers(suppliersRes.data);
      setParts(partsRes.data);
      setCategories(categoriesRes.data);

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add filters to query parameters
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.supplier) queryParams.append('supplier', filters.supplier);
      if (filters.paymentStatus.length > 0) {
        filters.paymentStatus.forEach(status => {
          queryParams.append('paymentStatus', status);
        });
      }
      if (filters.minAmount) queryParams.append('minAmount', filters.minAmount);
      if (filters.maxAmount) queryParams.append('maxAmount', filters.maxAmount);
      if (filters.invoiceNumber) queryParams.append('invoiceNumber', filters.invoiceNumber);
      if (filters.part) queryParams.append('part', filters.part);
      
      // Fetch purchases with filters
      let purchasesRes;
      if (filterSupplier) {
        // If we're filtering by supplier from URL, combine with other filters
        const supplierQuery = queryParams.toString() ? 
          `/purchases/supplier/${filterSupplier}?${queryParams.toString()}` : 
          `/purchases/supplier/${filterSupplier}`;
        purchasesRes = await api.get(supplierQuery);
      } else {
        const queryString = queryParams.toString() ? `/purchases?${queryParams.toString()}` : '/purchases';
        purchasesRes = await api.get(queryString);
      }

      setPurchases(purchasesRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
      setLoading(false);
    }
  }, [filterSupplier, filters]);

  // Fetch purchases, suppliers, and parts from the backend
  useEffect(() => {
    fetchData();
  }, [filterSupplier, filters, fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    
    // Calculate item total
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updatedItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updatedItems[index].unitPrice;
      updatedItems[index].totalPrice = quantity * unitPrice;
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Recalculate totals
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const tax = parseFloat(formData.tax) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const totalAmount = subtotal + tax - discount;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      totalAmount
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [{ part: '', quantity: 1, unitPrice: 0, showSearch: false, searchTerm: '', filteredParts: [] }, ...prev.items]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items];
      updatedItems.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
      calculateTotals(updatedItems);
    }
  };

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    setNewProductForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNewProduct = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newProductForm.name || !newProductForm.sku || !newProductForm.category) {
      setError('Please fill in all required fields: Name, SKU, and Category');
      return;
    }
    
    try {
      // Prepare data for submission, ensuring proper data types
      const submitData = {
        name: newProductForm.name.trim(),
        sku: newProductForm.sku.trim(),
        category: newProductForm.category,
        stock: Number(newProductForm.stock) || 0,
        min_stock_alert: Number(newProductForm.min_stock_alert) || 5,
        cost_price: Number(newProductForm.cost_price) || 0,
        selling_price: Number(newProductForm.selling_price) || 0,
        location: newProductForm.location,
        supplier: newProductForm.supplier || undefined,
        color: newProductForm.color
      };
      
      const response = await api.post('/inventory', submitData);
      
      // Add the new part to the parts list
      setParts(prev => [...prev, response.data]);
      
      // Find the index of the item that triggered the add new product
      const itemIndex = formData.items.findIndex(item => item.showAddNewProductModal);
      if (itemIndex !== -1) {
        // Update that specific item to select the new part
        const updatedItems = [...formData.items];
        updatedItems[itemIndex].part = response.data._id;
        updatedItems[itemIndex].showAddNewProductModal = false;
        setFormData(prev => ({ ...prev, items: updatedItems }));
      }
      
      setSuccess('New product added successfully!');
      
      // Reset the form for adding another product
      setNewProductForm({
        name: '',
        sku: '',
        category: '',
        supplier: '',
        cost_price: '',
        selling_price: '',
        stock: 1,
        min_stock_alert: 5,
        location: '',
        color: ''
      });
      
      // Close the modal after successful addition
      setShowNewProductModal(false);
      
      // Reset the showAddNewProductModal flag on all items
      const resetItems = formData.items.map(item => ({
        ...item,
        showAddNewProductModal: false
      }));
      setFormData(prev => ({ ...prev, items: resetItems }));
    } catch (err) {
      console.error(err);
      // More detailed error handling
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 400) {
        setError('Invalid data provided. Please check all fields.');
      } else if (err.response?.status === 404) {
        setError('Category or supplier not found. Please select valid options.');
      } else if (err.response?.status === 500) {
        setError('Server error. The category or SKU may already exist. Please try again.');
      } else {
        setError('Failed to add new product. Please try again.');
      }
    }
  };

  const openNewProductModal = (itemIndex) => {
    // Set the item that triggered the modal to show the add new product modal
    const updatedItems = [...formData.items];
    updatedItems[itemIndex].showAddNewProductModal = true;
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setShowNewProductModal(true);
  };

  const closeNewProductModal = () => {
    setShowNewProductModal(false);
    // Reset the showAddNewProductModal flag on all items
    const updatedItems = formData.items.map(item => ({
      ...item,
      showAddNewProductModal: false
    }));
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setNewProductForm({
      name: '',
      sku: '',
      category: '',
      supplier: '',
      cost_price: '',
      selling_price: '',
      stock: 1,
      min_stock_alert: 5,
      location: '',
      color: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // Update existing purchase
        await api.put(`/purchases/${editingPurchaseId}`, formData);
        setSuccess('Purchase updated successfully');
      } else {
        // Create new purchase
        await api.post('/purchases', formData);
        setSuccess('Purchase created successfully');
      }
      
      // Reset form
      setFormData({
        supplier: '',
        purchaseDate: '',
        invoiceNumber: '',
        items: [{ part: '', quantity: 1, unitPrice: 0, showSearch: false, searchTerm: '', filteredParts: [] }],
        subtotal: 0,
        tax: 0,
        discount: 0,
        totalAmount: 0,
        paymentStatus: 'Pending',
        notes: ''
      });
      
      setIsEditing(false);
      setEditingPurchaseId(null);
      setShowModal(false);
      fetchData(); // Refresh the list
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} purchase`);
    }
  };

  const handleEdit = (purchase) => {
    setFormData({
      supplier: purchase.supplier._id || purchase.supplier,
      purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : '',
      invoiceNumber: purchase.invoiceNumber || '',
      items: purchase.items.map(item => ({
        part: item.part ? (item.part._id || item.part) : '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        showSearch: false,
        searchTerm: '',
        filteredParts: []
      })),
      subtotal: purchase.subtotal || 0,
      tax: purchase.tax || 0,
      discount: purchase.discount || 0,
      totalAmount: purchase.totalAmount || 0,
      paymentStatus: purchase.paymentStatus || 'Pending',
      notes: purchase.notes || ''
    });
    
    setIsEditing(true);
    setEditingPurchaseId(purchase._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await api.delete(`/purchases/${id}`);
        fetchData(); // Refresh the list
        setSuccess('Purchase deleted successfully');
      } catch (err) {
        console.error(err);
        setError('Failed to delete purchase');
      }
    }
  };

  const handleView = async (purchase) => {
    try {
      // Fetch full purchase details with populated supplier info
      const response = await api.get(`/purchases/${purchase._id}`);
      const fullPurchase = response.data;
      
      setFormData({
        supplier: fullPurchase.supplier._id || fullPurchase.supplier,
        purchaseDate: fullPurchase.purchaseDate ? new Date(fullPurchase.purchaseDate).toISOString().split('T')[0] : '',
        invoiceNumber: fullPurchase.invoiceNumber || '',
        items: fullPurchase.items.map(item => ({
          part: item.part ? (item.part._id || item.part) : '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          showSearch: false,
          searchTerm: '',
          filteredParts: []
        })),
        subtotal: fullPurchase.subtotal || 0,
        tax: fullPurchase.tax || 0,
        discount: fullPurchase.discount || 0,
        totalAmount: fullPurchase.totalAmount || 0,
        paymentStatus: fullPurchase.paymentStatus || 'Pending',
        notes: fullPurchase.notes || ''
      });
      
      setIsEditing(false); // Set to false to indicate view mode
      setEditingPurchaseId(fullPurchase._id);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching purchase details:', err);
      setError('Failed to load purchase details');
      // Still show the modal with available data
      setFormData({
        supplier: purchase.supplier._id || purchase.supplier,
        purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : '',
        invoiceNumber: purchase.invoiceNumber || '',
        items: purchase.items.map(item => ({
          part: item.part ? (item.part._id || item.part) : '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          showSearch: false,
          searchTerm: '',
          filteredParts: []
        })),
        subtotal: purchase.subtotal || 0,
        tax: purchase.tax || 0,
        discount: purchase.discount || 0,
        totalAmount: purchase.totalAmount || 0,
        paymentStatus: purchase.paymentStatus || 'Pending',
        notes: purchase.notes || ''
      });
      
      setIsEditing(false);
      setEditingPurchaseId(purchase._id);
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingPurchaseId(null);
    setFormData({
      supplier: filterSupplier || '',
      purchaseDate: '',
      invoiceNumber: '',
      items: [{ part: '', quantity: 1, unitPrice: 0 }],
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      paymentStatus: 'Pending',
      notes: ''
    });
    setError('');
    setSuccess('');
  };

  // Download purchase invoice as PDF
  const downloadPDF = async () => {
    const invoiceElement = document.getElementById('purchase-invoice');
    
    if (!invoiceElement) {
      setError('Unable to generate PDF');
      return;
    }
    
    try {
      // Use html2canvas to capture the invoice element
      const canvas = await html2canvas(invoiceElement, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add new pages if content is taller than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename
      const invoiceNumber = formData.invoiceNumber || 'invoice';
      const date = formData.purchaseDate ? new Date(formData.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const filename = `purchase_invoice_${invoiceNumber}_${date}.pdf`;
      
      pdf.save(filename);
      setSuccess('PDF downloaded successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    }
  };

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle payment status filter changes
  const handlePaymentStatusChange = (status) => {
    setFilters(prev => {
      const newStatuses = prev.paymentStatus.includes(status)
        ? prev.paymentStatus.filter(s => s !== status)
        : [...prev.paymentStatus, status];
      
      return {
        ...prev,
        paymentStatus: newStatuses
      };
    });
  };

  // Apply filters
  const applyFilters = () => {
    fetchData();
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      supplier: '',
      paymentStatus: [],
      minAmount: '',
      maxAmount: '',
      invoiceNumber: '',
      part: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.startDate || filters.endDate || filters.supplier || 
           filters.paymentStatus.length > 0 || filters.minAmount || 
           filters.maxAmount || filters.invoiceNumber || filters.part;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs ${amount.toFixed(2)}`;
  };

  // Get filter summary for display
  const getFilterSummary = () => {
    const summaries = [];
    if (filters.startDate || filters.endDate) {
      const start = filters.startDate ? formatDate(filters.startDate) : 'Beginning';
      const end = filters.endDate ? formatDate(filters.endDate) : 'Today';
      summaries.push(`Date: ${start} to ${end}`);
    }
    if (filters.supplier) {
      const supplierName = suppliers.find(s => s._id === filters.supplier)?.name || 'Unknown Supplier';
      summaries.push(`Supplier: ${supplierName}`);
    }
    if (filters.paymentStatus.length > 0) {
      summaries.push(`Status: ${filters.paymentStatus.join(', ')}`);
    }
    if (filters.minAmount || filters.maxAmount) {
      const min = filters.minAmount || '0';
      const max = filters.maxAmount || '∞';
      summaries.push(`Amount: Rs ${min} - Rs ${max}`);
    }
    if (filters.invoiceNumber) {
      summaries.push(`Invoice: ${filters.invoiceNumber}`);
    }
    if (filters.part) {
      const partName = parts.find(p => p._id === filters.part)?.name || 'Unknown Part';
      summaries.push(`Part: ${partName}`);
    }
    return summaries;
  };

  // Preset date ranges
  const setDateRange = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  };

  // Preset amount ranges
  const setAmountRange = (min, max) => {
    setFilters(prev => ({
      ...prev,
      minAmount: min,
      maxAmount: max
    }));
  };



  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading purchases...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-900 mr-3">🛒 Purchase History</h1>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {purchases.length} records
            </span>
          </div>
          {filterSupplier ? (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 max-w-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <p className="text-gray-700">
                  <span className="font-medium">Showing purchases for supplier:</span>
                  <span className="font-semibold text-blue-700 ml-1">
                    {suppliers.find(s => s._id === filterSupplier)?.name || 'Unknown Supplier'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setFilterSupplier('');
                      navigate('/purchases');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <span className="mr-1">📋</span> Show All Purchases
                  </button>
                  <span className="text-gray-300 hidden md:inline">|</span>
                  <button 
                    onClick={() => navigate('/suppliers')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <span className="mr-1">🚚</span> Back to Suppliers
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 max-w-2xl">Track and manage supplier purchases with advanced filtering capabilities</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center ${showFilters ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
          >
            <span className="mr-2">{showFilters ? '✕' : '🔍'}</span>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center"
          >
            <span className="mr-2">➕</span>
            Add New Purchase
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-blue-800 mr-2">Active Filters:</span>
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                  {getFilterSummary().length} applied
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {getFilterSummary().map((summary, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200 shadow-sm">
                    {summary}
                    <button 
                      onClick={() => {
                        // Remove specific filter
                        if (summary.startsWith('Date:')) {
                          handleFilterChange('startDate', '');
                          handleFilterChange('endDate', '');
                        } else if (summary.startsWith('Supplier:')) {
                          handleFilterChange('supplier', '');
                        } else if (summary.startsWith('Status:')) {
                          setFilters(prev => ({
                            ...prev,
                            paymentStatus: []
                          }));
                        } else if (summary.startsWith('Amount:')) {
                          handleFilterChange('minAmount', '');
                          handleFilterChange('maxAmount', '');
                        } else if (summary.startsWith('Invoice:')) {
                          handleFilterChange('invoiceNumber', '');
                        } else if (summary.startsWith('Part:')) {
                          handleFilterChange('part', '');
                        }
                      }}
                      className="ml-2 text-blue-400 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <span className="mr-1">🗑️</span> Clear All
            </button>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Date Range Filter */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">📅</span> Date Range
              </h3>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setDateRange(7)}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition"
                  >
                    7 Days
                  </button>
                  <button 
                    onClick={() => setDateRange(30)}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition"
                  >
                    30 Days
                  </button>
                  <button 
                    onClick={() => setDateRange(90)}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition"
                  >
                    90 Days
                  </button>
                  <button 
                    onClick={() => setDateRange(365)}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition"
                  >
                    1 Year
                  </button>
                </div>
              </div>
            </div>

            {/* Supplier Filter */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🚚</span> Supplier
              </h3>
              <select
                value={filters.supplier}
                onChange={(e) => handleFilterChange('supplier', e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">💳</span> Payment Status
              </h3>
              <div className="space-y-2">
                {['Pending', 'Paid', 'Partial', 'Overdue'].map(status => (
                  <div key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`status-${status}`}
                      checked={filters.paymentStatus.includes(status)}
                      onChange={() => handlePaymentStatusChange(status)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`status-${status}`} className="ml-2 text-sm text-gray-700">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount Range Filter */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">💰</span> Amount Range (Rs)
              </h3>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Min</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Max</label>
                    <input
                      type="number"
                      placeholder="Any"
                      value={filters.maxAmount}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setAmountRange(0, 5000)}
                    className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition"
                  >
                    &lt; 5K
                  </button>
                  <button 
                    onClick={() => setAmountRange(5000, 10000)}
                    className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition"
                  >
                    5K-10K
                  </button>
                  <button 
                    onClick={() => setAmountRange(10000, '')}
                    className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition"
                  >
                    10K+
                  </button>
                </div>
              </div>
            </div>

            {/* Invoice Number Filter */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🧾</span> Invoice Number
              </h3>
              <input
                type="text"
                placeholder="Search invoice..."
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Part Filter */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">🔧</span> Part/Item
              </h3>
              <select
                value={filters.part}
                onChange={(e) => handleFilterChange('part', e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Parts</option>
                {parts.map(part => (
                  <option key={part._id} value={part._id}>
                    {part.name} ({part.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Apply/Clear Buttons */}
            <div className="bg-gray-50 p-4 rounded-lg flex items-end">
              <div className="space-y-2 w-full">
                <button
                  onClick={applyFilters}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm flex items-center justify-center"
                >
                  <span className="mr-2">🔍</span> Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm flex items-center justify-center"
                >
                  <span className="mr-2">🗑️</span> Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !showModal && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong>Error:</strong>
          </div>
          <p className="mt-1 ml-7">{error}</p>
        </div>
      )}

      {success && !showModal && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong>Success:</strong>
          </div>
          <p className="mt-1 ml-7">{success}</p>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">{isEditing ? '✏️' : (editingPurchaseId ? '📄' : '➕')}</span>
                {isEditing ? 'Edit Purchase' : (editingPurchaseId ? 'Purchase Invoice' : 'Add New Purchase')}
              </h2>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-sm hover:shadow-md transition"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Show form for editing/adding purchases */}
            {(isEditing || (!isEditing && !editingPurchaseId)) ? (
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">🚚</span> Supplier *
                      </label>
                      <select
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        required
                        disabled={editingPurchaseId && !isEditing}
                      >
                        <option value="">Select a supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">📅</span> Purchase Date *
                      </label>
                      <input
                        type="date"
                        name="purchaseDate"
                        value={formData.purchaseDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        required
                        disabled={editingPurchaseId && !isEditing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">🧾</span> Invoice Number
                      </label>
                      <input
                        type="text"
                        name="invoiceNumber"
                        value={formData.invoiceNumber}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="e.g. INV-2023-001"
                        disabled={editingPurchaseId && !isEditing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">💳</span> Payment Status
                      </label>
                      <select
                        name="paymentStatus"
                        value={formData.paymentStatus}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        disabled={editingPurchaseId && !isEditing}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                      <h4 className="text-md font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">🔧</span> Items
                      </h4>
                      {(!editingPurchaseId || isEditing) && (
                        <button
                          type="button"
                          onClick={addItem}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                          <span className="mr-1">+</span> Add Item
                        </button>
                      )}
                    </div>
                    
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="md:col-span-5">
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <span className="mr-1">⚙️</span> Part *
                          </label>
                          <div className="relative">
                            <select
                              value={item.part}
                              onChange={(e) => handleItemChange(index, 'part', e.target.value)}
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                              required
                              disabled={editingPurchaseId && !isEditing}
                              style={{ display: item.showSearch ? 'none' : 'block' }}
                            >
                              <option value="">Select a part</option>
                              {parts.map(part => (
                                <option key={part._id} value={part._id}>
                                  {part.name} ({part.sku})
                                </option>
                              ))}
                            </select>
                            
                            <input
                              type="text"
                              placeholder="Search parts..."
                              value={item.searchTerm || ''}
                              onChange={(e) => {
                                const updatedItems = [...formData.items];
                                updatedItems[index].searchTerm = e.target.value;
                                updatedItems[index].filteredParts = parts.filter(part =>
                                  part.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                                  part.sku.toLowerCase().includes(e.target.value.toLowerCase())
                                );
                                setFormData(prev => ({ ...prev, items: updatedItems }));
                              }}
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                              style={{ display: item.showSearch ? 'block' : 'none' }}
                              disabled={editingPurchaseId && !isEditing}
                            />
                            
                            {item.showSearch && (
                              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                <div className="p-2 border-b border-gray-200 flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700">Search Results</span>
                                  <button 
                                    onClick={() => {
                                      const updatedItems = [...formData.items];
                                      updatedItems[index].showSearch = false;
                                      updatedItems[index].searchTerm = '';
                                      updatedItems[index].filteredParts = [];
                                      setFormData(prev => ({ ...prev, items: updatedItems }));
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    ✕ Close
                                  </button>
                                </div>
                                <div className="p-2 border-b border-gray-200 bg-gray-50">
                                  <button 
                                    onClick={() => openNewProductModal(index)}
                                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded flex items-center"
                                  >
                                    <span className="mr-2">➕</span> Add New Product
                                  </button>
                                </div>
                                {item.filteredParts && item.filteredParts.length > 0 ? (
                                  item.filteredParts.map(part => (
                                    <div
                                      key={part._id}
                                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() => {
                                        handleItemChange(index, 'part', part._id);
                                        const updatedItems = [...formData.items];
                                        updatedItems[index].showSearch = false;
                                        updatedItems[index].searchTerm = '';
                                        updatedItems[index].filteredParts = [];
                                        setFormData(prev => ({ ...prev, items: updatedItems }));
                                      }}
                                    >
                                      <div className="font-medium">{part.name}</div>
                                      <div className="text-sm text-gray-500">{part.sku}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-gray-500 text-center">No parts found</div>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = [...formData.items];
                              updatedItems[index].showSearch = !updatedItems[index].showSearch;
                              updatedItems[index].searchTerm = '';
                              updatedItems[index].filteredParts = parts;
                              setFormData(prev => ({ ...prev, items: updatedItems }));
                            }}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            disabled={editingPurchaseId && !isEditing}
                          >
                            {item.showSearch ? 'Cancel' : 'Search & Add New'}
                          </button>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <span className="mr-1">🔢</span> Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            disabled={editingPurchaseId && !isEditing}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <span className="mr-1">₹</span> Unit Price (Rs)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            disabled={editingPurchaseId && !isEditing}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <span className="mr-1">💰</span> Total (Rs)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={item.totalPrice?.toFixed(2) || '0.00'}
                            className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 font-medium"
                          />
                        </div>
                        
                        <div className="md:col-span-1 flex items-center justify-center">
                          {(!editingPurchaseId || isEditing) && formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition"
                              title="Remove item"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-1">🧮</span> Subtotal (Rs)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.subtotal.toFixed(2)}
                        className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 font-medium"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-1"> taxpaid</span> Tax (Rs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="tax"
                        value={formData.tax}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        disabled={editingPurchaseId && !isEditing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-1">🏷️</span> Discount (Rs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="discount"
                        value={formData.discount}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        disabled={editingPurchaseId && !isEditing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <span className="mr-1">💰</span> Total Amount (Rs)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.totalAmount.toFixed(2)}
                        className="w-full border border-gray-300 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 font-bold text-blue-800"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <span className="mr-1">📝</span> Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="Additional notes about this purchase..."
                      disabled={editingPurchaseId && !isEditing}
                    ></textarea>
                  </div>
                </div>
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
                  >
                    Cancel
                  </button>
                  {(!editingPurchaseId || isEditing) && (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg"
                    >
                      {editingPurchaseId ? 'Update Purchase' : 'Add Purchase'}
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Report-style view for viewing purchases */
              <div id="purchase-invoice" className="px-6 py-4">
                {/* Header Section */}
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">PURCHASE INVOICE</h3>
                      <p className="text-gray-500 mt-1">#{formData.invoiceNumber || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">Date: {formData.purchaseDate ? new Date(formData.purchaseDate).toLocaleDateString() : 'N/A'}</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                        formData.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                        formData.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        formData.paymentStatus === 'Partial' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formData.paymentStatus || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Supplier Info */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🚚</span> Supplier Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-900">
                      {suppliers.find(s => s._id === formData.supplier)?.name || 'N/A'}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      {suppliers.find(s => s._id === formData.supplier)?.contactPerson || ''}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {suppliers.find(s => s._id === formData.supplier)?.email || ''}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {suppliers.find(s => s._id === formData.supplier)?.phone || ''}
                    </p>
                  </div>
                </div>
                
                {/* Items Table */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔧</span> Items
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.map((item, index) => {
                          const part = parts.find(p => p._id === item.part);
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {part?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {part?.sku || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                Rs {item.unitPrice?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                Rs {item.totalPrice?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Summary */}
                <div className="mb-8">
                  <div className="max-w-xs ml-auto">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">Rs {formData.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">Rs {formData.tax?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">Rs {formData.discount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t border-gray-200 mt-2">
                      <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                      <span className="text-lg font-bold text-blue-600">Rs {formData.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                {formData.notes && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">📝</span> Notes
                    </h4>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Download Button */}
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg flex items-center"
                  >
                    <span className="mr-2">⬇️</span> Download as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">📋</span> Purchase Records
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {purchases.length} {purchases.length === 1 ? 'record' : 'records'} found
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Total Value:</span>
                <span className="ml-1 font-semibold text-gray-800">
                  Rs {purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {purchases.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first purchase record</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              <span className="mr-2">➕</span>
              Add New Purchase
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatDate(purchase.purchaseDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {purchase.supplier?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {purchase.invoiceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {purchase.items?.length || 0} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        purchase.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                        purchase.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        purchase.paymentStatus === 'Partial' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {purchase.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(purchase)}
                          className="text-green-600 hover:text-green-900 flex items-center text-sm"
                          title="View purchase"
                        >
                          <span className="mr-1">👁️</span>
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="text-blue-600 hover:text-blue-900 flex items-center text-sm"
                          title="Edit purchase"
                        >
                          <span className="mr-1">✏️</span>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(purchase._id)}
                          className="text-red-600 hover:text-red-900 flex items-center text-sm"
                          title="Delete purchase"
                        >
                          <span className="mr-1">🗑️</span>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">➕</span>
                Add New Product
              </h2>
              <button 
                onClick={closeNewProductModal}
                className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-sm hover:shadow-md transition"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddNewProduct} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🏷️</span> Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newProductForm.name}
                    onChange={handleNewProductChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🔢</span> SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={newProductForm.sku}
                    onChange={handleNewProductChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Enter SKU"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">📂</span> Category *
                  </label>
                  <select
                    name="category"
                    value={newProductForm.category}
                    onChange={handleNewProductChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🚚</span> Supplier
                  </label>
                  <select
                    name="supplier"
                    value={newProductForm.supplier}
                    onChange={handleNewProductChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">💰</span> Cost Price (Rs)
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={newProductForm.cost_price}
                    onChange={handleNewProductChange}
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🏷️</span> Selling Price (Rs)
                  </label>
                  <input
                    type="number"
                    name="selling_price"
                    value={newProductForm.selling_price}
                    onChange={handleNewProductChange}
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">📦</span> Initial Stock
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={newProductForm.stock}
                    onChange={handleNewProductChange}
                    min="0"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🔔</span> Min Stock Alert
                  </label>
                  <input
                    type="number"
                    name="min_stock_alert"
                    value={newProductForm.min_stock_alert}
                    onChange={handleNewProductChange}
                    min="0"
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="5"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">📍</span> Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={newProductForm.location}
                    onChange={handleNewProductChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Enter storage location"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🎨</span> Color
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={newProductForm.color}
                    onChange={handleNewProductChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Enter color (e.g. Black, White, Red)"
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeNewProductModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;