import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { exportAttendance } from '../utils/reportUtils';

// Import face-api.js
import * as faceapi from 'face-api.js';

const Attendance = () => {
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
  const [cooldownTimer, setCooldownTimer] = useState(null); // For displaying cooldown timer
  
  // RFID Modal states
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [rfidInput, setRfidInput] = useState('');
  const [scanningRFID, setScanningRFID] = useState(false);
  
  // Face Recognition Modal states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('idle'); // idle, loading, camera_ready, detecting, recognized, error
  
  // Confirmation Modal states
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [workerForPunch, setWorkerForPunch] = useState(null);
  const [isPunchIn, setIsPunchIn] = useState(true); // true for punch in, false for punch out
  
  // Recently marked workers tracking (to prevent multiple marks within 1 minute)
  const [recentlyMarkedWorkers, setRecentlyMarkedWorkers] = useState({});
  
  // Currently matched worker for cooldown display
  const [matchedWorker, setMatchedWorker] = useState(null);
  
  // Workers currently on cooldown (to prevent continuous detection during cooldown)
  const [workersOnCooldown, setWorkersOnCooldown] = useState(new Set());
  
  const navigate = useNavigate();
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const workerDescriptorsRef = useRef([]);

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch workers
  useEffect(() => {
    const fetchWorkersWrapper = async () => {
      await fetchWorkers();
    };
    fetchWorkersWrapper();
  }, []);


  
  // Handle cooldown timer updates
  useEffect(() => {
    let timer;
    
    if (cooldownTimer) {
      timer = setInterval(() => {
        setCooldownTimer(prev => {
          if (!prev) return null;
          
          const newRemainingTime = prev.endTime - Date.now();
          
          // If timer has expired, clear it and remove worker from cooldown set
          if (newRemainingTime <= 0) {
            console.log(`Cooldown timer expired for worker ${prev.workerId}`);
            // Remove worker from cooldown set
            setWorkersOnCooldown(prevSet => {
              const newSet = new Set(prevSet);
              newSet.delete(prev.workerId);
              return newSet;
            });
            return null;
          }
          
          return {
            ...prev,
            remainingTime: newRemainingTime
          };
        });
      }, 1000);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [cooldownTimer]);

  // Add cleanup effect for expired cooldowns
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Clean up expired cooldowns from the Set
      setWorkersOnCooldown(prev => {
        // If there's no timer, we don't need to check anything
        if (!cooldownTimer) return prev;
        
        // If timer has expired, return an empty Set
        if (cooldownTimer.endTime - Date.now() <= 0) {
          console.log(`Cleaning up expired cooldown for worker ${cooldownTimer.workerId}`);
          const newSet = new Set(prev);
          newSet.delete(cooldownTimer.workerId);
          return newSet;
        }
        
        return prev;
      });
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [cooldownTimer]);
  
  // Pre-load face recognition models when component mounts
  useEffect(() => {
    const preloadModels = async () => {
      try {
        console.log('Pre-loading face recognition models...');
        console.log('SSD MobileNet v1 already loaded:', faceapi.nets.ssdMobilenetv1.isLoaded);
        console.log('Face Landmark 68 Net already loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
        console.log('Face Recognition Net already loaded:', faceapi.nets.faceRecognitionNet.isLoaded);
        
        // Set backend to WebGL to avoid WASM issues
        faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();
        
        // Only load models if they're not already loaded
        if (!faceapi.nets.ssdMobilenetv1.isLoaded || 
            !faceapi.nets.faceLandmark68Net.isLoaded || 
            !faceapi.nets.faceRecognitionNet.isLoaded) {
          await loadFaceModels();
          console.log('Face recognition models pre-loaded successfully');
        } else {
          console.log('Face recognition models already loaded');
        }
      } catch (error) {
        console.error('Failed to pre-load face recognition models:', error);
      }
    };
    
    preloadModels();
  }, []);

  const fetchWorkers = async () => {
    try {
      console.log('Fetching workers...');
      const response = await api.get('/workers');
      console.log('Workers fetched successfully:', response.data);
      setWorkers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching workers:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
      }
      setError('Failed to fetch workers');
      setLoading(false);
    }
  };

  const filterWorkers = useCallback(() => {
    // First, filter workers who have attendance records for the selected date
    let workersWithAttendance = workers.filter(worker => {
      if (!worker.attendanceRecords) return false;
      
      // Check if worker has any attendance records for the selected date
      return worker.attendanceRecords.some(record => {
        const recordDate = new Date(record.date);
        const selected = new Date(selectedDate);
        return recordDate.toDateString() === selected.toDateString();
      });
    });
    
    // Then apply search filter only to workers with attendance
    if (searchTerm) {
      workersWithAttendance = workersWithAttendance.filter(worker => 
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (worker.rfid && worker.rfid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (worker.department && worker.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredWorkers(workersWithAttendance);
  }, [workers, searchTerm, selectedDate]);

  // Filter workers based on search term and selected date
  useEffect(() => {
    const filterWorkersWrapper = () => {
      filterWorkers();
    };
    filterWorkersWrapper();
  }, [filterWorkers]);

  const openRFIDModal = () => {
    setShowRFIDModal(true);
    setRfidInput('');
    setScanningRFID(false);
  };

  const closeRFIDModal = () => {
    setShowRFIDModal(false);
    setRfidInput('');
    setScanningRFID(false);
  };

  // Face Recognition Modal Functions
  const openFaceModal = () => {
    setShowFaceModal(true);
    setFaceDetectionStatus('loading');
    setError('');
    setSuccess('');
    // Clear any previous intervals
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    // Start camera
    startCamera();
  };

  const closeFaceModal = () => {
    setShowFaceModal(false);
    setFaceDetectionStatus('idle');
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    // Clear error and success messages
    setError('');
    setSuccess('');
    
    // Clear matched worker
    setMatchedWorker(null);
    
    // NOTE: We no longer clear workersOnCooldown or cooldownTimer here
    // This ensures cooldown persists across modal openings/closings
    // The cooldown states will be cleaned up automatically when they expire
  };

  // Camera and Face Recognition Functions
  const startCamera = async () => {
    console.log('Starting camera initialization...');
    try {
      setFaceDetectionStatus('loading');
      
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      console.log('Camera access granted');
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('Setting up video element');
        videoRef.current.srcObject = stream;
        
        // Check if video is already ready
        if (videoRef.current.readyState >= 2) {
          console.log('Video already ready, starting face detection');
          setFaceDetectionStatus('camera_ready');
          try {
            await startFaceDetection();
            return;
          } catch (detectionErr) {
            console.error('Face detection failed to start:', detectionErr);
            setFaceDetectionStatus('camera_ready');
            setError('Camera is ready but face recognition is unavailable. You can manually select a worker.');
            return;
          }
        }
        
        // Set up metadata loaded handler
        videoRef.current.onloadedmetadata = async () => {
          console.log('Video metadata loaded');
          // Camera is ready, now try to start face detection
          setFaceDetectionStatus('camera_ready');
          
          try {
            await startFaceDetection();
          } catch (detectionErr) {
            console.error('Face detection failed to start:', detectionErr);
            // Even if face detection fails, keep the camera open
            setFaceDetectionStatus('camera_ready');
            setError('Camera is ready but face recognition is unavailable. You can manually select a worker.');
          }
        };

        // Set up error handler
        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setFaceDetectionStatus('error');
          setError('Error with video stream. Please try again.');
        };
        
        // Add timeout in case onloadedmetadata doesn't fire
        setTimeout(() => {
          if (faceDetectionStatus === 'loading') {
            console.log('Video metadata timeout - assuming camera is ready');
            setFaceDetectionStatus('camera_ready');
            setError('Camera is ready but face recognition is unavailable.');
          }
        }, 3000); // 3 second timeout
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setFaceDetectionStatus('error');
      
      // More specific error messages
      let errorMessage = 'Could not access camera. ';
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please grant camera permission when prompted.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and try again.';
      } else {
        errorMessage += 'Please ensure you have given permission and that your camera is not in use.';
      }
      setError(errorMessage);
    }
  };

  // Load face recognition models
  const loadFaceModels = async (maxRetries = 3) => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        console.log(`Attempting to load face recognition models (attempt ${attempts + 1}/${maxRetries})...`);
        
        // Set backend to WebGL to avoid WASM issues
        faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();
        
        // Load models with better error handling
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        
        console.log('All face recognition models loaded successfully');
        return true;
      } catch (error) {
        attempts++;
        console.error(`Model loading attempt failed (${attempts}/${maxRetries}):`, error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // Check if it's a tensor shape error
        if (error.message && error.message.includes('tensor should have')) {
          console.error('This error indicates the model files are corrupted or incomplete.');
          console.error('Please verify that all model files were downloaded completely.');
        }
        
        // Wait before retrying (exponential backoff)
        if (attempts < maxRetries) {
          const delay = Math.pow(2, attempts) * 1000; // 1s, 2s, 4s
          console.log(`Waiting ${delay}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to load face detection models after ${maxRetries} attempts`);
  };

  // Start face detection
  const startFaceDetection = async () => {
    console.log('Starting face detection with face-api.js...');
    
    try {
      // Load models if not already loaded
      console.log('Checking if models are loaded...');
      console.log('SSD MobileNet v1 loaded:', faceapi.nets.ssdMobilenetv1.isLoaded);
      console.log('Face Landmark 68 Net loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
      console.log('Face Recognition Net loaded:', faceapi.nets.faceRecognitionNet.isLoaded);
      
      if (!faceapi.nets.ssdMobilenetv1.isLoaded || 
          !faceapi.nets.faceLandmark68Net.isLoaded || 
          !faceapi.nets.faceRecognitionNet.isLoaded) {
        console.log('Models not loaded, loading now...');
        try {
          await loadFaceModels();
          
          // Verify models are loaded after loading
          console.log('After loading - SSD MobileNet v1 loaded:', faceapi.nets.ssdMobilenetv1.isLoaded);
          console.log('After loading - Face Landmark 68 Net loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
          console.log('After loading - Face Recognition Net loaded:', faceapi.nets.faceRecognitionNet.isLoaded);
        } catch (modelLoadError) {
          console.error('Failed to load face recognition models:', modelLoadError);
          setFaceDetectionStatus('error');
          setError('Face recognition models failed to load. Please try again.');
          return;
        }
      }
      
      console.log('Loading worker face data...');
      await loadWorkerFaceData();
      
      console.log('Setting up face detection interval...');
      // Clear any existing interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      // Start detection interval (every 1 second)
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            setFaceDetectionStatus('detecting');
            console.log('Detecting faces...');
            
            // Detect faces using face-api.js
            const detections = await faceapi.detectAllFaces(videoRef.current)
              .withFaceLandmarks()
              .withFaceDescriptors();
            
            // Validate detections result
            if (!detections || !Array.isArray(detections)) {
              console.log('No faces detected or invalid detection result');
              return;
            }
            
            console.log(`Found ${detections.length} faces`);
            
            // Draw detections on canvas
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const video = videoRef.current;
              
              // Set canvas dimensions to match video
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              // Clear canvas
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw face detection results
              if (detections && Array.isArray(detections) && detections.length > 0) {
                faceapi.draw.drawDetections(canvas, detections.map(d => d.detection));
                faceapi.draw.drawFaceLandmarks(canvas, detections);
              }
            }
            
            if (detections && Array.isArray(detections) && detections.length > 0) {
              // Match face with known workers
              const matchedWorker = await matchFaceWithWorker(detections[0].descriptor);
              setMatchedWorker(matchedWorker);
              
              // ENHANCED COOLDOWN CHECK using multiple methods
              if (matchedWorker) {
                // Use the enhanced cooldown check that combines multiple approaches
                const cooldownInfo = isWorkerOnCooldown(matchedWorker._id);
                
                if (cooldownInfo.active) {
                  console.log('Worker on cooldown (enhanced check), skipping all processing');
                  setFaceDetectionStatus('cooldown');
                  
                  // Update the cooldown timer display
                  setCooldownTimer({
                    workerId: matchedWorker._id,
                    endTime: Date.now() + cooldownInfo.remainingTime,
                    remainingTime: cooldownInfo.remainingTime
                  });
                  
                  // Show cooldown message
                  const remainingSeconds = Math.ceil(cooldownInfo.remainingTime / 1000);
                  setError(`Please wait ${remainingSeconds} seconds before next punch`);
                  
                  // Clear error message after 3 seconds
                  setTimeout(() => {
                    setError('');
                  }, 3000);
                  
                  return;
                }
              }
              
              // Skip if worker is on cooldown (double-check using the Set)
              if (matchedWorker && workersOnCooldown.has(matchedWorker._id)) {
                console.log('Worker is on cooldown (Set check), skipping detection');
                setFaceDetectionStatus('cooldown');
                
                // Update the cooldown timer display
                const cooldownInfo = isCooldownActive(matchedWorker._id);
                if (cooldownInfo.active) {
                  setCooldownTimer({
                    workerId: matchedWorker._id,
                    endTime: Date.now() + cooldownInfo.remainingTime,
                    remainingTime: cooldownInfo.remainingTime
                  });
                  
                  // Show cooldown message
                  const remainingSeconds = Math.ceil(cooldownInfo.remainingTime / 1000);
                  setError(`Please wait ${remainingSeconds} seconds before next punch`);
                } else {
                  // If cooldown has expired, remove worker from cooldown set
                  setWorkersOnCooldown(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(matchedWorker._id);
                    return newSet;
                  });
                }
                
                return;
              }
                            
              if (matchedWorker) {
                console.log('Face matched with worker:', matchedWorker.name);
  
                // CHECK COOLDOWN IMMEDIATELY when worker is detected, BEFORE stability check
                const cooldownInfo = isCooldownActive(matchedWorker._id);
                if (cooldownInfo.active) {
                  console.log('Worker on cooldown, skipping stability check');
                  setFaceDetectionStatus('cooldown');
                  
                  // Update the cooldown timer display
                  setCooldownTimer({
                    workerId: matchedWorker._id,
                    endTime: Date.now() + cooldownInfo.remainingTime,
                    remainingTime: cooldownInfo.remainingTime
                  });
                  
                  // Show error message
                  const remainingSeconds = Math.ceil(cooldownInfo.remainingTime / 1000);
                  setError(`Please wait ${remainingSeconds} seconds before next punch`);
                  
                  // Clear error message after 3 seconds
                  setTimeout(() => {
                    setError('');
                  }, 3000);
                  
                  return;
                }
                
                // Only proceed with stability check if worker is NOT on cooldown
                // Check for face stability - require the same face to be detected multiple times
                const now = Date.now();
                const STABILITY_THRESHOLD = 3; // Require 3 consecutive detections
                const TIME_WINDOW = 2000; // Within 2 seconds
                
                if (lastDetectedFaceRef.current.workerId === matchedWorker._id && 
                    (now - lastDetectedFaceRef.current.timestamp) < TIME_WINDOW) {
                  // Same worker detected recently, increment count
                  lastDetectedFaceRef.current.count++;
                  lastDetectedFaceRef.current.timestamp = now;
                } else {
                  // Different worker or too much time passed, reset counter
                  lastDetectedFaceRef.current.workerId = matchedWorker._id;
                  lastDetectedFaceRef.current.timestamp = now;
                  lastDetectedFaceRef.current.count = 1;
                }
                
                // Only proceed if face is stable (detected enough times)
                if (lastDetectedFaceRef.current.count >= STABILITY_THRESHOLD) {
                  console.log('Face is stable, proceeding with attendance check');
                  
                  // Reset the stability counter
                  lastDetectedFaceRef.current.count = 0;
                  
                  // Add a small delay to prevent rapid consecutive detections
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Check if cooldown is active for this worker AGAIN (in case it changed during the delay)
                  const cooldownInfo = isCooldownActive(matchedWorker._id);
                  if (!cooldownInfo.active) {
                    // Automatically record attendance for the detected worker
                    try {
                      // Record attendance automatically
                      // For face recognition, we need to identify the worker first
                      // Then send the workerId to the existing attendance endpoint
                      
                      // In a real implementation, you would perform face recognition here
                      // to match the detected face with stored worker face data
                      
                      // For demonstration, we'll assume the worker is identified
                      // You would replace this with actual face recognition logic
                      const identifiedWorkerId = matchedWorker._id;
                      
                      // Send attendance record request with workerId
                      const attendanceData = {
                        workerId: identifiedWorkerId,
                        method: 'face' // Face method for admin attendance - will skip location validation
                      };

                      // Location is not required for face attendance from admin page

                      console.log('Recording attendance for worker:', identifiedWorkerId);
                      const response = await api.post('/workers/attendance', attendanceData);
                      
                      if (response.status === 200 || response.status === 201) {
                        const responseData = response.data;
                        
                        // Check if attendance was successfully recorded or if it was rejected due to location or cooldown
                        if (responseData.success === false) {
                          if (responseData.reason === "COOLDOWN_ACTIVE") {
                            // Attendance was rejected due to cooldown
                            console.log('Attendance rejected due to cooldown for', matchedWorker.name);
                            setError(responseData.message);
                            
                            // Add worker to cooldown set to prevent continuous detection
                            setWorkersOnCooldown(prev => {
                              const newSet = new Set(prev);
                              newSet.add(matchedWorker._id);
                              return newSet;
                            });
                            
                            // Set cooldown timer state for UI updates
                            const remainingTime = responseData.remainingTime * 1000; // Convert seconds to milliseconds
                            const cooldownEndTime = Date.now() + remainingTime;
                            setCooldownTimer({
                              workerId: matchedWorker._id,
                              endTime: cooldownEndTime,
                              remainingTime: remainingTime
                            });
                            
                            // Clear error message after 3 seconds
                            setTimeout(() => {
                              setError('');
                            }, 3000);
                          } else if (responseData.message && responseData.message.includes('outside the allowed attendance location')) {
                            // Attendance was rejected due to location
                            console.log('Attendance rejected due to location for', matchedWorker.name);
                            setError('You are outside the allowed attendance location');
                            
                            // Clear error message after 3 seconds
                            setTimeout(() => {
                              setError('');
                            }, 3000);
                          } else if (responseData.message && responseData.message.includes('Location permission is required')) {
                            // Attendance was rejected due to missing location permission
                            console.log('Attendance rejected due to missing location permission for', matchedWorker.name);
                            setError('Location permission is required to mark attendance');
                            
                            // Clear error message after 3 seconds
                            setTimeout(() => {
                              setError('');
                            }, 3000);
                          } else {
                            // Other error
                            setError(responseData.message || 'Failed to record attendance');
                            
                            // Clear error message after 3 seconds
                            setTimeout(() => {
                              setError('');
                            }, 3000);
                          }
                        } else if (responseData.success === true) {
                          // Attendance was successfully recorded
                          console.log('Attendance recorded successfully for', matchedWorker.name);
                          setSuccess(responseData.message);
                          
                          // Record the punch time for additional reliability
                          recordWorkerPunchTime(matchedWorker._id);
                          
                          // Add worker to cooldown set to prevent continuous detection
                          setWorkersOnCooldown(prev => {
                            const newSet = new Set(prev);
                            newSet.add(matchedWorker._id);
                            return newSet;
                          });
                          
                          // Set cooldown timer state for UI updates
                          const cooldownEndTime = Date.now() + 60000; // 1 minute from now
                          setCooldownTimer({
                            workerId: matchedWorker._id,
                            endTime: cooldownEndTime,
                            remainingTime: 60000
                          });
                          
                          // Clear success message after 3 seconds
                          setTimeout(() => {
                            setSuccess('');
                          }, 3000);
                          
                          // Refresh workers data to update attendance records
                          await fetchWorkers();
                        } else {
                          // Handle case where response doesn't match expected format
                          console.log('Unexpected response format from server:', responseData);
                          setSuccess('Attendance recorded successfully');
                          
                          // Record the punch time for additional reliability
                          recordWorkerPunchTime(matchedWorker._id);
                          
                          // Add worker to cooldown set to prevent continuous detection
                          setWorkersOnCooldown(prev => {
                            const newSet = new Set(prev);
                            newSet.add(matchedWorker._id);
                            return newSet;
                          });
                          
                          // Set cooldown timer state for UI updates
                          const cooldownEndTime = Date.now() + 60000; // 1 minute from now
                          setCooldownTimer({
                            workerId: matchedWorker._id,
                            endTime: cooldownEndTime,
                            remainingTime: 60000
                          });
                          
                          // Clear success message after 3 seconds
                          setTimeout(() => {
                            setSuccess('');
                          }, 3000);
                          
                          // Refresh workers data to update attendance records
                          await fetchWorkers();
                        }
                      } else {
                        throw new Error('Failed to record attendance');
                      }
                    } catch (attendanceError) {
                      console.error('Error recording attendance:', attendanceError);
                      if (attendanceError.response && attendanceError.response.data && attendanceError.response.data.message) {
                        setError(attendanceError.response.data.message);
                      } else {
                        setError('Failed to record attendance. Please try again.');
                      }
                    }
                  } else {
                    console.log('Worker on cooldown, skipping attendance recording');
                    const remainingSeconds = Math.ceil(cooldownInfo.remainingTime / 1000);
                    setError(`Please wait ${remainingSeconds} seconds before next punch`);
                    
                    // Clear error message after 3 seconds
                    setTimeout(() => {
                      setError('');
                    }, 3000);
                  }
                  
                  // Only set recognized status if attendance was actually recorded
                  if (!cooldownInfo.active) {
                    setFaceDetectionStatus('recognized');
                    // Reset to detecting after a short delay to show the success message
                    setTimeout(() => {
                      setFaceDetectionStatus('detecting');
                    }, 2000);
                  } else {
                    setFaceDetectionStatus('cooldown');
                    // Reset to detecting after a short delay to show the cooldown message
                    setTimeout(() => {
                      setFaceDetectionStatus('detecting');
                    }, 2000);
                  }
                } else {
                  console.log(`Face detected but not stable yet (${lastDetectedFaceRef.current.count}/${STABILITY_THRESHOLD})`);
                  setFaceDetectionStatus('detecting');
                }
              } else {
                console.log('Face detected but not recognized');
                setFaceDetectionStatus('detecting');
                
                // Reset stability counter when face is not recognized
                lastDetectedFaceRef.current.count = 0;
              }
            } else {
              console.log('No faces detected');
              setFaceDetectionStatus('detecting');
              
              // Reset stability counter when no face is detected
              // This prevents false positives when someone moves away and then back
              if (lastDetectedFaceRef.current.count > 0) {
                lastDetectedFaceRef.current.count = 0;
                console.log('Resetting face stability counter due to no face detection');
              }
            }
          } catch (err) {
            console.error('Error during face detection:', err);
            console.error('Error details:', {
              name: err.name,
              message: err.message,
              stack: err.stack
            });
            setFaceDetectionStatus('error');
            setError('Face detection error. Please try again.');
          }
        }
      }, 1000); // Run detection every 1 second
      
      console.log('Face detection started successfully');
    } catch (error) {
      console.error('Error starting face detection:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setFaceDetectionStatus('error');
      setError('Face detection failed to start. Please try again.');
    }
  };

  // Load worker face data for recognition
  const loadWorkerFaceData = useCallback(async () => {
    console.log('Loading worker face data for recognition...');
    try {
      // Reset worker descriptors
      workerDescriptorsRef.current = [];
      
      // Process each worker who has face data
      for (const worker of workers) {
        if (worker.faceData && worker.faceData.length > 0) {
          console.log(`Processing face data for worker: ${worker.name}`);
          
          try {
            // Convert base64 face data to descriptors
            const faceDescriptors = [];
            
            for (const faceImageBase64 of worker.faceData) {
              try {
                // Create image element from base64
                const img = new Image();
                
                // If the base64 string doesn't have a data URL prefix, add it
                let dataUrl = faceImageBase64;
                if (!dataUrl.startsWith('data:image')) {
                  dataUrl = `data:image/jpeg;base64,${faceImageBase64}`;
                }
                
                img.src = dataUrl;
                
                // Wait for image to load with a timeout
                await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error('Image loading timeout'));
                  }, 5000); // 5 second timeout
                  
                  img.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                  };
                  
                  img.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Image loading error'));
                  };
                });
                
                // Detect face and get descriptor
                const detection = await faceapi.detectSingleFace(img)
                  .withFaceLandmarks()
                  .withFaceDescriptor();
                
                if (detection) {
                  faceDescriptors.push(detection.descriptor);
                  console.log(`Generated descriptor for face image of ${worker.name}`);
                } else {
                  console.log(`No face detected in image for ${worker.name}`);
                }
              } catch (imgErr) {
                console.error(`Error processing face image for ${worker.name}:`, imgErr);
              }
            }
            
            if (faceDescriptors.length > 0) {
              workerDescriptorsRef.current.push({
                workerId: worker._id,
                workerName: worker.name,
                descriptors: faceDescriptors
              });
              console.log(`Loaded ${faceDescriptors.length} face descriptors for ${worker.name}`);
            }
          } catch (err) {
            console.error(`Error processing face data for worker ${worker.name}:`, err);
          }
        }
      }
      
      console.log(`Loaded face data for ${workerDescriptorsRef.current.length} workers`);
    } catch (error) {
      console.error('Error loading worker face data:', error);
    }
  }, [workers]);

  // Load worker face data when workers change or face modal is opened
  useEffect(() => {
    const loadWorkerFaceDataWrapper = async () => {
      if (showFaceModal && workers.length > 0) {
        await loadWorkerFaceData();
      }
    };
    loadWorkerFaceDataWrapper();
  }, [loadWorkerFaceData, showFaceModal]);

  // Store the last detected face to check for stability
  const lastDetectedFaceRef = useRef({
    workerId: null,
    timestamp: 0,
    count: 0
  });
  
  // Match face descriptor with known workers
  const matchFaceWithWorker = async (descriptor) => {
    console.log('Matching face with workers...');
    try {
      if (!workerDescriptorsRef.current || workerDescriptorsRef.current.length === 0) {
        console.log('No worker face data available for matching');
        return null;
      }
      
      // Compare with each worker's face descriptors
      for (const workerData of workerDescriptorsRef.current) {
        for (const storedDescriptor of workerData.descriptors) {
          // Calculate Euclidean distance between descriptors
          const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
          
          // If distance is below threshold, we have a match
          if (distance < 0.4) { // Increased accuracy threshold for face matching
            console.log(`Face matched with worker: ${workerData.workerName} (distance: ${distance})`);
            const worker = workers.find(w => w._id === workerData.workerId);
            return worker || null;
          }
        }
      }
      
      console.log('No matching worker found');
      return null;
    } catch (error) {
      console.error('Error matching face with workers:', error);
      return null;
    }
  };
  

  const handleRFIDInput = (e) => {
    setRfidInput(e.target.value);
  };

  const handleRFIDKeyPress = (e) => {
    if (e.key === 'Enter' && rfidInput) {
      validateRFID();
    }
  };

  const validateRFID = async () => {
    if (!rfidInput) return;
    
    try {
      setScanningRFID(true);
      console.log('Validating RFID:', rfidInput);
      // Check if RFID exists
      const response = await api.get('/workers');
      const workers = response.data;
      const worker = workers.find(w => w.rfid === rfidInput);
      
      if (worker) {
        console.log('RFID found, worker:', worker);
        
        // ENHANCED COOLDOWN CHECK when worker is found, BEFORE showing confirmation modal
        const cooldownInfo = isWorkerOnCooldown(worker._id);
        if (cooldownInfo.active) {
          const remainingSeconds = Math.ceil(cooldownInfo.remainingTime / 1000);
          setError(`Please wait ${remainingSeconds} seconds before next punch`);
          setScanningRFID(false);
          // Clear error message after 3 seconds
          setTimeout(() => {
            setError('');
          }, 3000);
          return;
        }
        
        // Only proceed with confirmation modal if worker is NOT on cooldown
        // Determine if this should be a punch in or punch out
        // Count total punches for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRecords = worker.attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === today.getTime();
        });
        
        // Count total individual punches (checkIn and checkOut)
        let totalPunches = 0;
        todayRecords.forEach(record => {
          if (record.checkIn) totalPunches++;
          if (record.checkOut) totalPunches++;
        });
        
        // If even number of punches, next should be punch in (odd punches are in)
        // If odd number of punches, next should be punch out (even punches are out)
        const nextPunchIn = (totalPunches % 2 === 0);
        
        setWorkerForPunch(worker);
        setIsPunchIn(nextPunchIn);
        setShowRFIDModal(false);
        setShowConfirmationModal(true);
      } else {
        console.log('RFID not found');
        setError('Invalid RFID. Please try again.');
        setScanningRFID(false);
        // Clear error message after 3 seconds
        setTimeout(() => {
          setError('');
        }, 3000);
      }
    } catch (err) {
      console.error('Error validating RFID:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
      }
      setError('Failed to validate RFID. Please try again.');
      setScanningRFID(false);
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setWorkerForPunch(null);
  };

  const confirmPunch = async () => {
    if (!workerForPunch) return;
    
    try {
      console.log('Sending RFID attendance request:', {
        rfid: workerForPunch.rfid,
        method: isPunchIn ? 'checkIn' : 'checkOut'
      });
      
      // For RFID method from admin page, don't require location
      // The backend will skip location validation for RFID method
      const requestData = {
        rfid: workerForPunch.rfid,
        method: 'rfid'
      };
      
      var response = await api.post('/workers/attendance', requestData);
      
      // Check if we have a valid response
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Check if attendance was rejected due to location or cooldown
      if (response.data.reason === "COOLDOWN_ACTIVE") {
        setError(response.data.message);
        // Add worker to cooldown set even on error to prevent spamming
        setWorkersOnCooldown(prev => {
          const newSet = new Set(prev);
          newSet.add(workerForPunch._id);
          return newSet;
        });
        
        // Set cooldown timer based on server response
        const remainingTime = response.data.remainingTime * 1000; // Convert seconds to milliseconds
        const cooldownEndTime = Date.now() + remainingTime;
        setCooldownTimer({
          workerId: workerForPunch._id,
          endTime: cooldownEndTime,
          remainingTime: remainingTime
        });
        closeConfirmationModal();
        return;
      } else if (response.data.message && response.data.message.includes('outside the allowed attendance location')) {
        // Attendance was rejected due to location
        setError('You are outside the allowed attendance location');
        closeConfirmationModal();
        return;
      } else if (response.data.message && response.data.message.includes('Location permission is required')) {
        // Attendance was rejected due to missing location permission
        setError('Location permission is required to mark attendance');
        closeConfirmationModal();
        return;
      }
      
      // Check if attendance was successfully recorded
      if (response.data.success === true) {
        setSuccess(response.data.message);
        
        // Record the punch time for additional reliability
        if (workerForPunch) {
          recordWorkerPunchTime(workerForPunch._id);
        }
        
        // Add worker to cooldown set even on success to prevent spamming
        setWorkersOnCooldown(prev => {
          const newSet = new Set(prev);
          if (workerForPunch) {
            newSet.add(workerForPunch._id);
          }
          return newSet;
        });
        
        // Set cooldown timer based on server response or default to 1 minute
        const remainingTime = response.data.remainingTime ? response.data.remainingTime * 1000 : 60000;
        const cooldownEndTime = Date.now() + remainingTime;
        setCooldownTimer({
          workerId: workerForPunch ? workerForPunch._id : null,
          endTime: cooldownEndTime,
          remainingTime: remainingTime
        });
        
        closeConfirmationModal();
        
        // Refresh workers data to update attendance records
        await fetchWorkers();
      } else {
        // Handle other responses (could be location/cooldown rejection or other errors)
        if (response.data.reason === "COOLDOWN_ACTIVE") {
          setError(response.data.message);
          // Add worker to cooldown set even on error to prevent spamming
          setWorkersOnCooldown(prev => {
            const newSet = new Set(prev);
            if (workerForPunch) {
              newSet.add(workerForPunch._id);
            }
            return newSet;
          });
          
          // Set cooldown timer based on server response
          const remainingTime = response.data.remainingTime * 1000; // Convert seconds to milliseconds
          const cooldownEndTime = Date.now() + remainingTime;
          setCooldownTimer({
            workerId: workerForPunch ? workerForPunch._id : null,
            endTime: cooldownEndTime,
            remainingTime: remainingTime
          });
          closeConfirmationModal();
          return;
        } else if (response.data.message && response.data.message.includes('outside the allowed attendance location')) {
          // Attendance was rejected due to location
          setError('You are outside the allowed attendance location');
          closeConfirmationModal();
          return;
        } else if (response.data.message && response.data.message.includes('Location permission is required')) {
          // Attendance was rejected due to missing location permission
          setError('Location permission is required to mark attendance');
          closeConfirmationModal();
          return;
        }
        
        setError('Failed to record attendance. Please try again.');
        closeConfirmationModal();
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('outside the allowed attendance location')) {
          setError('You are outside the allowed attendance location');
        } else if (err.response.data.message.includes('Location permission is required')) {
          setError('Location permission is required to mark attendance');
        } else {
          setError(err.response.data.message);
        }
      } else if (err.message && err.message.includes('Geolocation')) {
        setError('Location permission is required to mark attendance');
      } else {
        setError('Failed to record attendance. Please try again.');
      }
      
      // Even on error, add worker to cooldown set to prevent spamming
      setWorkersOnCooldown(prev => {
        const newSet = new Set(prev);
        if (workerForPunch) {
          newSet.add(workerForPunch._id);
          // Record the punch attempt time for additional reliability
          recordWorkerPunchTime(workerForPunch._id);
        }
        return newSet;
      });
      
      // Set default cooldown timer of 1 minute on error
      const cooldownEndTime = Date.now() + 60000;
      setCooldownTimer({
        workerId: workerForPunch ? workerForPunch._id : null,
        endTime: cooldownEndTime,
        remainingTime: 60000
      });
      
      closeConfirmationModal();
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:-- --';
    // Convert to 12-hour format
    const date = new Date(timeString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };


  // Get attendance records for selected date
  const getAttendanceForDate = (worker) => {
    if (!worker.attendanceRecords) return [];
    
    return worker.attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      const selected = new Date(selectedDate);
      return recordDate.toDateString() === selected.toDateString();
    });
  };

  // Process attendance records to group by day and show all punches
  const processAttendanceByDay = (worker) => {
    const records = getAttendanceForDate(worker);
    
    if (!records || records.length === 0) return [];
    
    // Extract all individual punch times and maintain their order
    const allPunches = [];
    
    records.forEach(record => {
      // Add checkIn time if exists
      if (record.checkIn) {
        allPunches.push({
          time: record.checkIn,
          type: 'in'
        });
      }
      
      // Add checkOut time if exists
      if (record.checkOut) {
        allPunches.push({
          time: record.checkOut,
          type: 'out'
        });
      }
    });
    
    // Sort all punches by time to ensure correct order
    allPunches.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    return allPunches;
  };

  // Calculate total duration for the day
  const calculateTotalDuration = (worker) => {
    const records = getAttendanceForDate(worker);
    
    if (!records || records.length === 0) return '--:--:--';
    
    let totalMilliseconds = 0;
    
    records.forEach(record => {
      if (record.checkIn && record.checkOut) {
        const inTime = new Date(record.checkIn);
        const outTime = new Date(record.checkOut);
        const diffMs = outTime - inTime;
        totalMilliseconds += diffMs;
      }
    });
    
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Check if enough time has passed since last punch (1 minute cooldown)
  // Returns object with cooldown status and remaining time
  const isCooldownActive = (workerId) => {
    // First, check if worker is in the cooldown set
    if (!workersOnCooldown.has(workerId)) {
      console.log(`Worker ${workerId} is not in cooldown set`);
      return { active: false, remainingTime: 0 };
    }
    
    console.log(`Worker ${workerId} is in cooldown set`);
    
    // If worker is in cooldown set, check the timer
    if (cooldownTimer && cooldownTimer.workerId === workerId) {
      const remainingTime = cooldownTimer.endTime - Date.now();
      console.log(`Cooldown timer for worker ${workerId}: ${remainingTime}ms remaining`);
      
      // Only return active if remaining time is positive
      if (remainingTime > 0) {
        return { 
          active: true,
          remainingTime: remainingTime
        };
      } else {
        // Timer has expired, remove worker from cooldown set
        console.log(`Cooldown expired for worker ${workerId}, removing from cooldown set`);
        setWorkersOnCooldown(prev => {
          const newSet = new Set(prev);
          newSet.delete(workerId);
          return newSet;
        });
        // Clear the cooldown timer
        setCooldownTimer(null);
        return { active: false, remainingTime: 0 };
      }
    }
    
    // If worker is in cooldown set but no timer, assume cooldown is active
    // This handles cases where the component re-renders but the timer state is lost
    console.log(`Worker ${workerId} in cooldown set but no timer, assuming active`);
    return { active: true, remainingTime: 60000 }; // Default to 1 minute
  };

  // Enhanced function to check if a worker is on cooldown with timestamp backup
  const isWorkerOnCooldown = (workerId) => {
    // First check using the primary method
    const primaryCheck = isCooldownActive(workerId);
    if (primaryCheck.active) {
      return primaryCheck;
    }
    
    // If primary check says not active, double-check using timestamp-based approach
    // This helps in cases where state might not have updated yet
    const lastPunchTime = localStorage.getItem(`lastPunchTime_${workerId}`);
    if (lastPunchTime) {
      const timeDiff = Date.now() - parseInt(lastPunchTime);
      if (timeDiff < 60000) { // Less than 1 minute
        const remainingTime = 60000 - timeDiff;
        return { active: true, remainingTime };
      } else {
        // Cooldown expired, remove from localStorage
        localStorage.removeItem(`lastPunchTime_${workerId}`);
      }
    }
    
    return { active: false, remainingTime: 0 };
  };

  // Function to record a worker's punch time
  const recordWorkerPunchTime = (workerId) => {
    localStorage.setItem(`lastPunchTime_${workerId}`, Date.now().toString());
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-gray-600">Track worker attendance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openRFIDModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            RFID
          </button>
          <button
            onClick={openFaceModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Face Attendance
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Face Recognition Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Face Recognition Attendance
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
            <div className="px-6 py-4">
              <div className="mb-6">
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {(faceDetectionStatus === 'loading' || faceDetectionStatus === 'camera_ready' || faceDetectionStatus === 'detecting' || faceDetectionStatus === 'recognized' || faceDetectionStatus === 'cooldown') && (
                    <>
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                        onLoadedData={() => {
                          console.log('Attendance video element loaded data');
                        }}
                      />
                      <canvas 
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                      />
                      
                      {/* Cooldown Timer Display */}
                      {cooldownTimer && matchedWorker && cooldownTimer.workerId === matchedWorker._id && (
                        <div className="absolute top-4 left-0 right-0 flex justify-center">
                          <div className="bg-yellow-500 bg-opacity-90 text-white px-4 py-2 rounded-lg">
                            Cooldown: {Math.ceil(cooldownTimer.remainingTime / 1000)} seconds remaining
                          </div>
                        </div>
                      )}
                      
                      {faceDetectionStatus === 'detecting' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-blue-500 bg-opacity-75 text-white px-4 py-2 rounded-lg">
                            Detecting face...
                          </div>
                        </div>
                      )}
                      
                      {faceDetectionStatus === 'cooldown' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-yellow-500 bg-opacity-75 text-white px-4 py-2 rounded-lg">
                            On cooldown, please wait...
                          </div>
                        </div>
                      )}
                      
                      {faceDetectionStatus === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-gray-500 bg-opacity-75 text-white px-4 py-2 rounded-lg">
                            Initializing camera...
                          </div>
                        </div>
                      )}
                      
                      {faceDetectionStatus === 'recognized' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-green-500 bg-opacity-75 text-white px-4 py-2 rounded-lg">
                            Face recognized and attendance recorded!
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {faceDetectionStatus === 'error' && (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      <p className="text-gray-600">Error accessing camera</p>
                    </div>
                  )}
                  
                  {faceDetectionStatus === 'recognized' && (
                    <div className="absolute bottom-4 left-0 right-0">
                      <div className="bg-green-500 bg-opacity-90 text-white px-4 py-2 rounded-lg mx-4">
                        Face recognized and attendance recorded!
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    {faceDetectionStatus === 'detecting' 
                      ? 'Scanning for faces... Please position your face in the frame' 
                      : faceDetectionStatus === 'recognized' 
                        ? 'Face recognized and attendance recorded!' 
                        : faceDetectionStatus === 'loading'
                          ? 'Initializing camera and face detection models...'
                          : faceDetectionStatus === 'error'
                            ? 'Error with face detection. Please close and reopen the scanner.'
                            : faceDetectionStatus === 'cooldown'
                              ? 'On cooldown, please wait before marking attendance again.'
                              : 'Waiting for camera access...'}
                  </p>
                  {faceDetectionStatus === 'loading' && (
                    <div className="mt-4">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading face detection models...</p>
                    </div>
                  )}
                  {faceDetectionStatus === 'detecting' && (
                    <div className="mt-4">
                      <div className="inline-flex space-x-1">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Searching for faces</p>
                    </div>
                  )}
                  {faceDetectionStatus === 'recognized' && (
                    <div className="mt-4">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Attendance recorded successfully</p>
                    </div>
                  )}
                  {faceDetectionStatus === 'error' && (
                    <div className="mt-4">
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Please close and reopen the scanner</p>
                      <button
                        onClick={closeFaceModal}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                      >
                        Close Scanner
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Worker selection dropdown removed as attendance is now fully automated */}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeFaceModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFID Modal */}
      {showRFIDModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Enter RFID
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RFID
                </label>
                <input
                  type="text"
                  value={rfidInput}
                  onChange={handleRFIDInput}
                  onKeyPress={handleRFIDKeyPress}
                  placeholder="Enter RFID"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                  disabled={scanningRFID}
                />
                <p className="mt-2 text-sm text-gray-500">
                  RFID format: 2 letters + 4 digits (e.g., AB1234)
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeRFIDModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  disabled={scanningRFID}
                >
                  Cancel
                </button>
                <button
                  onClick={validateRFID}
                  disabled={!rfidInput || scanningRFID}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {scanningRFID ? 'Validating...' : 'Enter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && workerForPunch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Attendance
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Do you want to Punch {isPunchIn ? 'In' : 'Out'}?
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{workerForPunch.name}</p>
                  <p className="text-sm text-gray-600">{workerForPunch.rfid}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeConfirmationModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPunch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Punch {isPunchIn ? 'In' : 'Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Date Selection */}
      <div className="bg-white rounded shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Workers
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, RFID, or department..."
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="border-b border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">Attendance Records</h3>
            <p className="text-gray-600 mt-1">Attendance records for {formatDate(selectedDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportAttendance(api, 'pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm"
            >
              Export PDF
            </button>
            <button
              onClick={() => exportAttendance(api, 'excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition text-sm"
            >
              Export Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID (RFID)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No attendance records found for the selected date.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map(worker => {
                  const allPunches = processAttendanceByDay(worker);
                  const totalDuration = calculateTotalDuration(worker);
                  
                  // Separate in and out times while maintaining order
                  const inTimes = [];
                  const outTimes = [];
                  
                  // Distribute punches alternately between in and out columns
                  allPunches.forEach((punch, index) => {
                    if (index % 2 === 0) {
                      // Even index (0, 2, 4, ...) goes to inTimes
                      inTimes.push(punch);
                    } else {
                      // Odd index (1, 3, 5, ...) goes to outTimes
                      outTimes.push(punch);
                    }
                  });
                  
                  return (
                    <tr key={worker._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {worker.rfid || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {worker.department ? worker.department.name : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(selectedDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {inTimes.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            {inTimes.map((punch, index) => (
                              <span key={index} className="text-green-600 font-medium">
                                {formatTime(punch.time)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">--:-- --</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {outTimes.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            {outTimes.map((punch, index) => (
                              <span key={index} className="text-red-600 font-medium">
                                {formatTime(punch.time)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">--:-- --</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {totalDuration}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper function to get current location with better error handling
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser. Please use a modern browser with location services enabled.'));
      return;
    }
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      reject(new Error('Location services require a secure connection (HTTPS). Please access this application over HTTPS or localhost.'));
      return;
    }
    
    console.log('Attempting to get current location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location retrieved successfully:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
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
        console.error('Location error details:', errorMessage);
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: false, // Try with lower accuracy first
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 60000 // Accept positions up to 1 minute old
      }
    );
  });
};

export default Attendance;