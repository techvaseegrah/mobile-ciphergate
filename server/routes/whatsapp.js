const express = require('express');
const router = express.Router();
const multer = require('multer');
const whatsappController = require('../controllers/whatsappController');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  }
});

// Single file upload for PDF
const pdfUpload = upload.single('pdf');

// Multiple files (for future use)
const mediaUpload = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

// Error handling
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err);
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }
  next();
};

// Send intake with PDF document
router.post('/send-intake-with-media/:jobId', pdfUpload, handleMulterError, whatsappController.sendJobIntakeWithMedia);

// Simple intake notification
router.post('/send-intake/:jobId', whatsappController.sendJobIntakeNotification);

// Handle button click
router.post('/handle-button/:jobId/:buttonType', whatsappController.handleButtonClick);

router.get('/webhook', whatsappController.handleWebhook);
router.post('/webhook', whatsappController.handleWebhook);

// Send device video
router.post('/send-device-video/:jobId', upload.single('video'), handleMulterError, whatsappController.sendDeviceVideo);

router.post('/send-shop-video', whatsappController.sendShopVideoToCustomer);

// Other routes...
router.post('/send-completion/:jobId', whatsappController.sendJobCompletionNotification);
router.post('/send-text', whatsappController.sendTextMessage);
router.get('/status/:messageId', whatsappController.getMessageStatus);
router.get('/test-credentials', whatsappController.testWhatsAppCredentials);
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'WhatsApp API running',
    template: 'new_repair_job_intakee'
  });
});

module.exports = router;
