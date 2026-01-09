import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

// Import EmployeeSidebar
import EmployeeSidebar from '../components/EmployeeSidebar';

// Import face-api.js
import * as faceapi from 'face-api.js';

const WorkerAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Location validation states
  const [locationValid, setLocationValid] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [distanceFromSite, setDistanceFromSite] = useState(0); // New state for distance
  
  // Modal states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  
  // Face recognition states
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('idle');
  const [faceError, setFaceError] = useState('');
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const workerDescriptorsRef = useRef([]);
  const cooldownIntervalRef = useRef(null);
  
  // RFID states
  const [rfidInput, setRfidInput] = useState('');
  const [scanningRFID, setScanningRFID] = useState(false);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('employee');
    // Close sidebar on mobile when logging out
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    navigate('/employee/login');
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Cleanup function to clear intervals
  useEffect(() => {
    return () => {
      // Clear any active cooldown timers
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Function to group attendance records by date and maintain proper in/out pairs
  const groupAttendanceByDate = (records) => {
    if (!records || !Array.isArray(records)) return {};
    
    const grouped = {};
    records.forEach(record => {
      const dateKey = new Date(record.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      // Add the complete record as a pair (or partial pair)
      grouped[dateKey].push(record);
    });
    
    // Sort each day's records by date/time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        const timeA = new Date(a.checkIn || a.checkOut || a.date);
        const timeB = new Date(b.checkIn || b.checkOut || b.date);
        return timeA - timeB; // Sort by time ascending
      });
    });
    
    return grouped;
  };
  


  // Calculate duration between check-in and check-out
  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';
    
    const inTime = new Date(checkIn);
    const outTime = new Date(checkOut);
    const diffMs = outTime - inTime;
    
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Close Face Modal
  const closeFaceModal = useCallback(() => {
    setShowFaceModal(false);
    setFaceDetectionStatus('idle');
    setFaceError('');
    workerDescriptorsRef.current = [];
    
    // Clean up video stream
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Close RFID Modal
  const closeRFIDModal = useCallback(() => {
    setShowRFIDModal(false);
    setScanningRFID(false);
    setRfidInput('');
  }, []);

  // Fetch attendance records for the worker
  const fetchAttendanceRecords = useCallback(async (workerId) => {
    try {
      const res = await api.get(`/workers/${workerId}`);
      const workerData = res.data;
      
      // Process attendance records
      if (workerData.attendanceRecords && Array.isArray(workerData.attendanceRecords)) {
        // Sort by date and time descending (latest first)
        const sortedRecords = [...workerData.attendanceRecords].sort((a, b) => {
          // Sort primarily by date
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateB - dateA; // Sort by date descending
          }
          // If same date, sort by checkIn time first, then checkOut time
          const timeA = new Date(a.checkIn || a.checkOut || a.date);
          const timeB = new Date(b.checkIn || b.checkOut || b.date);
          return timeB - timeA; // Sort by time descending
        });
        setAttendanceRecords(sortedRecords);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch attendance records');
    }
  }, []);

  // Validate worker location against admin settings
  const validateLocation = useCallback(async () => {
    try {
      // Get admin location settings
      const settingsRes = await api.get('/admin/public-location-settings');
      const { enabled, latitude, longitude, radius } = settingsRes.data;
      
      // Check if location settings are enabled and configured
      if (!enabled || !latitude || !longitude || !radius) {
        setLocationValid(false);
        setLocationChecked(true);
        setLocationError('Location settings not configured by admin');
        return;
      }
      
      // Get worker's current location
      if (!navigator.geolocation) {
        setLocationValid(false);
        setLocationChecked(true);
        setLocationError('Geolocation is not supported by your browser');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const workerLat = position.coords.latitude;
          const workerLng = position.coords.longitude;
          
          // Calculate distance using Haversine formula
          const distance = calculateDistance(latitude, longitude, workerLat, workerLng);
          setDistanceFromSite(distance/1000); // Store distance in km
          
          // Check if within allowed radius
          if (distance <= radius) {
            setLocationValid(true);
            setLocationError('');
          } else {
            setLocationValid(false);
            setLocationError(`You are outside the allowed attendance location. Distance: ${(distance/1000).toFixed(2)} km from site.`);
          }
          setLocationChecked(true);
        },
        (err) => {
          setLocationValid(false);
          setLocationChecked(true);
          // Handle different types of geolocation errors
          switch(err.code) {
            case err.PERMISSION_DENIED:
              setLocationError('Location permission denied. Please enable location access to use attendance features.');
              break;
            case err.POSITION_UNAVAILABLE:
              setLocationError('Location information is unavailable. Please check your device location settings and try again.');
              break;
            case err.TIMEOUT:
              setLocationError('Location request timed out. Please try again.');
              break;
            default:
              setLocationError('Unable to retrieve your location. Please check your device location settings and try again.');
              break;
          }
          console.error('Geolocation error:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    } catch (err) {
      console.error('Location validation error:', err);
      setLocationValid(false);
      setLocationChecked(true);
      setLocationError('Unable to validate location. Please try again.');
    }
  }, []);

  // State for cooldown timer
  const [cooldownRemainingTime, setCooldownRemainingTime] = useState(0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  
  // Record face attendance
  const recordFaceAttendance = useCallback(async () => {
    try {
      await api.post('/workers/attendance', {
        workerId: worker._id,
        method: 'face'
      });
      setSuccess('Attendance recorded successfully!');
    } catch (err) {
      console.error('Error recording attendance:', err);
      if (err.response?.data?.reason === 'COOLDOWN_ACTIVE') {
        const remainingTime = err.response.data.remainingTime;
        setCooldownRemainingTime(remainingTime);
        setIsCooldownActive(true);
        
        // Update UI to reflect cooldown state
        setFaceError(`Please wait ${remainingTime} seconds before next punch`);
        setFaceDetectionStatus('cooldown');
        
        // Clear the face detection interval to stop face recognition during cooldown
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
        
        // Start countdown timer
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownRemainingTime(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
                cooldownIntervalRef.current = null;
              }
              setIsCooldownActive(false);
              setFaceDetectionStatus('camera_ready');
              setFaceError('');
              
              // Restart face detection after cooldown ends
              setTimeout(() => {
                if (faceModelsLoaded && worker && !isCooldownActive) {
                  // Restart face detection if still in the right state
                  if (faceDetectionStatus === 'camera_ready' || faceDetectionStatus === 'detecting') {
                    if (detectionIntervalRef.current) {
                      clearInterval(detectionIntervalRef.current);
                    }
                    detectionIntervalRef.current = setInterval(detectFace, 100);
                    setFaceDetectionStatus('detecting');
                  }
                }
              }, 100); // Small delay to ensure state is settled
              
              return 0;
            }
            // Update error message with new remaining time
            setFaceError(`Please wait ${newTime} seconds before next punch`);
            return newTime;
          });
        }, 1000);
      } else {
        setError('Failed to record attendance');
        setFaceError('Failed to record attendance');
      }
    }
  }, [worker]);

  // Record RFID attendance
  const recordRFIDAttendance = useCallback(async (rfid) => {
    try {
      const response = await api.post('/workers/attendance', {
        rfid,
        method: 'rfid'
      });
      
      setSuccess(`Attendance recorded for ${response.data.attendanceRecord.workerName || 'worker'}`);
      closeRFIDModal();
      // Refresh attendance records
      fetchAttendanceRecords(worker._id);
    } catch (err) {
      console.error('Error recording RFID attendance:', err);
      if (err.response?.data?.reason === 'COOLDOWN_ACTIVE') {
        const remainingTime = err.response.data.remainingTime;
        setCooldownRemainingTime(remainingTime);
        setError(`Please wait ${remainingTime} seconds before next punch`);
        setIsCooldownActive(true);
        
        // Start countdown timer
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownRemainingTime(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
                cooldownIntervalRef.current = null;
              }
              setIsCooldownActive(false);
              setError('');
              return 0;
            }
            setError(`Please wait ${newTime} seconds before next punch`);
            return newTime;
          });
        }, 1000);
      } else {
        setError('Failed to record attendance');
      }
    }
  }, [worker, fetchAttendanceRecords, closeRFIDModal]);

  // Handle RFID input
  const handleRFIDInput = useCallback((e) => {
    setRfidInput(e.target.value);
    
    // Auto-submit when RFID is scanned (assuming RFID scanners append Enter key)
    if (e.key === 'Enter' && e.target.value) {
      recordRFIDAttendance(e.target.value);
    }
  }, [recordRFIDAttendance]);

  // Handle manual RFID submission
  const handleManualRFIDSubmit = useCallback(() => {
    if (rfidInput) {
      recordRFIDAttendance(rfidInput);
    }
  }, [rfidInput, recordRFIDAttendance]);

  // Draw circular frame on canvas
  const drawFrame = (canvas) => {
    if (!canvas) return;
      
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
      
    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      
    // Draw circular frame
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
      
    // Draw center marker
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.fill();
  };
  
  // Check if face is within the circular frame
  const isFaceInFrame = (detection, canvas) => {
    if (!detection || !canvas) return false;
      
    const box = detection.detection || detection.box;
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    const frameRadius = Math.min(canvas.width, canvas.height) * 0.3;
      
    // Calculate face center
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
      
    // Calculate distance from face center to canvas center
    const distance = Math.sqrt(
      Math.pow(faceCenterX - canvasCenterX, 2) + 
      Math.pow(faceCenterY - canvasCenterY, 2)
    );
      
    // Check if face is within the circular frame with size requirements
    return distance <= frameRadius && 
           box.width >= canvas.width * 0.25 &&
           box.height >= canvas.height * 0.25 &&
           box.width <= canvas.width * 0.7 &&
           box.height <= canvas.height * 0.7;
  };
    
  // Detect face with quality validation
  const detectFace = useCallback(async () => {
    // Check if we're currently in cooldown
    if (isCooldownActive) {
      return; // Don't attempt to detect face during cooldown
    }
      
    if (!videoRef.current || !canvasRef.current || workerDescriptorsRef.current.length === 0) {
      return;
    }
      
    const video = videoRef.current;
    const canvas = canvasRef.current;
      
    try {
      // Get video dimensions
      const displaySize = { 
        width: video.videoWidth || video.width || 640, 
        height: video.videoHeight || video.height || 480 
      };
        
      // Set canvas dimensions
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;
        
      // Draw circular frame
      drawFrame(canvas);
        
      // Detect face
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.7,
          maxResults: 1
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();
        
      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
        // Check if face is within the circular frame
        if (!isFaceInFrame(resizedDetections, canvas)) {
          setFaceError('Please position your face within the circular frame.');
          return;
        } else {
          setFaceError(''); // Clear error when face is properly positioned
        }
          
        // Draw face detection
        try {
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        } catch (drawError) {
          console.warn('Error drawing face detection:', drawError);
        }
          
        // Compare with stored descriptors
        const faceMatcher = new faceapi.FaceMatcher(workerDescriptorsRef.current);
        const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
          
        if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.6) {
          // Face recognized, record attendance
          // Clear the detection interval to prevent multiple triggers
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
          }
          setFaceDetectionStatus('recognized');
                  
          // Record attendance
          await recordFaceAttendance();
                  
          // Close modal after delay
          setTimeout(() => {
            closeFaceModal();
            // Refresh attendance records
            fetchAttendanceRecords(worker._id);
          }, 2000);
        }
      } else {
        setFaceError('No face detected. Please position your face within the frame.');
      }
    } catch (err) {
      console.error('Error during face detection:', err);
      setFaceError('Error detecting face. Please try again.');
    }
  }, [worker, fetchAttendanceRecords, recordFaceAttendance, closeFaceModal, isCooldownActive]);

  // Start face recognition
  const startFaceRecognition = useCallback(async () => {
    if (!faceModelsLoaded || !worker) return;
      
    try {
      setFaceDetectionStatus('camera_ready');
      setFaceError(''); // Clear any previous errors
        
      // Get worker's face data
      const faceDataRes = await api.get(`/workers/${worker._id}/face-data`);
      const faceImages = faceDataRes.data.faceImages || [];
        
      if (!faceImages || faceImages.length === 0) {
        setFaceDetectionStatus('error');
        return;
      }
        
      // Load face descriptors
      const descriptors = [];
      for (const imageData of faceImages) {
        const img = new Image();
        img.src = imageData;
        await new Promise(resolve => {
          img.onload = resolve;
        });
          
        const detection = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
          
        if (detection) {
          descriptors.push(detection.descriptor);
        }
      }
        
      workerDescriptorsRef.current = descriptors;
        
      // Access camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
        
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setFaceDetectionStatus('detecting');
          
        // Start detection interval
        detectionIntervalRef.current = setInterval(detectFace, 100);
      }
    } catch (err) {
      console.error('Error starting face recognition:', err);
      setFaceDetectionStatus('error');
    }
  }, [faceModelsLoaded, worker, detectFace]);

  // Fetch worker data
  useEffect(() => {
    const fetchWorkerData = async () => {
      try {
        const res = await api.get(`/workers/${id}`);
        setWorker(res.data);
        await fetchAttendanceRecords(res.data._id);
        await validateLocation();
      } catch (err) {
        console.error(err);
        setError('Failed to fetch worker data');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerData();
  }, [id, fetchAttendanceRecords, validateLocation]);

  // Load face recognition models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setFaceModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face models:', err);
        setFaceDetectionStatus('error');
      }
    };

    if (showFaceModal) {
      loadModels();
    }
  }, [showFaceModal]);

  // Effect to start face recognition when modal opens and models are loaded
  useEffect(() => {
    if (showFaceModal && faceModelsLoaded && (faceDetectionStatus === 'loading' || faceDetectionStatus === 'camera_ready')) {
      startFaceRecognition();
    }
  }, [showFaceModal, faceModelsLoaded, faceDetectionStatus, startFaceRecognition]);

  // Handle Face Attendance button click
  const handleFaceAttendance = () => {
    if (!locationValid) return;
    setShowFaceModal(true);
    setFaceDetectionStatus('loading');
    
    // If models aren't loaded yet, trigger loading
    if (!faceModelsLoaded) {
      const loadModels = async () => {
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
          await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
          await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
          setFaceModelsLoaded(true);
        } catch (err) {
          console.error('Error loading face models:', err);
          setFaceDetectionStatus('error');
        }
      };
      loadModels();
    }
  };

  // Handle RFID Attendance button click
  const handleRFIDAttendance = () => {
    if (!locationValid) return;
    setShowRFIDModal(true);
    setScanningRFID(true);
    setRfidInput('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-center">
          <div className="text-xl">Loading attendance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Error</h3>
              <p className="mt-2 text-gray-500">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
                <p className="text-gray-600">Track your attendance records</p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-2">
                <button
                  onClick={handleFaceAttendance}
                  disabled={!locationValid || !locationChecked}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center ${
                    locationValid && locationChecked
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Face Attendance
                </button>
                <button
                  onClick={handleRFIDAttendance}
                  disabled={!locationValid || !locationChecked}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center ${
                    locationValid && locationChecked
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  RFID Attendance
                </button>
              </div>
            </div>
            
            {/* Success/Error Messages */}
            {success && (
              <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg">
                {success}
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
                {error}
              </div>
            )}
            
            {/* Location validation message */}
            {!locationChecked ? (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
                Checking your location...
              </div>
            ) : !locationValid ? (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg">
                {locationError || 'You are outside the allowed attendance location. Attendance is disabled.'}
              </div>
            ) : (
              <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg">
                You are within the allowed attendance location. Distance: {distanceFromSite.toFixed(2)} km from site.
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4">
          {/* Attendance Records Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-semibold">Your Attendance Records</h3>
            </div>
            {attendanceRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No attendance records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Group records by date */}
                {(() => {
                  const groupedRecords = groupAttendanceByDate(attendanceRecords);
                  const sortedDates = Object.keys(groupedRecords).sort((a, b) => new Date(b) - new Date(a));
                  
                  return (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Methods Used</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedDates.map(dateStr => {
                          const dailyRecords = groupedRecords[dateStr];
                          
                          // Collect all check-in and check-out times for the day
                          const allCheckIns = [];
                          const allCheckOuts = [];
                          const allMethods = new Set();
                          
                          dailyRecords.forEach(record => {
                            if (record.checkIn) {
                              allCheckIns.push({ time: record.checkIn, method: record.method });
                              allMethods.add(record.method);
                            }
                            if (record.checkOut) {
                              allCheckOuts.push({ time: record.checkOut, method: record.method });
                              allMethods.add(record.method);
                            }
                          });
                          
                          // Sort times chronologically
                          allCheckIns.sort((a, b) => new Date(a.time) - new Date(b.time));
                          allCheckOuts.sort((a, b) => new Date(a.time) - new Date(b.time));
                          
                          // Calculate duration based on paired check-ins and check-outs
                          let totalMilliseconds = 0;
                          for (let i = 0; i < Math.min(allCheckIns.length, allCheckOuts.length); i++) {
                            const inTime = new Date(allCheckIns[i].time);
                            const outTime = new Date(allCheckOuts[i].time);
                            if (outTime > inTime) {
                              totalMilliseconds += outTime - inTime;
                            }
                          }
                          
                          const totalSeconds = Math.floor(totalMilliseconds / 1000);
                          const hours = Math.floor(totalSeconds / 3600);
                          const minutes = Math.floor((totalSeconds % 3600) / 60);
                          const seconds = totalSeconds % 60;
                          const dailyDuration = `${hours}h ${minutes}m ${seconds}s`;
                          
                          return (
                            <tr key={dateStr}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(new Date(dateStr))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {allCheckIns.length > 0 ? (
                                  <div className="flex flex-col space-y-1">
                                    {allCheckIns.map((entry, idx) => (
                                      <span key={idx} className="text-green-600 font-medium">
                                        {formatTime(entry.time)}
                                        <span className="text-xs ml-1 text-gray-500">
                                          ({entry.method === 'face' ? 'Face' : entry.method === 'rfid' ? 'RFID' : entry.method})
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">--:-- --</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {allCheckOuts.length > 0 ? (
                                  <div className="flex flex-col space-y-1">
                                    {allCheckOuts.map((entry, idx) => (
                                      <span key={idx} className="text-red-600 font-medium">
                                        {formatTime(entry.time)}
                                        <span className="text-xs ml-1 text-gray-500">
                                          ({entry.method === 'face' ? 'Face' : entry.method === 'rfid' ? 'RFID' : entry.method})
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">--:-- --</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {dailyDuration}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(allMethods).map(method => (
                                    <span key={method} className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      method === 'face' 
                                        ? 'bg-green-100 text-green-800' 
                                        : method === 'rfid' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {method === 'face' ? 'Face' : method === 'rfid' ? 'RFID' : method}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Face Attendance Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Face Attendance
              </h3>
              <button
                onClick={closeFaceModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-6">
              {faceDetectionStatus === 'loading' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading face recognition...</p>
                </div>
              )}
              
              {faceDetectionStatus === 'camera_ready' && (
                <div className="text-center">
                  <div className="relative mx-auto mb-4">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      className="w-full rounded-lg border-2 border-gray-300 max-h-64"
                    />
                    <canvas 
                      ref={canvasRef} 
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Position your face in the frame
                  </p>
                </div>
              )}
              
              {faceDetectionStatus === 'detecting' && (
                <div className="text-center">
                  <div className="relative mx-auto mb-4">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      className="w-full rounded-lg border-2 border-green-500 max-h-64"
                    />
                    <canvas 
                      ref={canvasRef} 
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Position your face within the frame
                  </p>
                  {faceError && (
                    <p className="text-sm text-red-600 mt-2">
                      {faceError}
                    </p>
                  )}
                </div>
              )}
              
              {faceDetectionStatus === 'recognized' && (
                <div className="text-center py-8">
                  <div className="mx-auto bg-green-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">Face recognized successfully!</p>
                  <p className="text-sm text-gray-500">Recording attendance...</p>
                </div>
              )}
              
              {faceDetectionStatus === 'error' && (
                <div className="text-center py-8">
                  <div className="mx-auto bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">Face recognition failed</p>
                  <button
                    onClick={() => setFaceDetectionStatus('camera_ready')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {faceDetectionStatus === 'cooldown' && (
                <div className="text-center py-8">
                  <div className="mx-auto bg-yellow-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">Cooldown in effect</p>
                  <p className="text-sm text-gray-500">Please wait before attempting to punch again</p>
                  <div className="mt-4 text-lg font-semibold text-yellow-700">
                    {cooldownRemainingTime > 0 && `Time remaining: ${cooldownRemainingTime}s`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RFID Attendance Modal */}
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
                    onKeyPress={handleRFIDInput}
                    placeholder="Enter RFID"
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                    autoFocus
                  />
                  <button
                    onClick={handleManualRFIDSubmit}
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
    </div>
  );
};

export default WorkerAttendance;