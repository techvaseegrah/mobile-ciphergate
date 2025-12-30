// Script to verify that face-api.js models are working correctly
import * as faceapi from 'face-api.js';

const verifyModels = async () => {
  console.log('Verifying face-api.js models...');
  
  try {
    // Set backend to WebGL to avoid WASM issues
    console.log('Setting TensorFlow backend to WebGL...');
    faceapi.tf.setBackend('webgl');
    await faceapi.tf.ready();
    console.log('TensorFlow backend set to:', faceapi.tf.getBackend());
    
    // Check if models are already loaded
    console.log('Checking if models are already loaded...');
    console.log('SSD MobileNet v1 loaded:', faceapi.nets.ssdMobilenetv1.isLoaded);
    console.log('Face Landmark 68 Net loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
    console.log('Face Recognition Net loaded:', faceapi.nets.faceRecognitionNet.isLoaded);
    
    if (!faceapi.nets.ssdMobilenetv1.isLoaded || 
        !faceapi.nets.faceLandmark68Net.isLoaded || 
        !faceapi.nets.faceRecognitionNet.isLoaded) {
      
      console.log('Loading models from /models directory...');
      const basePath = '/models';
      
      // Load models one by one
      console.log('Loading SSD MobileNet v1 model...');
      await faceapi.nets.ssdMobilenetv1.loadFromUri(basePath);
      console.log('✓ SSD MobileNet v1 model loaded successfully');
      
      console.log('Loading Face Landmark 68 Net model...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(basePath);
      console.log('✓ Face Landmark 68 Net model loaded successfully');
      
      console.log('Loading Face Recognition Net model...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(basePath);
      console.log('✓ Face Recognition Net model loaded successfully');
      
      // Verify models are loaded
      console.log('Verifying models are loaded:');
      console.log('SSD MobileNet v1 loaded:', faceapi.nets.ssdMobilenetv1.isLoaded);
      console.log('Face Landmark 68 Net loaded:', faceapi.nets.faceLandmark68Net.isLoaded);
      console.log('Face Recognition Net loaded:', faceapi.nets.faceRecognitionNet.isLoaded);
    } else {
      console.log('All models are already loaded');
    }
    
    console.log('✅ All face-api.js models verified successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error verifying models:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Check if it's a tensor shape error
    if (error.message && error.message.includes('tensor should have')) {
      console.error('This indicates the model files are corrupted or incomplete.');
      console.error('Please re-download the model files from the official face-api.js repository.');
    }
    
    return false;
  }
};

// Run the verification
verifyModels();

export default verifyModels;