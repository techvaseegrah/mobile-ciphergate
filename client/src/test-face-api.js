// Test file to verify face-api.js is working correctly
import * as faceapi from 'face-api.js';

const testFaceApi = async () => {
  console.log('Testing face-api.js functionality...');
  
  try {
    // Check if models are loaded
    console.log('SSD MobileNet v1 loaded:', faceapi.nets.ssdMobilenetv1.isLoaded);
    console.log('Face Landmark 68 Net loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
    console.log('Face Recognition Net loaded:', faceapi.nets.faceRecognitionNet.isLoaded);
    
    // Try to load models if not already loaded
    if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
      console.log('Loading SSD MobileNet v1 model...');
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      console.log('SSD MobileNet v1 model loaded successfully');
    }
    
    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      console.log('Loading Face Landmark 68 Net model...');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      console.log('Face Landmark 68 Net model loaded successfully');
    }
    
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      console.log('Loading Face Recognition Net model...');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      console.log('Face Recognition Net model loaded successfully');
    }
    
    console.log('All models loaded successfully!');
    console.log('Face-api.js is ready for use');
    
  } catch (error) {
    console.error('Error testing face-api.js:', error);
  }
};

export default testFaceApi;