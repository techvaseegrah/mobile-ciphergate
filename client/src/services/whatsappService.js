import api from './api';

class WhatsAppService {
  // Send job intake notification with template document
  static async sendJobIntakeWithMedia(jobId, pdfBlob) {
    try {
      console.log(`[WhatsApp] Sending intake with template document for job: ${jobId}`);
      
      // Check if we have a PDF blob
      if (!pdfBlob || pdfBlob.size === 0) {
        console.log('[WhatsApp] No PDF provided, falling back to notification');
        return await this.sendJobIntakeNotification(jobId);
      }
      
      console.log(`[WhatsApp] PDF size: ${(pdfBlob.size / 1024).toFixed(2)}KB`);
      
      // Create FormData with the PDF
      const formData = new FormData();
      
      // Create a File object from the blob
      const pdfFile = new File([pdfBlob], `Bill_${jobId}.pdf`, { 
        type: 'application/pdf' 
      });
      
      // Append the file to FormData
      formData.append('pdf', pdfFile);
      
      console.log(`[WhatsApp] FormData created, sending to server...`);
      
      // Send to server
      const response = await api.post(`/whatsapp/send-intake-with-media/${jobId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });
      
      console.log('[WhatsApp] Server response:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('[WhatsApp] Error sending with media:', error);
      
      // Fall back to simple notification
      try {
        console.log('[WhatsApp] Trying fallback notification...');
        return await this.sendJobIntakeNotification(jobId);
      } catch (fallbackError) {
        console.error('[WhatsApp] Fallback also failed:', fallbackError);
      }
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'WhatsApp notification failed',
        jobCreated: true,
        error: error.message
      };
    }
  }

  // Send job intake notification (without media - for fallback)
  static async sendJobIntakeNotification(jobId) {
    try {
      console.log(`[WhatsApp] Sending intake notification for job: ${jobId}`);
      const response = await api.post(`/whatsapp/send-intake/${jobId}`);
      console.log('[WhatsApp] Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[WhatsApp] Error sending notification:', error);
      
      if (error.response?.data?.jobCreated) {
        return {
          success: false,
          message: error.response.data.message || 'WhatsApp notification failed',
          jobCreated: true
        };
      }
      
      throw error;
    }
  }

  // Handle button click response
  static async handleButtonClick(jobId, buttonType, phoneNumber) {
    try {
      console.log(`[WhatsApp] Handling button click: ${buttonType} for job: ${jobId}`);
      
      const response = await api.post(`/whatsapp/handle-button/${jobId}/${buttonType}`, {
        phoneNumber: phoneNumber
      });
      
      console.log('[WhatsApp] Button click response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[WhatsApp] Error handling button click:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Button click handling failed'
      };
    }
  }

  // In WhatsAppService.js, update sendDeviceVideo function:

static async sendDeviceVideo(jobId, phoneNumber, videoBlob) {
  try {
    console.log(`[WhatsApp] Sending device video for job: ${jobId}`);
    console.log(`[WhatsApp] Phone: ${phoneNumber}`);
    console.log(`[WhatsApp] Video blob type: ${typeof videoBlob}, size: ${videoBlob?.size || 0} bytes`);
    
    let actualVideoBlob = videoBlob;
    
    // If videoBlob is a URL (blob: or data:), fetch it
    if (typeof videoBlob === 'string') {
      if (videoBlob.startsWith('blob:')) {
        console.log('[WhatsApp] Fetching video from blob URL...');
        const response = await fetch(videoBlob);
        actualVideoBlob = await response.blob();
      } else if (videoBlob.startsWith('data:')) {
        console.log('[WhatsApp] Converting data URL to blob...');
        actualVideoBlob = await this.dataURLtoBlob(videoBlob);
      }
    }
    
    if (!actualVideoBlob || actualVideoBlob.size === 0) {
      console.error('[WhatsApp] Video blob is empty!');
      return {
        success: false,
        message: 'Video file is empty'
      };
    }
    
    console.log(`[WhatsApp] Final video blob: ${(actualVideoBlob.size / 1024 / 1024).toFixed(2)}MB`);
    
    const formData = new FormData();
    
    // Create a proper File object
    const videoFile = new File([actualVideoBlob], `Device_Video_${jobId}.mp4`, { 
      type: 'video/mp4' 
    });
    
    formData.append('video', videoFile);
    console.log(`[WhatsApp] FormData created, video size: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Send to server
    const response = await api.post(`/whatsapp/send-device-video/${jobId}?phoneNumber=${phoneNumber}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    });
    
    console.log('[WhatsApp] Server response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('[WhatsApp] Error sending device video:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to send device video'
    };
  }
}

  // Convert data URL to Blob
  static async dataURLtoBlob(dataURL) {
    try {
      if (!dataURL || typeof dataURL !== 'string') {
        throw new Error('Invalid data URL');
      }
      
      if (!dataURL.startsWith('data:')) {
        throw new Error('Not a data URL');
      }
      
      const arr = dataURL.split(',');
      if (arr.length < 2) {
        throw new Error('Invalid data URL format');
      }
      
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      const blob = new Blob([u8arr], { type: mime });
      console.log(`[WhatsApp] Converted data URL to blob: ${(blob.size / 1024).toFixed(2)}KB, type: ${mime}`);
      
      return blob;
    } catch (error) {
      console.error('[WhatsApp] Error converting dataURL to blob:', error);
      
      // Fallback: Try fetch method
      try {
        console.log('[WhatsApp] Trying fetch method for data URL conversion...');
        const response = await fetch(dataURL);
        const blob = await response.blob();
        console.log(`[WhatsApp] Fetch method succeeded: ${(blob.size / 1024).toFixed(2)}KB`);
        return blob;
      } catch (fetchError) {
        console.error('[WhatsApp] Fetch method also failed:', fetchError);
        throw error;
      }
    }
  }

  // Send job completion notification
  static async sendJobCompletionNotification(jobId) {
    try {
      const response = await api.post(`/whatsapp/send-completion/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error sending job completion notification:', error);
      
      if (error.response?.data?.note) {
        return {
          success: false,
          message: error.response.data.message,
          note: error.response.data.note
        };
      }
      
      throw error;
    }
  }

  // Send custom text message
  static async sendTextMessage(phoneNumber, text) {
    try {
      const response = await api.post('/whatsapp/send-text', {
        phoneNumber,
        text
      });
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  }

  // Test connection
  static async testConnection() {
    try {
      const response = await api.get('/whatsapp/health');
      return response.data;
    } catch (error) {
      console.error('WhatsApp connection test failed:', error);
      throw error;
    }
  }

  // Test WhatsApp credentials
  static async testCredentials() {
    try {
      const response = await api.get('/whatsapp/test-credentials');
      return response.data;
    } catch (error) {
      console.error('Error testing WhatsApp credentials:', error);
      throw error;
    }
  }
}

export default WhatsAppService;
