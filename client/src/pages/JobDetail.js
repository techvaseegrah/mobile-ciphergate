import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import WhatsAppService from '../services/whatsappService'; // Import WhatsApp service
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logoImage from '../assets/logo.png';

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [newPart, setNewPart] = useState({ part: '', quantity: 1, price_type: 'Internal' });
  const [editedParts, setEditedParts] = useState({}); // Track edited part costs
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false); // Track WhatsApp sending status
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(job?.discount_amount || '');
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
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
    location: ''
  });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParts, setFilteredParts] = useState([]);
  const [showPartsDropdown, setShowPartsDropdown] = useState(false);
  const partsDropdownRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);
  
  // Fetch available parts for selection
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const res = await api.get('/inventory');
        setAvailableParts(res.data);
        setFilteredParts(res.data); // Initialize filtered parts
      } catch (err) {
        console.error('Failed to fetch parts:', err);
      }
    };
    
    fetchParts();
  }, []);
  
  // Fetch categories and suppliers for new product form
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          api.get('/categories'),
          api.get('/suppliers')
        ]);
        
        setCategories(categoriesRes.data);
        setSuppliers(suppliersRes.data);
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
      }
    };
    
    fetchDropdownData();
  }, []);
  
  // Update filtered parts when available parts change
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredParts(availableParts);
    } else {
      const filtered = availableParts.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParts(filtered);
    }
  }, [availableParts, searchTerm]);

  const fetchJob = useCallback(async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data);
      setDiscountAmount(res.data.discount_amount || 0);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch job details');
      setLoading(false);
    }
  }, [id]);
  
  // Update discountAmount when job changes
  useEffect(() => {
    if (job) {
      setDiscountAmount(job.discount_amount || '');
    }
  }, [job]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);
  
  // Scroll to top when success message appears
  useEffect(() => {
    if (success) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [success]);

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Intake': return 'bg-gray-200 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Done': return 'bg-green-100 text-green-800';
      case 'Picked Up': return 'bg-purple-100 text-purple-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim() === '') {
      setFilteredParts(availableParts);
    } else {
      const filtered = availableParts.filter(part =>
        part.name.toLowerCase().includes(value.toLowerCase()) ||
        part.sku.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredParts(filtered);
    }
  };
  
  // Toggle parts dropdown
  const togglePartsDropdown = () => {
    setShowPartsDropdown(!showPartsDropdown);
    if (!showPartsDropdown) {
      setFilteredParts(availableParts);
      setSearchTerm('');
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (partsDropdownRef.current && !partsDropdownRef.current.contains(event.target)) {
        setShowPartsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Open new product modal
  const openNewProductModal = () => {
    setShowNewProductModal(true);
  };
  
  // Close new product modal
  const closeNewProductModal = () => {
    setShowNewProductModal(false);
    setNewProductForm({
      name: '',
      sku: '',
      category: '',
      supplier: '',
      cost_price: '',
      selling_price: '',
      stock: 1,
      min_stock_alert: 5,
      location: ''
    });
  };
  
  // Handle changes in new product form
  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    setNewProductForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle adding new product
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
        location: newProductForm.location || undefined,
        supplier: newProductForm.supplier || undefined
      };
      
      const response = await api.post('/inventory', submitData);
      
      // Add the new part to the available parts and filtered parts lists
      setAvailableParts(prev => [...prev, response.data]);
      setFilteredParts(prev => [...prev, response.data]);
      
      // Automatically select the newly added part
      setNewPart(prev => ({
        ...prev,
        part: response.data._id
      }));
      
      setSuccess('New product added successfully!');
      
      // Reset the form
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

      });
      
      // Close the modal
      setShowNewProductModal(false);
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
  
  // Send WhatsApp completion notification
  const sendWhatsAppCompletionNotification = async () => {
    if (!job || !job.customer?.phone) {
      console.error('No customer phone number available');
      return false;
    }

    try {
      setSendingWhatsApp(true);
      
      // Prepare job data for WhatsApp template
      const jobData = {
        customerName: job.customer?.name || 'Customer',
        jobCardNumber: job.job_card_number || job._id.slice(-6),
        deviceBrand: job.device_brand || '',
        deviceModel: job.device_model || 'Unknown Device',
        language: 'en' // Default to English, can be dynamic
      };

      // Call WhatsApp service to send completion notification
      const result = await WhatsAppService.sendJobCompletionNotification(id);
      
      console.log('WhatsApp completion notification sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp completion notification:', error);
      return false;
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Mark job as completed
  const markAsCompleted = async () => {
    // First confirmation
    if (window.confirm('Are you sure you want to mark this job as completed? This will send a WhatsApp notification to the customer.')) {
      // Calculate balance amount
      const totalAmount = job.final_customer_price || job.total_amount || 0;
      const advancePayment = job.advance_payment || 0;
      const balanceAmount = totalAmount - advancePayment;
      
      // Second confirmation for balance collection
      if (balanceAmount > 0) {
        const collectedBalance = window.confirm(
          `Balance amount of Rs ${balanceAmount.toFixed(2)} needs to be collected.\n\n` +
          `Have you collected this amount?\n\n` +
          `• Click OK if you have collected\n` +
          `• Click Cancel if not collected yet`
        );
        
        if (!collectedBalance) {
          // Show option to proceed anyway
          const proceedAnyway = window.confirm(
            `Balance not collected. Do you still want to mark the job as completed?\n\n` +
            `The customer will be notified that their device is ready for pickup.\n\n` +
            `Click OK to continue or Cancel to go back.`
          );
          
          if (!proceedAnyway) {
            return;
          }
        }
      }
      
      // Proceed with completion
      completeJob();
    }
  };
  
  // Complete the job
  const completeJob = async () => {
    try {
      setUpdating(true);
      
      // Update job status to "Done"
      const updateResponse = await api.put(`/jobs/${id}/update`, {
        status: 'Done',
        repair_done_time: new Date()
      });
      
      if (updateResponse.data.success) {
        // Send WhatsApp completion notification
        const whatsappSent = await sendWhatsAppCompletionNotification();
        
        if (whatsappSent) {
          setSuccess('Job marked as completed successfully! WhatsApp notification sent to customer.');
        } else {
          setSuccess('Job marked as completed successfully! (WhatsApp notification failed to send)');
        }
        
        // Update job data
        setJob(updateResponse.data.job);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to mark job as completed');
    } finally {
      setUpdating(false);
    }
  };
  
  // Cancel the job
  const cancelJob = async () => {
    if (!cancellationReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }
    
    try {
      setCancelling(true);
      
      const response = await api.put(`/jobs/${id}/cancel`, {
        cancellation_reason: cancellationReason
      });
      
      if (response.data.success) {
        setSuccess('Job cancelled successfully!');
        setJob(response.data.job); // Update job status in UI
        setShowCancelModal(false);
        setCancellationReason(''); // Clear the reason
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  };
  
  // Update discount amount
  const updateDiscount = async () => {
    try {
      setUpdating(true);
      
      const discountValue = (discountAmount === '' || discountAmount === null) ? 0 : parseFloat(discountAmount) || 0;
      
      // Validate that discount is not greater than total amount
      const totalAmount = job.total_amount || 0;
      if (discountValue > totalAmount) {
        setError(`Discount cannot be greater than total amount (Rs ${totalAmount.toFixed(2)})`);
        return;
      }
      
      const response = await api.put(`/jobs/${id}/update`, {
        discount_amount: discountValue
      });
      
      if (response.data.success) {
        setJob(response.data.job);
        setDiscountAmount(response.data.job.discount_amount || '');
        setSuccess('Discount updated successfully!');
        setIsEditingDiscount(false);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Error updating discount:', err);
      setError('Failed to update discount: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdating(false);
    }
  };
  
  // Resend WhatsApp notification (for cases where it failed)
  const resendWhatsAppNotification = async () => {
    if (window.confirm('Resend WhatsApp completion notification to customer?')) {
      try {
        setSendingWhatsApp(true);
        const whatsappSent = await sendWhatsAppCompletionNotification();
        
        if (whatsappSent) {
          setSuccess('WhatsApp notification resent successfully!');
        } else {
          setError('Failed to resend WhatsApp notification');
        }
        
        setTimeout(() => {
          setSuccess('');
          setError('');
        }, 5000);
      } catch (err) {
        console.error(err);
        setError('Error resending WhatsApp notification');
      } finally {
        setSendingWhatsApp(false);
      }
    }
  };
  
  // Add part to job
  const addPartToJob = async () => {
    if (!newPart.part || newPart.quantity <= 0) {
      setError('Please select a part and enter a valid quantity');
      return;
    }
    
    try {
      setUpdating(true);
      
      // Get current parts used
      const currentParts = job.parts_used || [];
      
      // Check if part already exists
      const existingPartIndex = currentParts.findIndex(p => {
        const partId = typeof p.part === 'object' ? p.part._id : p.part;
        return partId === newPart.part;
      });
      let updatedParts;
      
      if (existingPartIndex >= 0) {
        // Update existing part quantity
        updatedParts = [...currentParts];
        updatedParts[existingPartIndex].quantity += parseInt(newPart.quantity);
      } else {
        // Add new part
        updatedParts = [
          ...currentParts,
          {
            part: newPart.part,
            quantity: parseInt(newPart.quantity),
            price_type: newPart.price_type
          }
        ];
      }
      
      // Update job
      const response = await api.put(`/jobs/${id}/update`, {
        parts_used: updatedParts
      });
      
      if (response.data.success) {
        setJob(response.data.job);
        setSuccess('Part added successfully!');
        setShowPartsModal(false);
        setNewPart({ part: '', quantity: 1, price_type: 'Internal' });
        setSearchTerm(''); // Clear search term
        setFilteredParts(availableParts); // Reset filtered parts
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to add part to job');
    } finally {
      setUpdating(false);
    }
  };
  
  // Remove part from job
  const removePartFromJob = async (partIndex) => {
    if (window.confirm('Are you sure you want to remove this part?')) {
      try {
        setUpdating(true);
        
        // Get current parts used
        const currentParts = job.parts_used || [];
        
        // Remove part at index
        const updatedParts = currentParts.filter((_, index) => index !== partIndex);
        
        // Update job
        const response = await api.put(`/jobs/${id}/update`, {
          parts_used: updatedParts
        });
        
        if (response.data.success) {
          setJob(response.data.job);
          setSuccess('Part removed successfully!');
          setTimeout(() => setSuccess(''), 5000);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to remove part from job');
      } finally {
        setUpdating(false);
      }
    }
  };
  
  // Handle part cost change
  const handlePartCostChange = (index, newCost) => {
    setEditedParts(prev => ({
      ...prev,
      [index]: parseFloat(newCost) || 0
    }));
  };
  
  // Save edited part costs
  const saveEditedPartCosts = async () => {
    try {
      setUpdating(true);
      
      // Create updated parts array with edited costs
      const updatedParts = job.parts_used.map((part, index) => {
        if (editedParts[index] !== undefined) {
          // Create a copy of the part with updated cost
          return {
            ...part,
            edited_cost: editedParts[index]
          };
        }
        return part;
      });
      
      // Update job with edited parts
      const response = await api.put(`/jobs/${id}/update`, {
        parts_used: updatedParts
      });
      
      if (response.data.success) {
        setJob(response.data.job);
        setEditedParts({}); // Clear edited parts
        setSuccess('Part costs updated successfully!');
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update part costs');
    } finally {
      setUpdating(false);
    }
  };
  
  // Calculate total parts cost
  const calculatePartsCost = () => {
    if (!job.parts_used || job.parts_used.length === 0) return 0;
    
    return job.parts_used.reduce((total, partUsed, index) => {
      // Extract part data - handle both populated and unpopulated cases
      const partData = partUsed.part;
      
      // Get part cost with fallbacks
      let partCostPrice = 0;
      
      // Handle case where partData is a populated object
      if (partData && typeof partData === 'object') {
        if (partData.cost_price !== undefined) {
          partCostPrice = partData.cost_price;
        }
      }
      
      // If we have availableParts and partData has an _id, try to get more detailed info
      if (availableParts && partData && partData._id) {
        const foundPart = availableParts.find(p => p._id === partData._id);
        if (foundPart && foundPart.cost_price !== undefined) {
          partCostPrice = foundPart.cost_price;
        }
      }
      
      // Use edited cost if available, otherwise use original cost
      const unitCost = editedParts[index] !== undefined ? editedParts[index] : partCostPrice;
      const quantity = partUsed.quantity || 0;
      
      return total + (unitCost * quantity);
    }, 0);
  };
  
  const downloadPDF = async () => {
    if (!job) return;
    
    try {
      // Date formatting logic
      const dateObj = new Date(job.repair_job_taken_time || Date.now());
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${dateObj.getDate()}/${monthNames[dateObj.getMonth()]}/${dateObj.getFullYear()}`;
      
      // Create a temporary HTML element for the PDF content
      const pdfContent = document.createElement('div');
      pdfContent.style.width = '210mm'; // A4 width
      pdfContent.style.minHeight = '297mm'; // A4 height
      pdfContent.style.padding = '10mm';
      pdfContent.style.backgroundColor = '#ffffff';
      pdfContent.style.boxSizing = 'border-box';
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px'; // Hide from view
      pdfContent.style.fontFamily = "'Nirmala UI', 'Arial Unicode MS', 'Arial', sans-serif"; 
      
      pdfContent.innerHTML = `
        <div style="border: 1px solid #000; padding: 10px; height: 100%; position: relative;">
          
          <!-- Header Section -->
          <div style="text-align: center; margin-bottom: 5px; position: relative;">
            <div style="position: absolute; top: 0; left: 10px;">
               <img src="${logoImage}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'" />
            </div>
            
            ${job.customer_photo ? `<div style="position: absolute; top: 0; right: 10px;">
               <img src="${job.customer_photo}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover;" />
            </div>` : ''}
            
            <h1 style="font-size: 20px; font-weight: bold; margin: 0; padding-top: 5px;">ஸ்ரீ ரமணர் மொபைல் & லேப்டாப் சர்வீஸ் சென்டர்</h1>
            
            <p style="font-size: 12px; margin: 4px 0;">
              1E, கட்டபொம்மன் தெரு, வல்லப விநாயகர் அருகில்,<br/>
              திருவண்ணாமலை - 606601.
            </p>
            <p style="font-size: 13px; font-weight: bold; margin: 4px 0;">
              Mobile : 94430 19097, 94438 11231.
            </p>
            <p style="font-size: 11px; margin: 5px 0;">
              அனைத்து விதமான செல்போன் மற்றும் லேப்டாப் சாதனங்களும் சிறந்த<br/>
              முறையில் பழுது நீக்கி தரப்படும்
            </p>
          </div>

          <!-- Timings and Bill Info -->
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 10px;">
            <div style="width: 40%;">
              <div>வேலை நேரம்</div>
              <div>9.00 a.m. to 9.30 p.m.</div>
              <div style="margin-top: 5px;">செவ்வாய் விடுமுறை</div>
            </div>
            <div style="width: 40%; text-align: right;">
              <div>உணவு இடைவேளை</div>
              <div>1.00 p.m. to 2.30 p.m.</div>
              <div style="margin-top: 5px;">
                <span style="margin-right: 15px;">Bill No.: ${job.job_card_number || job._id.slice(-4)}</span>
                <span>Date: ${formattedDate}</span>
              </div>
            </div>
          </div>

          <hr style="border-top: 1px solid #000; margin: 0;" />

          <!-- Customer Details -->
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px;">
            <div style="width: 60%;">
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="width: 60px; font-weight: bold;">பெயர்</td>
                  <td style="font-weight: bold;">: ${job.customer?.name?.toUpperCase() || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; font-weight: bold;">முகவரி</td>
                  <td style="font-weight: bold;">: ${job.customer?.address || 'T.V.MALAI'}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                </tr>
              </table>
            </div>
            <div style="width: 35%;">
               <table style="width: 100%; border: none;">
                <tr>
                  <td style="width: 60px; font-weight: bold;">செல்</td>
                  <td style="font-weight: bold;">: ${job.customer?.phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">இ.மெயில்</td>
                  <td>: ${job.customer?.email || ''}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Device Table -->
          <div style="margin-bottom: 0;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 13px;">
              <thead>
                <tr style="height: 40px;">
                  <th style="border: 1px solid #000; text-align: left; padding: 5px; width: 30%;">Brand & Model</th>
                  <th style="border: 1px solid #000; text-align: left; padding: 5px; width: 30%;">Fault</th>
                  <th style="border: 1px solid #000; text-align: right; padding: 5px; width: 15%;">Service Charges</th>
                  <th style="border: 1px solid #000; text-align: right; padding: 5px; width: 15%;">Parts Cost</th>
                  <th style="border: 1px solid #000; text-align: right; padding: 5px; width: 10%;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style="height: 50px; vertical-align: top;">
                  <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">
                    ${job.device_brand ? job.device_brand + ' ' : ''}${job.device_model || 'N/A'}
                  </td>
                  <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">
                    ${job.reported_issue?.toUpperCase() || 'N/A'}
                  </td>
                  <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">
                    Rs ${(job.service_charges || 0).toFixed(2)}
                  </td>
                  <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">
                    Rs ${(job.parts_cost || 0).toFixed(2)}
                  </td>
                  <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">
                    Rs ${(job.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Parts Used Table -->
          ${job.parts_used && job.parts_used.length > 0 ? `
          <div style="margin-top: 10px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 12px;">
              <thead>
                <tr style="height: 30px;">
                  <th style="border: 1px solid #000; text-align: left; padding: 5px;">Part Name</th>
                  <th style="border: 1px solid #000; text-align: left; padding: 5px;">SKU</th>
                  <th style="border: 1px solid #000; text-align: left; padding: 5px;">Color</th>
                  <th style="border: 1px solid #000; text-align: right; padding: 5px;">Qty</th>
                  <th style="border: 1px solid #000; text-align: right; padding: 5px;">Unit Price</th>
                  <th style="border: 1px solid #000; text-align: right; padding: 5px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${job.parts_used.map(partUsed => {
                  // Extract part data
                  const partData = partUsed.part;
                  let partName = 'N/A';
                  let partSku = 'N/A';
                  let partCostPrice = 0;
                  let partColor = 'N/A';
                  
                  // Handle case where partData is a populated object
                  if (partData && typeof partData === 'object') {
                    if (partData.name) partName = partData.name;
                    if (partData.sku) partSku = partData.sku;
                    if (partData.cost_price !== undefined) partCostPrice = partData.cost_price;

                  }
                  
                  const quantity = partUsed.quantity || 0;
                  const unitCost = (partUsed.edited_cost !== undefined ? partUsed.edited_cost : partCostPrice) || 0;
                  const totalCost = unitCost * quantity;
                  
                  return `
                  <tr style="height: 25px;">
                    <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">${partName}</td>
                    <td style="border: 1px solid #000; padding: 3px;">${partSku}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">${quantity}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">Rs ${unitCost.toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">Rs ${totalCost.toFixed(2)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <!-- Discount Row -->
          <div style="border: 1px solid #000; padding: 5px 10px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;">
              <div style="font-weight: bold;">Discount:</div>
              <div style="font-weight: bold;">Rs ${(job.discount_amount || 0).toFixed(2)}</div>
            </div>
          </div>
          
          <!-- Net Amount Row -->
          <div style="border: 1px solid #000; padding: 5px 10px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between;">
              <div style="font-weight: bold;">Net Amount:</div>
              <div style="font-weight: bold;">Rs ${((job.total_amount || 0) - (job.discount_amount || 0)).toFixed(2)}</div>
            </div>
          </div>

          <!-- Accessories Check -->
          <div style="border-bottom: 1px solid #000; padding: 10px 5px; font-size: 13px; font-weight: bold;">
            <span style="margin-right: 30px;">Battery : No</span>
            <span style="margin-right: 30px;">MMC : No</span>
            <span>Sim : No</span>
            <div style="margin-top: 5px;">
              பழுது நீக்கவேண்டிய பொருள் யாரால் கொண்டுவரப்பட்டது : <span style="font-weight:normal">${job.customer?.name || 'N/A'}</span>
            </div>
          </div>

          <!-- Terms and Conditions (Tamil) -->
          <div style="padding: 10px 0; font-size: 11px; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              கீழ்கண்ட கட்டுப்பாடுகள் மற்றும் விதிமுறைகளுக்கு உட்பட்டு தங்களுடைய பொருட்கள் பழுது பார்த்தலுக்கு எடுத்துக்கொள்ளப்படும்:
            </div>
            
            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">1.</span>
              <span style="text-align: justify;">Job Cardல் குறிக்கப்படாத உதிரி பாகங்களுக்கு கடை உரிமையாளர் பொறுப்பல்ல</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">2.</span>
              <span style="text-align: justify;">பழுதான உதிரி பாகங்கள் (பேட்டரி உட்பட) திருப்பி கொடுக்கப்படமாட்டாது</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">3.</span>
              <span style="text-align: justify;">பழுதின் கடினத்தைப் பொறுத்தும் உதிரிபாகங்கள் கிடைப்பதைப் பொறுத்தும் திரும்பக்கொடுக்கும் தேதி மாறுபடும்.</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">4.</span>
              <span style="text-align: justify;">பழுதின் செலவினங்களை கணக்கிட்டு சொல்வதற்கு குறைந்தது இரண்டு நாட்கள் தரப்படவேண்டும். பழுதிற்கான செலவினங்களை கணக்கிட்டு சொன்னபிறகு பொருளின் சொந்தக்காரர் பொருளை திருப்பி எடுத்துச் செல்ல நினைத்தால் அப்பொருளை ஆய்வு செய்ததற்கான கட்டணத்தை செலுத்த வேண்டும் (ரூ 100. ரூ 50. ரூ 25. )</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">5.</span>
              <span style="text-align: justify;">பழுது பார்க்கும் போது ஏற்கனவே பழுதான பாகங்கள் மேலும் பழுது அடைந்தால் கடை உரிமையாளர்கள் பொறுப்பல்ல பழுது பார்த்தலின் போது தேவைப்பட்டால் சமமான உதிரி பாகங்கள் உபயோகிப்பது அல்லது சர்க்யூட் மாற்றம் செய்வது போன்றவை மேற்கொள்ளப்படும்</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">6.</span>
              <span style="text-align: justify;">பழுதின் செலவினங்களை கணக்கிட்டு சொல்வதற்கு குறைந்தது இரண்டு நாட்கள் தரப்படவேண்டும். பழுதிற்கான செலவினங்களை கணக்கிட்டு சொன்னபிறகு பொருளின் சொந்தக்காரர் பொருளை திருப்பி எடுத்துச் செல்ல நினைத்தால் அப்பொருளை ஆய்வு செய்ததற்கான கட்டணத்தை செலுத்த வேண்டும் (ரூ 100. ரூ 50. ரூ 25. )</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">7.</span>
              <span style="text-align: justify;">பழுதுபார்த்தலுக்கு தரப்பட்ட பொருட்கள் தொடர்பான தஸ்தாவேஜிகளில் ஏதாவது தவறு இருந்தால் அதற்கு கடை உரிமையாளர் பொறுப்பல்ல. அதன் தொடர்பாக ஏதேனும் பிரச்சனைகள் யாராலாவது ஏற்பட்டால் அதற்கு பொருளின் சொந்தக்காரர்தான் பொறுப்பு ஏற்க வேண்டும்.</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">8.</span>
              <span style="text-align: justify;">அறிவிப்பு தேதியில் இருந்து குறைந்தது இரண்டு வாரங்களுக்குள் வாடிக்கையாளர் தமது பொருளை பெற்றுக் கொள்ளாவிட்டால் எந்தவிதமான உரிமை கொண்டாடுவதற்கும் கடை உரிமையாளர் பொறுப்பல்ல.</span>
            </div>

            <div style="display: flex; margin-bottom: 5px;">
              <span style="width: 15px; flex-shrink: 0; font-weight: bold;">9.</span>
              <span style="text-align: justify;">தண்ணீரில் விழுந்த அனைத்துவிதமான செல்போன்களுக்கும் குறைந்தபட்ச (அ) பழுது கட்டணமாக ரூ 150 கண்டிப்பாக வசூலிக்கப்படும்.</span>
            </div>
          </div>

          <!-- Footer Totals -->
          <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 5px; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between;">
            <div>Total Amount: Rs ${(job.total_amount || 0).toFixed(2)}</div>
            <div>Discount: Rs ${(job.discount_amount || 0).toFixed(2)}</div>
            <div>Net Amount: Rs ${((job.total_amount || 0) - (job.discount_amount || 0)).toFixed(2)}</div>
            <div>Advance: Rs ${(job.advance_payment || 0).toFixed(2)}</div>
            <div>Balance: Rs ${(((job.total_amount || 0) - (job.discount_amount || 0)) - (job.advance_payment || 0)).toFixed(2)}</div>
          </div>

          <!-- Declaration & Signatures -->
          <div style="padding: 20px 5px; font-size: 13px; margin-top: 10px;">
             <div style="font-weight: bold; margin-bottom: 30px;">
               நான் எனது பொருளை Job Card ல் கூறப்பட்டுள்ளது போல் நல்ல முறையில் பெற்றுக்கொண்டேன்
             </div>
             
             <div style="display: flex; justify-content: flex-end;">
               <div style="text-align: center;">
                 <div style="margin-bottom: 5px;">கையொப்பம்</div>
                 <div>பொருளின் உரிமையாளர் அல்லது முகவர்</div>
               </div>
             </div>
          </div>

          <div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: 10px;">
            *Computer Generated Receipt*
          </div>

        </div>
      `;
      
      document.body.appendChild(pdfContent);
      
      // Use html2canvas to capture the content
      const canvas = await html2canvas(pdfContent, {
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Save the PDF
      const filename = `Bill_${job.job_card_number || job._id}_${job.customer?.name || 'customer'}.pdf`;
      pdf.save(filename);
      
      // Clean up
      document.body.removeChild(pdfContent);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen md:ml-64 flex items-center justify-center">
        <div className="text-xl">Loading job details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen md:ml-64">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen md:ml-64">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Job not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen md:ml-64">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}
      
      <div className="mb-6">
        <button 
          onClick={() => navigate('/jobs')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Jobs
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
        <p className="text-gray-600">Job ID: {job._id}</p>
        <p className="text-gray-600">Customer Phone: {job.customer?.phone || 'Not available'}</p>
      </div>

      {/* Customer Image Section */}
      {job.customer_photo && (
        <div className="bg-white rounded-lg shadow mb-6 p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Photo</h2>
          <img 
            src={job.customer_photo} 
            alt="Customer" 
            className="w-32 h-32 object-cover rounded-full border-4 border-gray-200"
          />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={downloadPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download PDF
          </button>
          
          {job.device_video && (
            <button 
              onClick={() => setShowVideo(!showVideo)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              {showVideo ? 'Hide Device Video' : 'View Device Video'}
            </button>
          )}
          
          {job.status === 'Done' && (
            <button 
              onClick={resendWhatsAppNotification}
              disabled={sendingWhatsApp || !job.customer?.phone}
              className={`px-4 py-2 text-white rounded flex items-center ${sendingWhatsApp ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} ${!job.customer?.phone ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {sendingWhatsApp ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                  Resend WhatsApp
                </>
              )}
            </button>
          )}
          
          {job.status !== 'Done' && job.status !== 'Picked Up' && job.status !== 'Cancelled' && (
            <button 
              onClick={markAsCompleted}
              disabled={updating || sendingWhatsApp}
              className={`px-4 py-2 text-white rounded flex items-center ${(updating || sendingWhatsApp) ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {(updating || sendingWhatsApp) ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Mark as Completed
                </>
              )}
            </button>
          )}
          
          {job.status !== 'Done' && job.status !== 'Picked Up' && job.status !== 'Cancelled' && (
            <button 
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded flex items-center hover:bg-red-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Cancel Job
            </button>
          )}
        </div>
        
        {showVideo && job.device_video && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Device Video</h3>
            <video 
              ref={videoRef}
              src={job.device_video} 
              controls
              className="w-full max-w-2xl rounded border"
            />
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Job Information</h2>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{job.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{job.customer?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{job.customer?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{job.customer?.address || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Device Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Brand</p>
                  <p className="font-medium">{job.device_brand || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Model</p>
                  <p className="font-medium">{job.device_model || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IMEI Number</p>
                  <p className="font-medium">{job.imei_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reported Issue</p>
                  <p className="font-medium">{job.reported_issue || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Repair Type</p>
                  <p className="font-medium capitalize">{job.repair_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Urgency Level</p>
                  <p className="font-medium capitalize">{job.urgency_level || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Delivery</p>
                  <p className="font-medium">{job.estimated_delivery_date ? new Date(job.estimated_delivery_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Job Card Number</p>
                  <p className="font-medium">{job.job_card_number || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financials</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Service Charges</p>
                  <p className="font-medium">Rs {job.service_charges?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parts Cost</p>
                  <p className="font-medium">Rs {job.parts_cost?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Advance Payment</p>
                  <p className="font-medium">Rs {job.advance_payment?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium">Rs {job.total_amount?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Discount</p>
                    {isEditingDiscount ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Rs</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discountAmount || ''}
                          onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          onWheel={(e) => e.target.blur()}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right hide-spinner"
                        />
                      </div>
                    ) : (
                      <p className="font-medium">Rs {job.discount_amount ? (job.discount_amount).toFixed(2) : '0.00'}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {isEditingDiscount && (
                      <button
                        onClick={() => setIsEditingDiscount(false)}
                        className="text-sm px-2 py-1 bg-gray-500 text-white rounded"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isEditingDiscount) {
                          updateDiscount();
                        } else {
                          setIsEditingDiscount(true);
                        }
                      }}
                      disabled={updating}
                      className={`text-sm px-2 py-1 rounded ${isEditingDiscount ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'} ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isEditingDiscount ? 'Save' : 'Edit'}
                    </button>
                  </div>
                </div>
                <style>{`
                  .hide-spinner::-webkit-outer-spin-button,
                  .hide-spinner::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }
                  .hide-spinner {
                    -moz-appearance: textfield;
                  }
                `}</style>
                <div>
                  <p className="text-sm text-gray-500">Net Amount</p>
                  <p className="font-medium text-green-600">
                    Rs {((job.total_amount || 0) - (job.discount_amount || 0)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance Amount</p>
                  <p className="font-medium text-blue-600">
                    Rs {(((job.total_amount || 0) - (job.discount_amount || 0)) - (job.advance_payment || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Parts Used</h2>
            <button 
              onClick={() => setShowPartsModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Part
            </button>
          </div>
        </div>
        
        {job.parts_used && job.parts_used.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {job.parts_used.map((part, index) => {
                  // Extract part data - handle both populated and unpopulated cases
                  const partData = part.part;
                  
                  // Get part details with fallbacks
                  let partName = 'N/A';
                  let partSku = 'N/A';
                  let partCostPrice = 0;
                  
                  // Handle case where partData is a populated object
                  if (partData && typeof partData === 'object') {
                    if (partData.name) {
                      partName = partData.name;
                    }
                    if (partData.sku) {
                      partSku = partData.sku;
                    }
                    if (partData.cost_price !== undefined) {
                      partCostPrice = partData.cost_price;
                    }
                  }
                  
                  // If we have availableParts and partData has an _id, try to get more detailed info
                  if (availableParts && partData && partData._id) {
                    const foundPart = availableParts.find(p => p._id === partData._id);
                    if (foundPart) {
                      partName = foundPart.name || partName;
                      partSku = foundPart.sku || partSku;
                      partCostPrice = foundPart.cost_price !== undefined ? foundPart.cost_price : partCostPrice;
                    }
                  }
                  
                  // Use edited cost if available, otherwise use original cost
                  const displayUnitCost = editedParts[index] !== undefined ? editedParts[index] : partCostPrice;
                  const quantity = part.quantity || 0;
                  const totalCost = displayUnitCost * quantity;
                  
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{partName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partSku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.price_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={displayUnitCost}
                          onChange={(e) => handlePartCostChange(index, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Rs {totalCost.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => removePartFromJob(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Revenue Calculation */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Parts Cost:</span>
                    <span>Rs {calculatePartsCost().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Service Charges:</span>
                    <span>Rs {(job.service_charges || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-gray-300">
                    <span className="font-bold">Total Cost:</span>
                    <span className="font-bold">Rs {(calculatePartsCost() + (job.service_charges || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Final Price:</span>
                    <span>Rs {(job.final_customer_price || job.total_amount || 0).toFixed(2)}</span>
                  </div>
                  {Object.keys(editedParts).length > 0 && (
                    <div className="flex justify-end py-2">
                      <button 
                        onClick={saveEditedPartCosts}
                        disabled={updating}
                        className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {updating ? 'Saving...' : 'Save Cost Changes'}
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t border-gray-300 bg-green-50 p-2 rounded">
                    <span className="font-bold">Revenue:</span>
                    <span className="font-bold text-green-600">Rs {Math.max(0, (job.final_customer_price || job.total_amount || 0) - calculatePartsCost() - (job.service_charges || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No parts used for this job. Click "Add Part" to add parts.
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Service Notes</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-700">{job.service_notes || 'No service notes available.'}</p>
        </div>
      </div>
      
      {/* Add Part Modal */}
      {showPartsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900">Add Part to Job</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Part</label>
                  
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={openNewProductModal}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded flex items-center"
                    >
                      <span className="mr-2">➕</span> Add New Product
                    </button>
                  </div>
                  
                  <div className="relative" ref={partsDropdownRef}>
                    <div 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer flex justify-between items-center"
                      onClick={togglePartsDropdown}
                    >
                      {newPart.part ? 
                        (() => {
                          const selectedPart = availableParts.find(p => p._id === newPart.part);
                          return selectedPart ? selectedPart.name + ' (SKU: ' + selectedPart.sku + ')' : 'Select a part';
                        })()
                        : 'Select a part'}
                      <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {showPartsDropdown && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200 bg-gray-50">
                          <input
                            type="text"
                            placeholder="Search parts..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full px-3 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()} // Prevent click from bubbling up
                          />
                        </div>
                        <div className="py-2">
                          {filteredParts.length > 0 ? (
                            filteredParts.map(part => (
                              <div
                                key={part._id}
                                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setNewPart({...newPart, part: part._id});
                                  setShowPartsDropdown(false);
                                }}
                              >
                                <div className="font-medium">{part.name}</div>
                                <div className="text-sm text-gray-500">SKU: {part.sku} - Rs {part.cost_price?.toFixed(2) || '0.00'}</div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-gray-500 text-center">No parts found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                  <select
                    value={newPart.price_type}
                    onChange={(e) => setNewPart({...newPart, price_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Internal">Internal</option>
                    <option value="Outsourced">Outsourced</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={addPartToJob}
                disabled={updating}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${updating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm`}
              >
                {updating ? 'Adding...' : 'Add Part'}
              </button>
              <button
                type="button"
                onClick={() => setShowPartsModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Product</h3>
            </div>
            <form onSubmit={handleAddNewProduct}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="mr-1">🔧</span> Part Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newProductForm.name}
                    onChange={handleNewProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. iPhone 12 Screen"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="mr-1">🏷️</span> SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={newProductForm.sku}
                    onChange={handleNewProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. SCR-IP12-BLK"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="mr-1">📂</span> Category *
                  </label>
                  <select
                    name="category"
                    value={newProductForm.category}
                    onChange={handleNewProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="mr-1">🏢</span> Supplier
                  </label>
                  <select
                    name="supplier"
                    value={newProductForm.supplier}
                    onChange={handleNewProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <span className="mr-1">💰</span> Cost Price (Rs)
                    </label>
                    <input
                      type="number"
                      name="cost_price"
                      value={newProductForm.cost_price}
                      onChange={handleNewProductChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <span className="mr-1">🏷️</span> Selling Price (Rs)
                    </label>
                    <input
                      type="number"
                      name="selling_price"
                      value={newProductForm.selling_price}
                      onChange={handleNewProductChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <span className="mr-1">📦</span> Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={newProductForm.stock}
                      onChange={handleNewProductChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <span className="mr-1">⚠️</span> Min Stock Alert
                    </label>
                    <input
                      type="number"
                      name="min_stock_alert"
                      value={newProductForm.min_stock_alert}
                      onChange={handleNewProductChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="mr-1">📍</span> Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={newProductForm.location}
                    onChange={handleNewProductChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Shelf A, Bin 5"
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeNewProductModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Cancel Job Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Job</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows="4"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter reason for cancelling this job..."
                  disabled={cancelling}
                />
              </div>
              
              <div className="text-sm text-gray-500 mb-6">
                This job will be marked as cancelled and will no longer appear in active jobs.
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                  disabled={cancelling}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={cancelJob}
                  disabled={cancelling || !cancellationReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;