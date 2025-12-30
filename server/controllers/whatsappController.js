const axios = require('axios');
const FormData = require('form-data');
const { Job, Customer } = require('../models/Schemas');

class WhatsAppController {
  constructor() {
    // WhatsApp API credentials
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'new_repair_job_intakee';
    
    console.log('WhatsApp Controller Initialized:');
    console.log('- Phone Number ID:', this.phoneNumberId ? 'Set' : 'Not Set');
    console.log('- Access Token:', this.accessToken ? 'Set (length: ' + this.accessToken.length + ')' : 'Not Set');
    console.log('- Template Name:', this.templateName);
    console.log('- API Version:', this.apiVersion);
    
    if (this.accessToken && this.phoneNumberId) {
      this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      this.mediaUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/media`;
      console.log('- Base URL:', this.baseUrl);
    }
    
    // Bind all methods
    this.formatPhoneNumber = this.formatPhoneNumber.bind(this);
    this.uploadMedia = this.uploadMedia.bind(this);
    this.sendTemplateWithDocument = this.sendTemplateWithDocument.bind(this);
    this.sendTextMessageInternal = this.sendTextMessageInternal.bind(this);
    this.sendJobIntakeWithMedia = this.sendJobIntakeWithMedia.bind(this);
    this.sendJobIntakeNotification = this.sendJobIntakeNotification.bind(this);
    this.testWhatsAppCredentials = this.testWhatsAppCredentials.bind(this);
    this.sendTextMessage = this.sendTextMessage.bind(this);
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.sendDeviceVideo = this.sendDeviceVideo.bind(this);
    this.sendJobCompletionNotification = this.sendJobCompletionNotification.bind(this);
    this.getMessageStatus = this.getMessageStatus.bind(this);
  }

  // Helper: Format phone number for WhatsApp
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Ensure phone is string
    const phoneStr = phone.toString();
    
    // Remove all non-numeric characters
    let cleaned = phoneStr.replace(/\D/g, '');
    
    // If starts with 0, replace with 91 (India)
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If doesn't start with country code and is 10 digits, add 91 (India)
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  // Upload media to WhatsApp servers
  async uploadMedia(fileBuffer, mimeType, filename) {
    try {
      console.log(`Uploading media: ${filename}, Size: ${(fileBuffer.length / 1024).toFixed(2)}KB, Type: ${mimeType}`);
      
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
      }
      
      // Check file size limits
      const maxSize = mimeType.startsWith('video/') ? 16 * 1024 * 1024 : 5 * 1024 * 1024;
      
      if (fileBuffer.length > maxSize) {
        throw new Error(`File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: mimeType
      });
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);

      console.log(`Making POST request to: ${this.mediaUrl}`);
      
      const response = await axios.post(
        this.mediaUrl,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...formData.getHeaders()
          },
          timeout: 30000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      console.log('✓ Media uploaded successfully, ID:', response.data.id);
      return response.data.id;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      console.error('✗ Error uploading media:', {
        message: errorMessage,
        code: errorCode,
        status: error.response?.status
      });
      throw new Error(`Upload failed: ${errorMessage} (Code: ${errorCode})`);
    }
  }

  // Send template with document header
  async sendTemplateWithDocument(phoneNumber, pdfMediaId, jobData) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log(`Sending template to: ${formattedPhone} (original: ${phoneNumber})`);
      
      const templateData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: this.templateName,
          language: { code: 'en' },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    id: pdfMediaId,
                    filename: `Job_Bill_${jobData.jobCardNumber}.pdf`
                  }
                }
              ]
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: jobData.customerName.substring(0, 30) },
                { type: "text", text: jobData.jobCardNumber.substring(0, 20) },
                { type: "text", text: jobData.deviceModel.substring(0, 30) },
                { type: "text", text: jobData.issue.substring(0, 30) },
                { type: "text", text: jobData.estimatedDate.substring(0, 20) },
                { type: "text", text: `₹${jobData.totalAmount.toFixed(2)}` }
              ]
            },
            {
              type: "button",
              sub_type: "quick_reply",
              index: 0,
              parameters: [
                {
                  type: "payload",
                  payload: "record_device_video"
                }
              ]
            }
          ]
        }
      };

      console.log('Template data:', JSON.stringify(templateData, null, 2));
      
      const response = await axios.post(this.baseUrl, templateData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      console.log('✓ Template with document sent successfully');
      console.log('Response:', response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      console.error('✗ Error sending template with document:', {
        message: errorMessage,
        code: errorCode,
        type: errorType,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw new Error(`Template send failed: ${errorMessage} (Code: ${errorCode})`);
    }
  }

  // Send text message internally
  async sendTextMessageInternal(phoneNumber, text) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const response = await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: text.substring(0, 4096)
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✓ Text message sent to:', formattedPhone);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error('✗ Error in sendTextMessageInternal:', errorMessage);
      throw new Error(`Text send failed: ${errorMessage}`);
    }
  }

  // MAIN: Send job intake notification with media
  async sendJobIntakeWithMedia(req, res) {
    const startTime = Date.now();
    let job = null;
    
    try {
      const { jobId } = req.params;
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`WHATSAPP: Processing template with document for job: ${jobId}`);
      console.log(`${'='.repeat(60)}`);
      
      // Debug the request structure
      console.log('Request debug info:');
      console.log('- Has req.file:', !!req.file);
      console.log('- Has req.files:', !!req.files);
      if (req.files) {
        console.log('- req.files keys:', Object.keys(req.files));
        console.log('- req.files content:', JSON.stringify(Object.keys(req.files)));
      }
      console.log('- Has req.body:', !!req.body);
      if (req.body) {
        console.log('- req.body keys:', Object.keys(req.body).filter(k => k !== 'pdf' || req.body[k].length < 100));
      }
      
      // Find PDF file in request
      let pdfFile = null;
      
      // Check different possible locations for the PDF
      if (req.files && req.files.pdf) {
        // Handle array or single file
        if (Array.isArray(req.files.pdf) && req.files.pdf[0]) {
          pdfFile = req.files.pdf[0];
          console.log('Found PDF in req.files.pdf[0]');
        } else if (req.files.pdf.buffer) {
          pdfFile = req.files.pdf;
          console.log('Found PDF in req.files.pdf (single object)');
        }
      } else if (req.file) {
        pdfFile = req.file;
        console.log('Found PDF in req.file');
      }
      
      if (!pdfFile) {
        console.error('❌ No PDF file found in request!');
        console.log('Falling back to simple notification...');
        return await this.sendJobIntakeNotification(req, res);
      }
      
      console.log(`✅ PDF found: ${pdfFile.originalname || 'unnamed'}`);
      console.log(`   Size: ${(pdfFile.size || pdfFile.buffer?.length || 0) / 1024} KB`);
      console.log(`   MIME type: ${pdfFile.mimetype || 'unknown'}`);
      
      if (!pdfFile.buffer || pdfFile.buffer.length === 0) {
        console.error('❌ PDF buffer is empty!');
        return await this.sendJobIntakeNotification(req, res);
      }
      
      // Get job details from database
      job = await Job.findById(jobId)
        .populate('customer')
        .populate('taken_by_worker', 'name');

      if (!job) {
        console.error('❌ Job not found:', jobId);
        return res.status(404).json({ 
          success: false, 
          error: 'Job not found',
          jobId 
        });
      }

      if (!job.customer?.phone) {
        console.error('❌ Customer phone not found for job:', jobId);
        return res.status(400).json({
          success: false,
          message: 'Customer phone number not found',
          jobId: job._id,
          customerName: job.customer?.name
        });
      }

      const phoneNumber = job.customer.phone;
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const customerName = job.customer.name;
      const jobCardNumber = job.job_card_number || job._id.toString().slice(-6);
      const deviceModel = `${job.device_brand || ''} ${job.device_model}`.trim();
      const issue = job.reported_issue || 'Not specified';
      const estimatedDate = job.estimated_delivery_date ? 
        new Date(job.estimated_delivery_date).toLocaleDateString('en-IN') : 'Will inform soon';
      const totalAmount = job.total_amount || 0;

      console.log(`\n📋 Job Details:`);
      console.log(`   ID: ${jobCardNumber}`);
      console.log(`   Customer: ${customerName}`);
      console.log(`   Phone: ${phoneNumber} -> ${formattedPhone}`);
      console.log(`   Device: ${deviceModel}`);
      console.log(`   Issue: ${issue}`);
      console.log(`   Est. Delivery: ${estimatedDate}`);
      console.log(`   Amount: ₹${totalAmount}`);

      // Check WhatsApp credentials
      if (!this.accessToken || !this.phoneNumberId) {
        console.error('❌ WhatsApp credentials not set');
        return res.status(200).json({
          success: false,
          message: 'WhatsApp API not configured',
          error: 'Missing credentials',
          jobCreated: true,
          jobId: job._id,
          note: 'Job created. WhatsApp skipped due to missing credentials.'
        });
      }

      // Results tracking
      const results = {
        template: { sent: false, error: null, method: null, details: null },
        document: { uploaded: false, sent: false, mediaId: null }
      };

      try {
        // STEP 1: Upload PDF as media
        console.log('\n📤 STEP 1: Uploading PDF document for template header...');
        const uploadStart = Date.now();
        
        const pdfMediaId = await this.uploadMedia(
          pdfFile.buffer,
          'application/pdf',
          `Job_Bill_${jobCardNumber}.pdf`
        );
        
        results.document.uploaded = true;
        results.document.mediaId = pdfMediaId;
        results.document.uploadTime = Date.now() - uploadStart;
        console.log(`✅ PDF uploaded in ${results.document.uploadTime}ms, Media ID: ${pdfMediaId}`);
        
        // STEP 2: Send template with document header
        console.log('\n📨 STEP 2: Sending template with document header...');
        const templateStart = Date.now();
        
        const jobData = {
          customerName,
          jobCardNumber,
          deviceModel,
          issue,
          estimatedDate,
          totalAmount
        };
        
        const templateResponse = await this.sendTemplateWithDocument(phoneNumber, pdfMediaId, jobData);
        
        results.template.sent = true;
        results.template.method = 'template_with_document';
        results.template.details = templateResponse;
        results.template.sendTime = Date.now() - templateStart;
        results.document.sent = true;
        
        console.log(`✅ Template sent in ${results.template.sendTime}ms`);
        
      } catch (templateError) {
        console.error('❌ Template with document failed:', templateError.message);
        results.template.error = templateError.message;
        
        // Fallback: Try simple template without document
        console.log('\n🔄 Trying fallback: Simple template without document...');
        try {
          const fallbackData = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'template',
            template: {
              name: this.templateName,
              language: { code: 'en' },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customerName.substring(0, 30) },
                    { type: "text", text: jobCardNumber.substring(0, 20) },
                    { type: "text", text: deviceModel.substring(0, 30) },
                    { type: "text", text: issue.substring(0, 30) },
                    { type: "text", text: estimatedDate.substring(0, 20) },
                    { type: "text", text: `₹${totalAmount.toFixed(2)}` }
                  ]
                }
              ]
            }
          };
          
          const fallbackResponse = await axios.post(this.baseUrl, fallbackData, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          results.template.sent = true;
          results.template.method = 'template_simple_fallback';
          results.template.details = fallbackResponse.data;
          console.log('✅ Simple template fallback sent');
          
        } catch (fallbackError) {
          console.error('❌ Simple template fallback also failed:', fallbackError.message);
          results.template.error += ` | Fallback: ${fallbackError.message}`;
          
          // Last resort: Send text message
          console.log('\n🔄 Last resort: Sending text message...');
          try {
            const textMessage = `Hello ${customerName},

Your repair job #${jobCardNumber} has been registered!

Device: ${deviceModel}
Issue: ${issue}
Est. Delivery: ${estimatedDate}
Total: ₹${totalAmount.toFixed(2)}

Thank you!`;
            
            await this.sendTextMessageInternal(phoneNumber, textMessage);
            results.template.sent = true;
            results.template.method = 'text_fallback';
            console.log('✅ Text message fallback sent');
            
          } catch (textError) {
            console.error('❌ Text message fallback also failed:', textError.message);
            results.template.error += ` | Text: ${textError.message}`;
          }
        }
      }

      // Update job with notification status
      if (job) {
        job.whatsapp_notification_sent = new Date();
        job.whatsapp_notification_method = results.template.method || 'template_attempted';
        job.whatsapp_template_sent = results.template.sent;
        job.whatsapp_document_sent = results.document.sent;
        job.whatsapp_button_included = true;
        job.whatsapp_notification_details = {
          templateUsed: this.templateName,
          documentIncluded: results.document.sent,
          buttonIncluded: true,
          timestamp: new Date()
        };
        await job.save();
        console.log('✅ Job updated with WhatsApp notification status');
      }

      const totalTime = Date.now() - startTime;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`COMPLETED in ${totalTime}ms`);
      console.log(`Template: ${results.template.sent ? '✅' : '❌'} (${results.template.method})`);
      console.log(`Document: ${results.document.sent ? '✅' : '❌'}`);
      console.log(`Button: ✅ Included`);
      if (results.template.error) console.log(`Error: ${results.template.error}`);
      console.log(`${'='.repeat(60)}\n`);

      return res.json({
        success: results.template.sent,
        message: results.template.sent 
          ? `WhatsApp ${results.template.method} sent successfully`
          : 'WhatsApp notification failed',
        jobId: job?._id || jobId,
        customerName,
        phoneNumber,
        jobCardNumber,
        templateName: this.templateName,
        results: {
          templateSent: results.template.sent,
          templateMethod: results.template.method,
          documentSent: results.document.sent,
          buttonIncluded: true,
          error: results.template.error
        },
        processingTime: `${totalTime}ms`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('\n❌ UNEXPECTED ERROR in sendJobIntakeWithMedia:', error.message);
      console.error('Stack:', error.stack);
      
      const totalTime = Date.now() - startTime;
      
      // Try to update job with failure
      if (job) {
        try {
          job.whatsapp_notification_failed = new Date();
          job.whatsapp_failure_reason = error.message;
          await job.save();
        } catch (saveError) {
          console.error('Failed to update job:', saveError.message);
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Unexpected error in WhatsApp notification',
        error: error.message,
        jobCreated: true,
        jobId: job?._id || req.params.jobId,
        note: 'An unexpected error occurred. The job was created successfully.',
        processingTime: `${totalTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Simple notification fallback
  async sendJobIntakeNotification(req, res) {
    const startTime = Date.now();
    
    try {
      const { jobId } = req.params;
      
      console.log(`\n📱 SIMPLE NOTIFICATION for job: ${jobId}`);
      
      const job = await Job.findById(jobId)
        .populate('customer')
        .populate('taken_by_worker', 'name');

      if (!job) {
        return res.status(404).json({ 
          success: false, 
          error: 'Job not found',
          jobId 
        });
      }

      if (!job.customer?.phone) {
        return res.status(400).json({
          success: false,
          message: 'Customer phone number not found'
        });
      }

      const phoneNumber = job.customer.phone;
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const customerName = job.customer.name;
      const jobCardNumber = job.job_card_number || job._id.toString().slice(-6);
      const deviceModel = `${job.device_brand || ''} ${job.device_model}`.trim();
      const issue = job.reported_issue || 'Not specified';
      const estimatedDate = job.estimated_delivery_date ? 
        new Date(job.estimated_delivery_date).toLocaleDateString('en-IN') : 'Will inform soon';
      const totalAmount = job.total_amount || 0;

      console.log(`Simple notification - Phone: ${phoneNumber}, Job: ${jobCardNumber}`);

      if (!this.accessToken || !this.phoneNumberId) {
        return res.status(200).json({
          success: false,
          message: 'WhatsApp API not configured',
          error: 'Missing credentials',
          jobCreated: true,
          jobId: job._id,
          note: 'Job created. WhatsApp skipped.'
        });
      }

      let templateSent = false;
      let notificationMethod = 'none';
      let templateError = null;
      
      try {
        const templateData = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: {
            name: this.templateName,
            language: { code: 'en' },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: customerName.substring(0, 30) },
                  { type: "text", text: jobCardNumber.substring(0, 20) },
                  { type: "text", text: deviceModel.substring(0, 30) },
                  { type: "text", text: issue.substring(0, 30) },
                  { type: "text", text: estimatedDate.substring(0, 20) },
                  { type: "text", text: `₹${totalAmount.toFixed(2)}` }
                ]
              }
            ]
          }
        };

        console.log('Sending simple WhatsApp template...');
        
        const response = await axios.post(
          this.baseUrl,
          templateData,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        templateSent = true;
        notificationMethod = 'template';
        console.log(`✅ Simple template sent`);
        
      } catch (error) {
        templateError = error.message;
        console.error('❌ Simple template failed:', templateError);
        
        // Try text message as last resort
        try {
          const textMessage = `Hello ${customerName},

Your repair job has been registered!

📋 Job ID: ${jobCardNumber}
📱 Device: ${deviceModel}
🔧 Issue: ${issue}
📅 Est. Delivery: ${estimatedDate}
💰 Total: ₹${totalAmount.toFixed(2)}

Thank you for choosing our service!`;

          await this.sendTextMessageInternal(phoneNumber, textMessage);
          templateSent = true;
          notificationMethod = 'text';
          console.log(`✅ Text message sent`);
          
        } catch (textError) {
          console.error('❌ Text message also failed:', textError.message);
        }
      }

      // Update job
      if (templateSent) {
        job.whatsapp_notification_sent = new Date();
        job.whatsapp_notification_method = notificationMethod;
      } else {
        job.whatsapp_notification_failed = new Date();
        job.whatsapp_failure_reason = templateError || 'Both template and text failed';
      }
      await job.save();

      const processingTime = Date.now() - startTime;

      if (templateSent) {
        return res.json({
          success: true,
          message: `WhatsApp ${notificationMethod} sent successfully`,
          jobId: job._id,
          customerName,
          phoneNumber,
          jobCardNumber,
          notificationMethod,
          processingTime: `${processingTime}ms`
        });
      } else {
        return res.status(200).json({
          success: false,
          message: 'Job created but WhatsApp notification failed',
          jobId: job._id,
          jobCreated: true,
          customerPhone: phoneNumber,
          note: 'The job was created. WhatsApp notification failed.',
          processingTime: `${processingTime}ms`
        });
      }

    } catch (error) {
      console.error('❌ Error in sendJobIntakeNotification:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Unexpected error',
        error: error.message,
        jobCreated: true,
        note: 'An unexpected error occurred.',
        processingTime: `${Date.now() - startTime}ms`
      });
    }
  }

  // Test WhatsApp credentials
  async testWhatsAppCredentials(req, res) {
    try {
      console.log('Testing WhatsApp credentials...');
      
      if (!this.accessToken || !this.phoneNumberId) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp credentials not configured',
          missing: [
            !this.accessToken ? 'WHATSAPP_ACCESS_TOKEN' : null,
            !this.phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : null
          ].filter(Boolean)
        });
      }
      
      const testUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
      console.log('Testing URL:', testUrl);
      
      const response = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ WhatsApp API test successful');
      
      res.json({
        success: true,
        message: 'WhatsApp credentials are valid',
        phoneNumberInfo: response.data,
        credentials: {
          phoneNumberId: this.phoneNumberId,
          businessAccountId: this.businessAccountId,
          apiVersion: this.apiVersion,
          accessTokenSet: !!this.accessToken,
          templateName: this.templateName
        }
      });
    } catch (error) {
      console.error('❌ WhatsApp credential test failed:', error.response?.data || error.message);
      
      const errorResponse = {
        success: false,
        message: 'WhatsApp credential test failed',
        error: error.response?.data?.error?.message || error.message
      };
      
      if (error.response?.data?.error) {
        errorResponse.facebookError = error.response.data.error;
      }
      
      res.status(500).json(errorResponse);
    }
  }

  // Send text message API
  async sendTextMessage(req, res) {
    try {
      const { phoneNumber, text } = req.body;

      if (!phoneNumber || !text) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and text are required'
        });
      }

      console.log(`Sending text message to ${phoneNumber}`);

      if (!this.accessToken || !this.phoneNumberId) {
        return res.status(500).json({
          success: false,
          message: 'WhatsApp API not configured',
          error: 'Missing credentials'
        });
      }

      const result = await this.sendTextMessageInternal(phoneNumber, text);

      res.json({
        success: true,
        message: 'Text message sent successfully',
        data: result
      });
    } catch (error) {
      console.error('Error sending text message:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send text message',
        error: error.message
      });
    }
  }

  // Handle button click
  async handleButtonClick(req, res) {
    const startTime = Date.now();
    
    try {
      const { jobId, buttonType } = req.params;
      const { phoneNumber } = req.body;
      
      console.log(`\n🔘 Handling button click: ${buttonType} for job: ${jobId}`);
      console.log(`Phone: ${phoneNumber}`);
      
      if (!jobId || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Job ID and phone number are required'
        });
      }
      
      const job = await Job.findById(jobId)
        .populate('customer')
        .populate('taken_by_worker', 'name');
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      const customerName = job.customer?.name || 'Customer';
      const jobCardNumber = job.job_card_number || job._id.toString().slice(-6);
      const deviceModel = `${job.device_brand || ''} ${job.device_model}`.trim();
      
      let instructionSent = false;
      
      switch(buttonType) {
        case 'record_device_video':
          const instructionMessage = `🎥 *Record Device Video*
          
Hello ${customerName},

Please record a short video of your device:

📱 *What to include:*
• Show device from all angles
• Point out any damage
• Demonstrate the issue
• Keep under 30 seconds

*Reply to this message with your video.*

📋 Job ID: ${jobCardNumber}
📱 Device: ${deviceModel}

Thank you!`;

          await this.sendTextMessageInternal(phoneNumber, instructionMessage);
          instructionSent = true;
          
          // Store button click
          job.whatsapp_button_clicks = job.whatsapp_button_clicks || [];
          job.whatsapp_button_clicks.push({
            button: buttonType,
            clicked_at: new Date(),
            instruction_sent: true
          });
          await job.save();
          
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Unknown button type'
          });
      }
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Button click handled in ${totalTime}ms`);
      
      res.json({
        success: true,
        message: `Button click handled: ${buttonType}`,
        jobId: job._id,
        customerName,
        jobCardNumber,
        buttonType,
        instructionSent,
        processingTime: `${totalTime}ms`
      });
      
    } catch (error) {
      console.error('❌ Error handling button click:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to handle button click',
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
    }
  }

  // Send device video
  async sendDeviceVideo(req, res) {
    const startTime = Date.now();
    
    try {
      const { jobId } = req.params;
      const { phoneNumber } = req.query;
      const videoFile = req.files?.video?.[0];
      
      console.log(`\n🎥 Sending device video for job: ${jobId}`);
      
      if (!videoFile || !videoFile.buffer || videoFile.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'Video file is required'
        });
      }
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }
      
      const job = await Job.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      const jobCardNumber = job.job_card_number || job._id.toString().slice(-6);
      const deviceModel = `${job.device_brand || ''} ${job.device_model}`.trim();
      
      console.log(`Video size: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      if (!this.accessToken || !this.phoneNumberId) {
        return res.status(500).json({
          success: false,
          message: 'WhatsApp API not configured'
        });
      }
      
      let videoSent = false;
      let videoError = null;
      
      try {
        if (videoFile.size > 16 * 1024 * 1024) {
          throw new Error(`Video too large: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB. Max 16MB.`);
        }
        
        let mimeType = videoFile.mimetype || 'video/mp4';
        if (!mimeType.startsWith('video/')) {
          mimeType = 'video/mp4';
        }
        
        const videoMediaId = await this.uploadMedia(
          videoFile.buffer,
          mimeType,
          `Device_Video_${jobCardNumber}.mp4`
        );
        
        // Send video message
        const response = await axios.post(
          this.baseUrl,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.formatPhoneNumber(phoneNumber),
            type: 'video',
            video: {
              id: videoMediaId,
              caption: `🎥 Device Condition Video\nJob ID: ${jobCardNumber}\nDevice: ${deviceModel}\n\nThank you!`
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
        
        videoSent = true;
        console.log('✅ Device video sent');
        
      } catch (error) {
        videoError = error.message;
        console.error('❌ Error sending video:', videoError);
      }
      
      // Update job
      job.device_video_received = videoSent;
      job.device_video_received_at = new Date();
      job.device_video_sent_to_whatsapp = videoSent;
      job.device_video_error = videoError;
      await job.save();
      
      const totalTime = Date.now() - startTime;
      
      res.json({
        success: videoSent,
        message: videoSent 
          ? 'Device video sent successfully'
          : `Failed to send video: ${videoError}`,
        jobId: job._id,
        jobCardNumber,
        videoSent,
        error: videoError,
        processingTime: `${totalTime}ms`
      });
      
    } catch (error) {
      console.error('❌ Error in sendDeviceVideo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process device video',
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
    }
  }

  // Send job completion notification
  async sendJobCompletionNotification(req, res) {
    const startTime = Date.now();
    
    try {
      const { jobId } = req.params;
      
      console.log(`Processing job completion notification for: ${jobId}`);
      
      const job = await Job.findById(jobId)
        .populate('customer')
        .populate('assigned_technician', 'name');

      if (!job) {
        return res.status(404).json({ 
          success: false,
          error: 'Job not found' 
        });
      }

      if (!job.customer?.phone) {
        return res.status(400).json({
          success: false,
          message: 'Customer phone number not found'
        });
      }

      const phoneNumber = job.customer.phone;
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const customerName = job.customer.name;
      const jobCardNumber = job.job_card_number || job._id.toString().slice(-6);
      const deviceModel = `${job.device_brand || ''} ${job.device_model}`.trim();
      const totalAmount = job.total_amount || 0;
      const advancePayment = job.advance_payment || 0;
      const balanceAmount = Math.max(0, totalAmount - advancePayment);

      console.log(`Job completion - Phone: ${phoneNumber}, Job: ${jobCardNumber}`);

      if (!this.accessToken || !this.phoneNumberId) {
        return res.json({
          success: false,
          message: 'WhatsApp API not configured',
          error: 'Missing credentials',
          note: 'Job marked as completed. WhatsApp notification skipped.'
        });
      }

      let templateSent = false;
      
      // Try template first
      try {
        await axios.post(
          this.baseUrl,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'template',
            template: {
              name: 'repair_job_completed',
              language: { code: 'en' },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customerName.substring(0, 30) },
                    { type: "text", text: jobCardNumber.substring(0, 20) },
                    { type: "text", text: deviceModel.substring(0, 30) }
                  ]
                }
              ]
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        templateSent = true;
        console.log('✅ Completion template sent');
      } catch (templateError) {
        console.log('❌ Completion template failed, using text message');
      }

      // Send collection instructions
      const collectionMessage = `🎉 *Your Device is Ready!*

Hello ${customerName},

Your repair is complete.

📦 *Ready for Collection:*
• Job ID: ${jobCardNumber}
• Device: ${deviceModel}
• Status: ✅ COMPLETED

💰 *Payment:*
• Total: ₹${totalAmount.toFixed(2)}
• Advance: ₹${advancePayment.toFixed(2)}
• Balance: ₹${balanceAmount.toFixed(2)}

📍 Sri Ramanar Mobile Service Center
1E, Kattabomman Street, Tiruvannamalai

⏰ 9 AM - 9:30 PM (Closed Tuesday)
📞 94430 19097

Please bring your job ID. Thank you! 🙏`;
      
      await this.sendTextMessageInternal(phoneNumber, collectionMessage);

      // Update job
      job.whatsapp_completion_sent = new Date();
      job.whatsapp_completion_method = templateSent ? 'template_and_text' : 'text';
      await job.save();

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        message: 'Job completion notification sent',
        jobId: job._id,
        customerName,
        phoneNumber,
        jobCardNumber,
        templateSent,
        processingTime: `${processingTime}ms`
      });

    } catch (error) {
      console.error('❌ Error sending job completion notification:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send job completion notification',
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
    }
  }

  // Get message status
  async getMessageStatus(req, res) {
    try {
      const { messageId } = req.params;
      
      if (!this.accessToken) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp not configured'
        });
      }
      
      const url = `https://graph.facebook.com/${this.apiVersion}/${messageId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 10000
      });

      res.json({
        success: true,
        data: response.data
      });
    } catch (error) {
      console.error('❌ Error getting message status:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get message status',
        error: error.message
      });
    }
  }
}

// Create instance and export
const whatsappController = new WhatsAppController();
module.exports = whatsappController;