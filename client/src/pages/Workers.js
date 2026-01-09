import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { getBatches as fetchBatches } from '../utils/batchUtils';
import { exportWorkers } from '../utils/reportUtils';
import * as faceapi from 'face-api.js';
// Function to compress image
const compressImage = (imageDataUrl, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions (reduce to 50% of original)
      const maxWidth = 300;
      const maxHeight = 300;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.src = imageDataUrl;
  });
};

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Batch selection state
  const [selectedBatch, setSelectedBatch] = useState('');
  const [availableBatches, setAvailableBatches] = useState([]);  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    salary: '',
    rfid: '',
    batch: '' // Add batch field
  });  
  const [isEditing, setIsEditing] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  
  // Face capture state for multiple images
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceImages, setFaceImages] = useState([]); // Array to store multiple face images
  const [capturing, setCapturing] = useState(false);
  const [captureCompleted, setCaptureCompleted] = useState(false); // Track if capture session is completed
  const [faceDetectionActive, setFaceDetectionActive] = useState(false); // Track if face detection is active
  const [faceDetected, setFaceDetected] = useState(false); // Track if a face is currently detected
  const [faceQualityScore, setFaceQualityScore] = useState(0); // Quality score for face position and clarity
  const [faceDetectionStatus, setFaceDetectionStatus] = useState(''); // Status message for face detection
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Face review state
  const [showFaceReview, setShowFaceReview] = useState(false);
  const [reviewWorker, setReviewWorker] = useState(null);
  const [reviewFaceImages, setReviewFaceImages] = useState([]);

  // RFID state
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [rfidInput, setRfidInput] = useState('');
  const [scanningRFID, setScanningRFID] = useState(false);

  // Add a callback ref to ensure proper attachment
  const setVideoRef = useCallback((element) => {
    console.log('setVideoRef called with element:', element);
    if (element) {
      console.log('Video element attached to ref:', element);
      videoRef.current = element;
      
      // If we're showing the face capture and not capturing yet, try to access camera
      if (showFaceCapture && !captureCompleted && !capturing) {
        console.log('Video element attached and face capture is active, attempting to access camera...');
        
        // Try to access camera immediately
        const constraints = { 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
          .then(stream => {
            console.log('Camera access granted via ref callback, setting stream to video element...');
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              setCapturing(true);
              console.log('Camera stream successfully set to video element via ref callback');
            }
          })
          .catch(err => {
            console.error('Error accessing camera via ref callback:', err);
            // Try fallback
            const fallbackConstraints = { video: { facingMode: 'user' } };
            navigator.mediaDevices.getUserMedia(fallbackConstraints)
              .then(stream => {
                console.log('Camera access granted with fallback via ref callback...');
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  setCapturing(true);
                  console.log('Camera stream successfully set to video element with fallback via ref callback');
                }
              })
              .catch(fallbackErr => {
                console.error('Error accessing camera with fallback via ref callback:', fallbackErr);
                let errorMessage = 'Could not access camera. ';
                if (fallbackErr.name === 'NotAllowedError') {
                  errorMessage += 'Please grant camera permission in your browser settings.';
                } else {
                  errorMessage += 'Please ensure you have given permission and that your camera is not in use.';
                }
                setError(errorMessage);
                setCapturing(false);
              });
          });
      }
    } else {
      console.log('Video element ref cleared');
      videoRef.current = null;
    }
  }, [showFaceCapture, captureCompleted, capturing]);

  // Cleanup function for video streams
  const cleanupVideoStream = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('Cleaning up track on unmount:', track);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error('Error cleaning up video stream:', err);
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupVideoStream();
    };
  }, []);

  // Handle camera access when face capture modal is shown
  useEffect(() => {
    if (showFaceCapture && !captureCompleted && !capturing) {
      // Check if browser supports media devices
      if (!navigator.mediaDevices) {
        console.error('Browser does not support media devices');
        setError('Your browser does not support camera access. Please try a different browser.');
        return;
      }
      
      console.log('Face capture modal shown, will attempt camera access when video element is ready');
      
      // Camera access will be handled in the video element's ref callback
      // This ensures we only try to access the camera when the element is definitely available
    }
  }, [showFaceCapture, captureCompleted, capturing]);

  // Watch for when the video element should be available and try to access camera
  useEffect(() => {
    if (showFaceCapture && !captureCompleted && !capturing) {
      console.log('Face capture is active, watching for video element...');
      
      // Clear any existing intervals
      if (window.faceCaptureInterval) {
        clearInterval(window.faceCaptureInterval);
      }
      if (window.faceCaptureTimeout) {
        clearTimeout(window.faceCaptureTimeout);
      }
      
      // Try to find the video element in the DOM periodically
      window.faceCaptureInterval = setInterval(() => {
        const videoElement = document.getElementById('face-capture-video');
        if (videoElement && !videoRef.current) {
          console.log('Found video element in DOM, setting ref:', videoElement);
          videoRef.current = videoElement;
          
          // Try to access camera
          const constraints = { video: { facingMode: 'user' } };
          navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
              console.log('Camera access granted via DOM query, setting stream to video element...');
              videoElement.srcObject = stream;
              setCapturing(true);
              // Clear interval once we have access
              if (window.faceCaptureInterval) {
                clearInterval(window.faceCaptureInterval);
                window.faceCaptureInterval = null;
              }
            })
            .catch(err => {
              console.error('Error accessing camera via DOM query:', err);
              // Don't clear interval here, let user try manually
            });
        }
      }, 500);
      
      // Clear interval after 10 seconds
      window.faceCaptureTimeout = setTimeout(() => {
        if (window.faceCaptureInterval) {
          clearInterval(window.faceCaptureInterval);
          window.faceCaptureInterval = null;
        }
      }, 10000);
      
      // Cleanup
      return () => {
        if (window.faceCaptureInterval) {
          clearInterval(window.faceCaptureInterval);
          window.faceCaptureInterval = null;
        }
        if (window.faceCaptureTimeout) {
          clearTimeout(window.faceCaptureTimeout);
          window.faceCaptureTimeout = null;
        }
      };
    }
  }, [showFaceCapture, captureCompleted, capturing]);

  // Fetch workers and departments from the backend
  useEffect(() => {
    fetchWorkers();
    fetchDepartments();
  }, []);
  
  // Load batches when component mounts
  const loadBatches = async () => {
    try {
      const batches = await fetchBatches();
      setAvailableBatches(batches);
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };
  
  useEffect(() => {
    loadBatches();
  }, []);
  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');

      setWorkers(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch workers');
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch departments');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for salary to ensure proper type and validation
    if (name === 'salary') {
      // Allow empty values and valid numbers only
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  // Handle batch selection
  const handleBatchChange = (e) => {
    const batchId = e.target.value;
    setSelectedBatch(batchId);
    // Update form data with selected batch
    setFormData({
      ...formData,
      batch: batchId
    });
  };
  const startFaceCapture = () => {
    setShowFaceCapture(true);
    setCapturing(true); // Start with true to immediately show camera
    setCaptureCompleted(false);
    setFaceImages([]); // Clear previous images when starting new capture session
    
    // Ensure any existing stream is stopped first
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      } catch (err) {
        console.log('No existing stream to stop or error stopping tracks:', err);
      }
    }
    
    // Immediately try to access camera
    setTimeout(() => {
      if (videoRef.current) {
        const constraints = { 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
          .then(stream => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              setCapturing(true);
              // Start face detection after camera access
              setTimeout(() => {
                setFaceDetectionActive(true);
              }, 1000);
            }
          })
          .catch(err => {
            console.error('Error accessing camera:', err);
            // Try fallback
            const fallbackConstraints = { video: { facingMode: 'user' } };
            navigator.mediaDevices.getUserMedia(fallbackConstraints)
              .then(stream => {
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  setCapturing(true);
                  // Start face detection after camera access
                  setTimeout(() => {
                    setFaceDetectionActive(true);
                  }, 1000);
                }
              })
              .catch(fallbackErr => {
                console.error('Error accessing camera with fallback:', fallbackErr);
                let errorMessage = 'Could not access camera. ';
                if (fallbackErr.name === 'NotAllowedError') {
                  errorMessage += 'Please grant camera permission in your browser settings.';
                } else {
                  errorMessage += 'Please ensure you have given permission and that your camera is not in use.';
                }
                setError(errorMessage);
                setCapturing(false);
              });
          });
      }
    }, 100);
  };
  
  // Function to calculate face quality score
  const calculateFaceQuality = (detection, videoElement) => {
    if (!detection || !videoElement) return 0;
    
    const box = detection.detection.box;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    // Calculate face size relative to video dimensions
    const faceWidthRatio = box.width / videoWidth;
    const faceHeightRatio = box.height / videoHeight;
    
    // Calculate face position (should be roughly centered)
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const xCenterRatio = Math.abs(centerX - videoWidth / 2) / (videoWidth / 2);
    const yCenterRatio = Math.abs(centerY - videoHeight / 2) / (videoHeight / 2);
    
    // Quality factors:
    // - Face size should be between 20% and 60% of video
    const sizeFactor = Math.min(1, Math.max(0, (Math.min(faceWidthRatio, faceHeightRatio) - 0.2) / 0.4));
    // - Face should be centered (closer to center is better)
    const centerFactor = Math.max(0, 1 - Math.sqrt(xCenterRatio * xCenterRatio + yCenterRatio * yCenterRatio));
    
    // Combined quality score (0-1 scale)
    const qualityScore = (sizeFactor * 0.6 + centerFactor * 0.4);
    
    return Math.round(qualityScore * 100);
  };
  
  // Function to detect faces in video
  const detectFaceInVideo = async () => {
    if (!videoRef.current || !faceDetectionActive) return;
    
    try {
      const detections = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();
        
      if (detections) {
        const qualityScore = calculateFaceQuality(detections, videoRef.current);
        setFaceDetected(true);
        setFaceQualityScore(qualityScore);
        
        if (qualityScore >= 70) {
          setFaceDetectionStatus('Good face position detected! Ready to capture.');
        } else if (qualityScore >= 50) {
          setFaceDetectionStatus('Face detected, adjust position for better quality.');
        } else {
          setFaceDetectionStatus('Please position your face in the center and closer to the camera.');
        }
      } else {
        setFaceDetected(false);
        setFaceQualityScore(0);
        setFaceDetectionStatus('No face detected. Please position your face in front of the camera.');
      }
    } catch (error) {
      console.error('Error detecting face:', error);
    }
  };
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        console.log('Face API models loaded successfully');
      } catch (error) {
        console.error('Error loading face API models:', error);
      }
    };
    
    loadModels();
  }, []);
  
  // Start face detection when capturing
  useEffect(() => {
    if (capturing && faceDetectionActive && videoRef.current && videoRef.current.readyState === 4) {
      // Start face detection interval
      const detectionInterval = setInterval(detectFaceInVideo, 300); // Detect every 300ms
      
      return () => {
        clearInterval(detectionInterval);
      };
    }
  }, [capturing, faceDetectionActive]);

  const captureFace = () => {
    // Check if videoRef and canvasRef are available
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas element not available');
      return;
    }

    const video = videoRef.current;
    
    // Check if video stream is available
    if (!video.srcObject) {
      console.error('Video stream not available');
      return;
    }
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 image
    const imageData = canvas.toDataURL('image/jpeg');
    
    // Add to face images array
    setFaceImages(prev => {
      const newImages = [...prev, imageData];
      // If we've reached 4 images, stop capturing
      if (newImages.length >= 4) {
        setCapturing(false);
        setCaptureCompleted(true);
        // Stop face detection when we're done
        setFaceDetectionActive(false);
      }
      return newImages;
    });
    
    // Automatically continue capturing if we haven't reached 4 images
    if (faceImages.length < 3) {
      // Keep capturing after a short delay
      setTimeout(() => {
        if (videoRef.current && videoRef.current.srcObject) {
          // Restart the video feed for next capture
          setCapturing(true);
        }
      }, 500);
    } else {
      // We've captured 4 images, stop the stream
      try {
        const stream = video.srcObject;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());
        }
      } catch (err) {
        console.error('Error stopping video stream:', err);
      }
    }
  };

  const removeFaceImage = (index) => {
    setFaceImages(prev => prev.filter((_, i) => i !== index));
  };

  const confirmFaceImages = () => {
    // Close the face capture modal and keep the captured images
    setShowFaceCapture(false);
    setCaptureCompleted(false);
    setFaceDetectionActive(false); // Stop face detection
    setFaceDetected(false);
    setFaceQualityScore(0);
    setFaceDetectionStatus('');
    
    // Stop any active video streams
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    } catch (err) {
      console.error('Error stopping video stream:', err);
    }
  };

  const closeFaceCapture = () => {
    setShowFaceCapture(false);
    setCapturing(false);
    setCaptureCompleted(false);
    setFaceDetectionActive(false); // Stop face detection
    setFaceDetected(false);
    setFaceQualityScore(0);
    setFaceDetectionStatus('');
    setFaceImages([]); // Clear images when canceling
    
    // Stop any active video streams
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('Stopping track:', track);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error('Error stopping video stream:', err);
    }
    
    // Clear any pending intervals or timeouts
    if (window.faceCaptureInterval) {
      clearInterval(window.faceCaptureInterval);
      window.faceCaptureInterval = null;
    }
    if (window.faceCaptureTimeout) {
      clearTimeout(window.faceCaptureTimeout);
      window.faceCaptureTimeout = null;
    }
  };

  // Face review functions
  const openFaceReview = (worker) => {
    setReviewWorker(worker);
    setReviewFaceImages(worker.faceData || []);
    setShowFaceReview(true);
  };

  const closeFaceReview = () => {
    setShowFaceReview(false);
    setReviewWorker(null);
    setReviewFaceImages([]);
    
    // Stop any active video streams in case they were started
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          console.log('Stopping track on review close:', track);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error('Error stopping video stream:', err);
    }
  };

  const removeReviewFaceImage = (index) => {
    setReviewFaceImages(prev => prev.filter((_, i) => i !== index));
  };

  const addReviewFaceImage = () => {
    // Close review modal and open capture modal
    setShowFaceReview(false);
    // Open capture with existing images
    setFaceImages(reviewFaceImages);
    setShowFaceCapture(true);
    setCapturing(false); // Start with capturing false, will be set to true when stream is ready
    setCaptureCompleted(false);
    
    // Ensure any existing stream is stopped first
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      } catch (err) {
        console.log('No existing stream to stop or error stopping tracks:', err);
      }
    }
  };

  const saveFaceReview = async () => {
    try {
      // Compress images before saving
      setError('Compressing images...');
      const compressedImages = await Promise.all(
        reviewFaceImages.map(image => compressImage(image, 0.7))
      );
      
      // Update worker with new face data
      await api.put(`/workers/${reviewWorker._id}`, {
        ...reviewWorker,
        faceData: compressedImages
      });
      
      setError('');
      setSuccess('Face images updated successfully');
      closeFaceReview();
      fetchWorkers(); // Refresh the list
    } catch (err) {
      console.error(err);
      setError('Failed to update face images');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email) {
      setError('Name and Email are required');
      return;
    }
    
    if (!isEditing && !formData.password) {
      setError('Password is required for new workers');
      return;
    }
    
    try {
      // Prepare data for submission
      const submitData = {
        name: formData.name,
        email: formData.email,
        department: formData.department || null,
        salary: formData.salary !== '' ? Number(formData.salary) : null, // Convert salary to number or null
        rfid: formData.rfid || null, // Include RFID if provided
        batch: selectedBatch || null // Include batch if selected
      };
      
      // Add password only if it's provided (for both create and update)
      if (formData.password) {
        submitData.password = formData.password;
      }
      
      // Add face data
      if (faceImages.length > 0) {
        submitData.faceData = faceImages;
      }
      
      if (isEditing) {
        // Update existing worker
        await api.put(`/workers/${editingWorkerId}`, submitData);
        setSuccess('Worker updated successfully');
      } else {
        // Add password for new workers
        if (!formData.password) {
          throw new Error('Password is required for new workers');
        }
        submitData.password = formData.password;
        
        // Create new worker
        await api.post('/workers', submitData);
        setSuccess('Worker created successfully');
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        department: '',
        salary: '',
        rfid: '',
        batch: '' // Reset batch field
      });
      
      setIsEditing(false);
      setEditingWorkerId(null);
      setShowModal(false);
      setFaceImages([]);
      fetchWorkers(); // Refresh the list
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} worker`);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openCreateModal = () => {
    // Reload batches to ensure we have the latest data
    loadBatches();
    
    setFormData({
      name: '',
      email: '',
      password: '',
      department: '',
      salary: '',
      rfid: generateRFID(), // Generate RFID when opening modal
      batch: '' // Reset batch field
    });
    setFaceImages([]);
    setIsEditing(false);
    setEditingWorkerId(null);
    setShowModal(true);
    // Reset batch selection
    setSelectedBatch('');
  };
  
  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingWorkerId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      department: '',
      salary: '',
      rfid: '',
      batch: '' // Reset batch field
    });
    setError('');
    setSuccess('');
    setFaceImages([]);
    // Reset batch selection
    setSelectedBatch('');
  };

  const handleEdit = (worker) => {
    // Reload batches to ensure we have the latest data
    loadBatches();
    
    setFormData({
      name: worker.name,
      email: worker.email,
      password: '', // Don't prefill password for security
      department: worker.department?._id || '',
      salary: worker.salary !== undefined && worker.salary !== null ? worker.salary.toString() : '', // Include salary if exists
      rfid: worker.rfid || '', // Include RFID if exists
      batch: worker.batch?._id || '' // Include batch if exists
    });
    
    // Set face images if available
    if (worker.faceData && Array.isArray(worker.faceData)) {
      setFaceImages(worker.faceData);
    } else if (worker.faceData) {
      // Handle case where faceData is a single string (backward compatibility)
      setFaceImages([worker.faceData]);
    } else {
      setFaceImages([]);
    }
    
    setIsEditing(true);
    setEditingWorkerId(worker._id);
    setShowModal(true);
    // Set the selected batch to the worker's batch
    setSelectedBatch(worker.batch?._id || '');
  };
  // Generate RFID with 2 letters + 4 digits format
  const generateRFID = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
    const digits = Math.floor(1000 + Math.random() * 9000); // 4-digit number between 1000-9999
    return `${letter1}${letter2}${digits}`;
  };

  // RFID Functions
  // const openRFIDModal = () => {
  //   setShowRFIDModal(true);
  //   setScanningRFID(true);
  //   setRfidInput('');
  // };

  const closeRFIDModal = () => {
    setShowRFIDModal(false);
    setScanningRFID(false);
    setRfidInput('');
  };

  const handleRFIDScan = (e) => {
    setRfidInput(e.target.value);
    
    // Auto-submit when RFID is scanned (assuming RFID scanners append Enter key)
    if (e.key === 'Enter' && e.target.value) {
      recordRFIDAttendance(e.target.value);
    }
  };

  const recordRFIDAttendance = async (rfid) => {
    try {
      setScanningRFID(false);
      const response = await axios.post('/api/workers/attendance', {
        rfid,
        method: 'checkIn'
      });
      
      setSuccess(`Attendance recorded for ${response.data.attendanceRecord.workerName || 'worker'}`);
      closeRFIDModal();
      fetchWorkers(); // Refresh the list
    } catch (err) {
      console.error(err);
      setError('Failed to record attendance');
      setScanningRFID(false);
    }
  };

  const manualRFIDSubmit = () => {
    if (rfidInput) {
      recordRFIDAttendance(rfidInput);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        await axios.delete(`/api/workers/${id}`);
        fetchWorkers(); // Refresh the list
        setSuccess('Worker deleted successfully');
      } catch (err) {
        console.error(err);
        setError('Failed to delete worker');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading workers...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Workers Management</h2>
          <p className="text-gray-600">Manage your repair shop workers</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Add New Worker
        </button>
      </div>

      {error && !showModal && !showFaceCapture && !showFaceReview && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && !showModal && !showFaceCapture && !showFaceReview && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* RFID Modal */}
      {showRFIDModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                RFID Attendance
              </h3>
              <button
                onClick={closeRFIDModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {scanningRFID ? (
                <div className="text-center">
                  <div className="mx-auto bg-gray-200 rounded-full p-4 w-24 h-24 flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">Scan your RFID card or enter RFID manually</p>
                  <input
                    type="text"
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    onKeyPress={handleRFIDScan}
                    placeholder="Enter RFID"
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                    autoFocus
                  />
                  <button
                    onClick={manualRFIDSubmit}
                    disabled={!rfidInput}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    Submit RFID
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Recording attendance...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Worker' : 'Add New Worker'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
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
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. john@example.com"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isEditing ? 'New Password (optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
                    required={!isEditing}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Salary Field */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary (₹)
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none hide-spinner"
                    placeholder="Enter salary"
                    onWheel={(e) => e.target.blur()} // Disable scroll wheel
                    min="0"
                  />
                  {/* Hide spinner for number input */}
                  <style>
                    {`
                      .hide-spinner::-webkit-outer-spin-button,
                      .hide-spinner::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }
                      .hide-spinner {
                        -moz-appearance: textfield;
                      }
                    `}
                  </style>
                </div>
                
                {/* RFID Field */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFID
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      name="rfid"
                      value={formData.rfid}
                      onChange={handleChange}
                      className="flex-1 border border-gray-300 px-3 py-2 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-100"
                      placeholder="RFID"
                      readOnly={isEditing} // Read-only when editing
                    />
                    {!isEditing && ( // Only show generate button when creating new worker
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, rfid: generateRFID()})}
                        className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-r-lg text-gray-700 font-medium transition"
                      >
                        Generate
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Unique RFID in format: 2 letters + 4 digits (e.g., AB1234)
                  </p>
                </div>
                
                {/* Batch Selection Section */}
                <div className="md:col-span-2 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Batch
                    </label>
                    <span className="text-xs text-gray-500 italic">
                      {isEditing ? "Current worker's batch" : "Assign batch to worker"}
                    </span>
                  </div>
                  <select
                    value={selectedBatch}
                    onChange={handleBatchChange}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select a Batch</option>
                    {availableBatches.map(batch => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name} ({batch.workingTime.from} - {batch.workingTime.to})
                      </option>
                    ))}
                  </select>
                  
                  {/* Display selected batch times if any */}
                  {selectedBatch && (() => {
                    const batch = availableBatches.find(b => b._id === selectedBatch);
                    return batch ? (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-800">Selected Batch: {batch.name}</div>
                        <div className="text-xs text-blue-600 mt-1">
                          <div>Working Hours: {batch.workingTime.from} - {batch.workingTime.to}</div>
                          {batch.lunchTime?.enabled && (
                            <div>Lunch: {batch.lunchTime.from} - {batch.lunchTime.to}</div>
                          )}
                          {batch.breakTime?.enabled && (
                            <div>Break: {batch.breakTime.from} - {batch.breakTime.to}</div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
                
                {/* Face Capture Section for Multiple Images */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Face Enrollment ({faceImages.length}/4 images)
                  </label>
                  
                  {/* Display captured images */}
                  {faceImages.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {faceImages.map((image, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={image} 
                              alt={`Face ${index + 1}`} 
                              className="w-full h-24 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeFaceImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Capture button - only show if we haven't reached 4 images */}
                  {faceImages.length < 4 ? (
                    <button
                      type="button"
                      onClick={startFaceCapture}
                      className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition"
                    >
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <span className="mt-2 text-sm text-gray-600">Click to capture face ({4 - faceImages.length} remaining)</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 text-green-600 font-medium">
                      Maximum of 4 face images captured
                    </div>
                  )}
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
                >
                  {isEditing ? 'Update Worker' : 'Create Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face Capture Modal - Positioned over everything with higher z-index */}
      {showFaceCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Capture Face ({faceImages.length}/4)
              </h3>
              <button
                onClick={closeFaceCapture}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-6">
              {captureCompleted ? (
                // Show confirmation screen with all captured images
                <div className="text-center">
                  <h4 className="text-lg font-medium mb-4">Confirm Face Images</h4>
                  <p className="mb-4 text-gray-600">Review the captured images below:</p>
                  
                  {/* Display all captured images for review */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {faceImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={image} 
                          alt={`Captured Face ${index + 1}`} 
                          className="w-full h-24 object-cover rounded border"
                        />
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={closeFaceCapture}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                      Retake All
                    </button>
                    <button
                      onClick={confirmFaceImages}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      Confirm Images
                    </button>
                  </div>
                </div>
              ) : capturing ? (
                // Show camera capture screen
                <div className="text-center">
                  <div className="relative mx-auto mb-4">
                    <video 
                      ref={setVideoRef} // Use callback ref instead of direct ref
                      autoPlay 
                      playsInline 
                      className="w-full rounded-lg border-2 border-gray-300 max-h-64"
                      style={{ display: 'block', minWidth: '300px', minHeight: '200px' }} // Ensure it has a proper size
                      onLoadedData={() => {
                        console.log('Video element loaded data');
                      }}
                      id="face-capture-video" // Add an ID for direct access
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {/* Visual feedback for face position */}
                    {faceDetected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div 
                          className={`rounded-full border-2 ${faceQualityScore >= 70 ? 'border-green-500' : faceQualityScore >= 50 ? 'border-yellow-500' : 'border-red-500'}`}
                          style={{
                            width: `${Math.min(80, Math.max(40, faceQualityScore * 0.6))}%`,
                            height: `${Math.min(80, Math.max(40, faceQualityScore * 0.6))}%`,
                            maxWidth: '250px',
                            maxHeight: '250px'
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Face detection status */}
                  <div className="mb-4">
                    <p className={`font-medium ${faceQualityScore >= 70 ? 'text-green-600' : faceQualityScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {faceDetectionStatus || 'Initializing face detection...'}
                    </p>
                    {faceDetected && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${faceQualityScore >= 70 ? 'bg-green-600' : faceQualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-600'}`}
                            style={{ width: `${faceQualityScore}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Face Quality: {faceQualityScore}%</p>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={captureFace}
                    disabled={!capturing || faceQualityScore < 60}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${faceQualityScore >= 60 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    Capture Face {faceImages.length + 1}/4
                  </button>
                  <p className="mt-2 text-sm text-gray-600">
                    Captured: {faceImages.length} of 4 images
                  </p>
                </div>
              ) : (
                // Show loading/waiting state
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Preparing camera...</p>
                  {/* Add a manual trigger button for camera access */}
                  <button
                    onClick={() => {
                      // Try to access camera manually
                      console.log('Manual camera access requested. Current videoRef:', videoRef.current);
                      
                      // First check if ref is available
                      let videoElement = videoRef.current;
                      
                      // If not, try to find it directly in the DOM
                      if (!videoElement) {
                        console.log('Video ref not available, trying to find in DOM...');
                        videoElement = document.getElementById('face-capture-video');
                        if (videoElement) {
                          console.log('Found video element in DOM:', videoElement);
                          // Update the ref
                          videoRef.current = videoElement;
                        }
                      }
                      
                      if (!videoElement) {
                        // Try to force the ref to be set by re-rendering
                        console.error('Video element not available for manual access');
                        setError('Camera element not available. Please wait a moment and try again.');
                        return;
                      }
                      
                      const constraints = { video: { facingMode: 'user' } };
                      navigator.mediaDevices.getUserMedia(constraints)
                        .then(stream => {
                          videoElement.srcObject = stream;
                          setCapturing(true);
                        })
                        .catch(err => {
                          console.error('Manual camera access failed:', err);
                          let errorMessage = 'Could not access camera. ';
                          if (err.name === 'NotAllowedError') {
                            errorMessage += 'Please grant camera permission when prompted.';
                          } else {
                            errorMessage += 'Please ensure you have given permission and that your camera is not in use.';
                          }
                          setError(errorMessage);
                        });
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Request Camera Access
                  </button>
                  <button
                    onClick={closeFaceCapture}
                    className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Face Review Modal */}
      {showFaceReview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Face Enrollment for {reviewWorker?.name}
              </h3>
              <button
                onClick={closeFaceReview}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-6">
              {reviewFaceImages.length > 0 ? (
                <div>
                  <p className="mb-4 text-gray-600">Review the enrolled face images below:</p>
                  
                  {/* Display all enrolled images */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {reviewFaceImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={image} 
                          alt={`Enrolled Face ${index + 1}`} 
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeReviewFaceImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add more images if less than 4 */}
                  {reviewFaceImages.length < 4 && (
                    <button
                      onClick={addReviewFaceImage}
                      className="w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition mb-6"
                    >
                      <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      <span className="text-gray-600">Add More Images ({4 - reviewFaceImages.length} remaining)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <p className="text-gray-600 mb-4">No face images enrolled for this worker</p>
                  <button
                    onClick={addReviewFaceImage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Enroll Face Images
                  </button>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeFaceReview}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                {reviewFaceImages.length > 0 && (
                  <button
                    onClick={saveFaceReview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <div className="border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-semibold">
            Workers List ({workers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportWorkers(api, 'pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm"
            >
              Export PDF
            </button>
            <button
              onClick={() => exportWorkers(api, 'excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition text-sm"
            >
              Export Excel
            </button>
          </div>
        </div>
        {workers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No workers found. Click "Add New Worker" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (₹)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workers.map((worker) => (

                  <tr key={worker._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.salary && !isNaN(worker.salary) ? `₹${worker.salary}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.department ? worker.department.name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.rfid || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center">
                      {/* Face Enrollment Status Indicator */}
                      <button
                        onClick={() => openFaceReview(worker)}
                        className="mr-3 text-gray-500 hover:text-gray-700"
                      >
                        {worker.faceData && worker.faceData.length > 0 ? (
                          // Camera icon with tick for enrolled workers
                          <div className="relative">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <svg className="w-3 h-3 text-green-500 absolute -bottom-1 -right-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        ) : (
                          // Camera icon with cross for non-enrolled workers
                          <div className="relative">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <svg className="w-3 h-3 text-red-500 absolute -bottom-1 -right-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleEdit(worker)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(worker._id)}
                        className="text-red-600 hover:text-red-900"
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

export default Workers;