import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import EmployeeSidebar from '../components/EmployeeSidebar';

// Import face-api.js
import * as faceapi from 'face-api.js';

const EmployeeDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Face recognition states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faceProcessing, setFaceProcessing] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const [faceError, setFaceError] = useState('');
  const [faceSuccess, setFaceSuccess] = useState('');
  
  // Refs for face recognition
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  const fetchWorkerData = useCallback(async () => {
    try {
      const res = await axios.get(`/api/workers/${id}`);
      setWorker(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch worker data');
    }
  }, [id]);

  const fetchJobs = useCallback(async () => {
    try {
      // Use the new endpoint that fetches jobs for a specific worker
      const res = await axios.get(`/api/jobs/worker/${id}`);
      setJobs(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Check if employee is logged in
    const storedEmployee = localStorage.getItem('employee');
    if (!storedEmployee) {
      navigate('/employee/login');
      return;
    }

    // Get worker data from localStorage
    const storedWorker = localStorage.getItem('employee');
    if (storedWorker) {
      const parsedWorker = JSON.parse(storedWorker);
      setWorker(parsedWorker);
    } else {
      // If no worker data in localStorage, fetch from API
      fetchWorkerData();
    }
    
    // Fetch jobs for this specific worker
    fetchJobs();
    
    // Make face attendance function available globally
    window.openFaceAttendanceModal = () => setShowFaceModal(true);
    
    // Cleanup function
    return () => {
      window.openFaceAttendanceModal = undefined;
      // Clean up any running intervals
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [id, fetchWorkerData, fetchJobs, navigate]);

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      if (!showFaceModal || isModelLoaded) return;
      
      try {
        // Set backend to WebGL to avoid WASM issues
        faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();
        
        // Load models with better error handling
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setIsModelLoaded(true);
        setFaceError('');
      } catch (err) {
        console.error('Error loading models:', err);
        setFaceError('Failed to load face detection models. Please ensure model files are correctly downloaded.');
      }
    };

    loadModels();
  }, [showFaceModal, isModelLoaded]);

  const handleLogout = () => {
    localStorage.removeItem('employee');
    // Close sidebar on mobile when logging out
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    navigate('/employee/login');
  };

  // Face Recognition Modal Functions
  // const openFaceModal = () => {
  //   setShowFaceModal(true);
  //   setFaceError('');
  //   setFaceSuccess('');
  //   setIsModelLoaded(false);
  // };

  const closeFaceModal = () => {
    setShowFaceModal(false);
    setFaceError('');
    setFaceSuccess('');
    setIsModelLoaded(false);
    
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
  };

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
    
    const box = detection.box;
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

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setFaceError('Could not access camera. Please ensure you have given permission.');
    }
  };

  // Recognize face and mark attendance
  const recognizeFaceAndMark = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded || !worker) {
      return;
    }

    const video = videoRef.current.video;
    if (!video) {
      setFaceError('Camera not accessible.');
      return;
    }
    
    // Wait for video to be ready
    if (video.readyState !== 4) {
      if (video.networkState === video.NETWORK_LOADING || video.networkState === video.NETWORK_IDLE) {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (video.readyState !== 4) {
          return;
        }
      } else {
        return;
      }
    }

    setFaceProcessing(true);
    setFaceError('');

    try {
      // Detect face and get descriptor
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.7,
          maxResults: 1
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Draw circular frame
      const canvas = canvasRef.current;
      if (canvas) {
        const displaySize = { 
          width: video.videoWidth || video.width || 640, 
          height: video.videoHeight || video.height || 480 
        };
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        drawFrame(canvas);
      }

      if (detections) {
        const box = detections.detection.box;
        if (box.width <= 0 || box.height <= 0) {
          setFaceError('Invalid face detection. Please ensure your face is clearly visible.');
          setFaceProcessing(false);
          return;
        }

        const displaySize = { 
          width: video.videoWidth || video.width || 640, 
          height: video.videoHeight || video.height || 480 
        };
        
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = displaySize.width;
          canvas.height = displaySize.height;
          
          // Draw circular frame
          drawFrame(canvas);
          
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          // Check if face is within the circular frame
          if (!isFaceInFrame(resizedDetections.detection, canvas)) {
            setFaceError('Please position your face within the circular frame.');
            setFaceProcessing(false);
            return;
          }
          
          // Draw face detection
          try {
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          } catch (drawError) {
            console.warn('Error drawing face detection:', drawError);
          }

          // Get worker's face data
          try {
            const workerRes = await axios.get(`/api/workers/${worker._id}/face-data`);
            const workerFaceData = workerRes.data;
            
            if (!workerFaceData || !workerFaceData.faceImages || workerFaceData.faceImages.length === 0) {
              setFaceError('No face data registered for this worker. Please contact administrator.');
              setFaceProcessing(false);
              return;
            }

            // Create labeled face descriptors from stored embeddings
            const descriptors = workerFaceData.faceImages.map(imageUrl => {
              // In a real implementation, you would convert stored images to descriptors
              // For now, we'll simulate a match
              return new Float32Array(128); // Placeholder
            });
            
            const labeledFaceDescriptors = [new faceapi.LabeledFaceDescriptors(worker._id, descriptors)];
            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
            
            // Find best match for the detected face
            const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
            
            if (bestMatch && bestMatch.label !== 'unknown' && bestMatch.distance < 0.6) {
              // Record attendance
              await recordAttendance(worker._id);
            } else {
              setFaceError('Face not recognized. Please try again.');
            }
          } catch (workerError) {
            console.error('Error getting worker face data:', workerError);
            setFaceError('Failed to verify worker data. Please try again.');
          }
        }
      } else {
        setFaceError('No face detected. Please position your face within the frame.');
      }
    } catch (err) {
      console.error('Error recognizing face:', err);
      setFaceError('Failed to recognize face. Please try again.');
    } finally {
      setFaceProcessing(false);
    }
  }, [isModelLoaded, worker]);

  // Auto-detection loop
  useEffect(() => {
    let interval;
    if (showFaceModal && isModelLoaded) {
      // Start camera when modal opens
      startCamera();
      
      // Set up detection interval
      interval = setInterval(() => {
        if (!faceProcessing) {
          recognizeFaceAndMark();
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showFaceModal, isModelLoaded, faceProcessing, recognizeFaceAndMark]);

  // Record attendance for the worker
  const recordAttendance = async (workerId) => {
    try {
      const response = await axios.post('/api/workers/attendance', {
        workerId: workerId,
        method: 'face'
      });
      
      if (response.status === 200) {
        setFaceSuccess('Attendance recorded successfully!');
        // Close modal after success
        setTimeout(() => {
          closeFaceModal();
        }, 2000);
      } else {
        throw new Error('Failed to record attendance');
      }
    } catch (attendanceError) {
      console.error('Error recording attendance:', attendanceError);
      setFaceError('Failed to record attendance. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <EmployeeSidebar worker={worker} onLogout={handleLogout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <EmployeeSidebar worker={worker} onLogout={handleLogout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex items-center justify-center">
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
    <div className="flex min-h-screen bg-gray-100">
      <EmployeeSidebar worker={worker} onLogout={handleLogout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">Employee Dashboard</h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Assigned Jobs</p>
                  <p className="text-2xl font-bold">{jobs.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Completed Jobs</p>
                  <p className="text-2xl font-bold">
                    {jobs.filter(job => job.status === 'Done').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">
                    {jobs.filter(job => job.status === 'In Progress').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Info */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{worker?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold">{worker?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-semibold">{worker?.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-semibold">
                  {worker?.department ? worker.department.name : 'Not Assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Jobs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assigned Jobs</h2>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs assigned</h3>
                <p className="mt-1 text-sm text-gray-500">You don't have any jobs assigned to you yet.</p>
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobs.map((job) => (
                      <tr key={job._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {job._id?.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.customer?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.device_model}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.reported_issue}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            job.status === 'Done' ? 'bg-green-100 text-green-800' :
                            job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            job.status === 'Pending Approval' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

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
                {!isModelLoaded ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading face recognition models...</p>
                  </div>
                ) : (
                  <div className="face-attendance-container">
                    <div className="webcam-container relative mb-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full rounded-lg"
                      />
                      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
                    </div>

                    <div className="text-center mb-4">
                      <div className="inline-block p-2 bg-blue-100 rounded-full">
                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {faceProcessing ? 'Recognizing face...' : 'Position your face within the circular frame'}
                      </p>
                    </div>

                    {faceError && (
                      <div className="mb-4 p-3 text-center text-red-600 bg-red-50 rounded-md border border-red-200">
                        {faceError}
                      </div>
                    )}

                    {faceSuccess && (
                      <div className="mb-4 p-3 text-center text-green-600 bg-green-50 rounded-md border border-green-200">
                        {faceSuccess}
                      </div>
                    )}

                    <div className="text-center text-gray-600">
                      <p className="font-medium">Face Recognition Status</p>
                      <p className="text-sm mt-1">
                        {faceProcessing ? 'Analyzing facial features...' : 'Waiting for face detection'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;