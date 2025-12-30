// Simple test to check if face-api.js models can be loaded
import * as faceapi from 'face-api.js';

const testModelLoading = async () => {
  console.log('Testing model loading...');
  
  try {
    // Set backend to WebGL to avoid WASM issues
    faceapi.tf.setBackend('webgl');
    await faceapi.tf.ready();
    
    console.log('Loading SSD MobileNet v1 model...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    console.log('SSD MobileNet v1 model loaded successfully');
    
    console.log('Loading Face Landmark 68 Net model...');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    console.log('Face Landmark 68 Net model loaded successfully');
    
    console.log('Loading Face Recognition Net model...');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    console.log('Face Recognition Net model loaded successfully');
    
    console.log('All models loaded successfully!');
  } catch (error) {
    console.error('Error loading models:', error);
  }
};

testModelLoading();