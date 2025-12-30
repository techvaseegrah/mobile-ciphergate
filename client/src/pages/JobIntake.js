import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../services/api';
import WhatsAppService from '../services/whatsappService';
import logoImage from '../assets/logo.png';

const JobIntake = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    customerName: '', 
    customerPhone: '', 
    customerEmail: '',
    customerAddress: '',
    aadharNumber: '',
    device_brand: '',
    device_model: '', 
    imei_number: '',
    serial_number: '',
    device_condition: '',
    reported_issue: '', 
    repair_type: 'hardware',
    urgency_level: 'normal',
    estimated_delivery_date: '',
    service_charges: '',
    parts_cost: '',
    advance_payment: '',
    payment_method: 'cash',
    total_amount: '',
    taken_by_worker_id: '',
    job_card_number: ''
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workersRes, nextBillRes] = await Promise.all([
          api.get('/workers'),
          api.get('/jobs/next-bill-number')
        ]);
        
        setWorkers(workersRes.data);
        
        setFormData(prevData => ({
          ...prevData,
          job_card_number: nextBillRes.data.nextBillNumber
        }));
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Customer photo capture state
  const [photo, setPhoto] = useState(null);
  // Device video capture state
  const [deviceVideo, setDeviceVideo] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('user');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingTimerRef = useRef(null);

 // UPDATED: Generate optimized detailed PDF for WhatsApp (with compression)
const generatePDFForWhatsApp = async (jobCardNumber) => {
  console.log('Generating OPTIMIZED detailed PDF for WhatsApp...');
  
  try {
    const dateObj = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${dateObj.getDate()}/${monthNames[dateObj.getMonth()]}/${dateObj.getFullYear()}`;
    
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '210mm';
    pdfContent.style.minHeight = '297mm';
    pdfContent.style.padding = '8mm'; // Reduced padding
    pdfContent.style.backgroundColor = '#ffffff';
    pdfContent.style.boxSizing = 'border-box';
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-9999px';
    pdfContent.style.top = '0';
    pdfContent.style.fontFamily = "'Nirmala UI', 'Arial', sans-serif"; // Simplified font stack
    
    // OPTIMIZED HTML - removed unnecessary styling, compressed content
    pdfContent.innerHTML = `
      <div style="border: 1px solid #000; padding: 5px; height: 100%;">
        <!-- OPTIMIZED HEADER - Reduced font sizes -->
        <div style="text-align: center; margin-bottom: 3px; position: relative;">
          ${logoImage ? `<div style="position: absolute; top: 0; left: 5px;">
             <img src="${logoImage}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'" />
          </div>` : ''}
          
          ${photo ? `<div style="position: absolute; top: 0; right: 5px;">
             <img src="${photo}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'" />
          </div>` : ''}
          
          <h1 style="font-size: 16px; font-weight: bold; margin: 0; padding-top: 5px;">ஸ்ரீ ரமணர் மொபைல் & லேப்டாப் சர்வீஸ் சென்டர்</h1>
          
          <p style="font-size: 10px; margin: 2px 0;">
            1E, கட்டபொம்மன் தெரு, வல்லப விநாயகர் அருகில்,<br/>
            திருவண்ணாமலை - 606601.
          </p>
          <p style="font-size: 11px; font-weight: bold; margin: 2px 0;">
            Mobile : 94430 19097, 94438 11231.
          </p>
          <p style="font-size: 9px; margin: 3px 0;">
            அனைத்து விதமான செல்போன் மற்றும் லேப்டாப் சாதனங்களும் சிறந்த<br/>
            முறையில் பழுது நீக்கி தரப்படும்
          </p>
        </div>

        <!-- OPTIMIZED WORK HOURS SECTION -->
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-bottom: 5px;">
          <div style="width: 40%;">
            <div>வேலை நேரம்</div>
            <div>9.00 a.m. to 9.30 p.m.</div>
            <div style="margin-top: 3px;">செவ்வாய் விடுமுறை</div>
          </div>
          <div style="width: 40%; text-align: right;">
            <div>உணவு இடைவேளை</div>
            <div>1.00 p.m. to 2.30 p.m.</div>
            <div style="margin-top: 3px;">
              <span style="margin-right: 10px;">Bill No.: ${jobCardNumber}</span>
              <span>Date: ${formattedDate}</span>
            </div>
          </div>
        </div>

        <hr style="border-top: 1px solid #000; margin: 2px 0;" />

        <!-- OPTIMIZED CUSTOMER DETAILS -->
        <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px;">
          <div style="width: 60%;">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="width: 50px; font-weight: bold;">பெயர்</td>
                <td style="font-weight: bold;">: ${formData.customerName.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="vertical-align: top; font-weight: bold;">முகவரி</td>
                <td style="font-weight: bold;">: ${formData.customerAddress || 'T.V.MALAI'}</td>
              </tr>
              ${formData.aadharNumber ? `<tr>
                <td style="font-weight: bold;">ஆதார்</td>
                <td style="font-weight: bold;">: ${formData.aadharNumber}</td>
              </tr>` : ''}
            </table>
          </div>
          <div style="width: 35%;">
             <table style="width: 100%; border: none;">
              <tr>
                <td style="width: 50px; font-weight: bold;">செல்</td>
                <td style="font-weight: bold;">: ${formData.customerPhone}</td>
              </tr>
              ${formData.customerEmail ? `<tr>
                <td style="font-weight: bold;">இ.மெயில்</td>
                <td>: ${formData.customerEmail}</td>
              </tr>` : ''}
            </table>
          </div>
        </div>

        <!-- OPTIMIZED DEVICE TABLE -->
        <div style="margin-bottom: 0;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
            <thead>
              <tr style="height: 30px;">
                <th style="border: 1px solid #000; text-align: left; padding: 3px; width: 40%;">Brand & Model</th>
                <th style="border: 1px solid #000; text-align: left; padding: 3px; width: 40%;">Fault</th>
                <th style="border: 1px solid #000; text-align: right; padding: 3px; width: 20%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="height: 40px; vertical-align: top;">
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">
                  ${formData.device_brand ? formData.device_brand + ' ' : ''}${formData.device_model}
                </td>
                <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">
                  ${formData.reported_issue.toUpperCase()}
                </td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">
                  ₹${(formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- OPTIMIZED ACCESSORIES -->
        <div style="border-bottom: 1px solid #000; padding: 5px 3px; font-size: 11px; font-weight: bold;">
          <span style="margin-right: 20px;">Battery : No</span>
          <span style="margin-right: 20px;">MMC : No</span>
          <span>Sim : No</span>
          <div style="margin-top: 3px;">
            பழுது நீக்க பொருள் : <span style="font-weight:normal">${formData.customerName}</span>
          </div>
        </div>

        <!-- CONDENSED TERMS & CONDITIONS (Reduced by 50%) -->
        <div style="padding: 5px 0; font-size: 9px; line-height: 1.3;">
          <div style="font-weight: bold; margin-bottom: 3px;">
            கீழ்கண்ட விதிமுறைகளுக்கு உட்பட்டு பொருட்கள் பழுது பார்த்தலுக்கு எடுத்துக்கொள்ளப்படும்:
          </div>
          
          <div style="display: flex; margin-bottom: 3px;">
            <span style="width: 12px; flex-shrink: 0; font-weight: bold;">1.</span>
            <span>Job Cardல் குறிக்கப்படாத உதிரி பாகங்களுக்கு கடை உரிமையாளர் பொறுப்பல்ல</span>
          </div>

          <div style="display: flex; margin-bottom: 3px;">
            <span style="width: 12px; flex-shrink: 0; font-weight: bold;">2.</span>
            <span>பழுதான உதிரி பாகங்கள் திருப்பி கொடுக்கப்படமாட்டாது</span>
          </div>

          <div style="display: flex; margin-bottom: 3px;">
            <span style="width: 12px; flex-shrink: 0; font-weight: bold;">3.</span>
            <span>பழுதின் கடினத்தைப் பொறுத்து திரும்பக்கொடுக்கும் தேதி மாறுபடும்</span>
          </div>

          <div style="display: flex; margin-bottom: 3px;">
            <span style="width: 12px; flex-shrink: 0; font-weight: bold;">4.</span>
            <span>பழுது பார்க்கும் போது ஏற்கனவே பழுதான பாகங்கள் மேலும் பழுது அடைந்தால் கடை உரிமையாளர்கள் பொறுப்பல்ல</span>
          </div>

          <div style="display: flex; margin-bottom: 3px;">
            <span style="width: 12px; flex-shrink: 0; font-weight: bold;">5.</span>
            <span>அறிவிப்பு தேதியில் இருந்து 2 வாரங்களுக்குள் பொருளை பெற்றுக் கொள்ளாவிட்டால் கடை உரிமையாளர் பொறுப்பல்ல</span>
          </div>

          <div style="display: flex; margin-bottom: 3px;">
            <span style="width: 12px; flex-shrink: 0; font-weight: bold;">6.</span>
            <span>தண்ணீரில் விழுந்த செல்போன்களுக்கும் குறைந்தபட்ச கட்டணம் ரூ 150</span>
          </div>
        </div>

        <!-- OPTIMIZED PAYMENT SUMMARY -->
        <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 3px; font-size: 11px; font-weight: bold; display: flex; justify-content: space-between;">
          <div>Total: ₹${(formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)).toFixed(2)}</div>
          <div>Advance: ₹${(formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment)).toFixed(2)}</div>
          <div>Balance: ₹${((formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)) - (formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment))).toFixed(2)}</div>
        </div>

        <!-- OPTIMIZED SIGNATURE SECTION -->
        <div style="padding: 10px 3px; font-size: 11px; margin-top: 5px;">
           <div style="font-weight: bold; margin-bottom: 20px;">
             நான் எனது பொருளை Job Card ல் கூறப்பட்டுள்ளது போல் நல்ல முறையில் பெற்றுக்கொண்டேன்
           </div>
           
           <div style="display: flex; justify-content: flex-end;">
             <div style="text-align: center;">
               <div style="margin-bottom: 3px;">கையொப்பம்</div>
               <div style="font-size: 9px;">பொருளின் உரிமையாளர் அல்லது முகவர்</div>
             </div>
           </div>
        </div>

        <div style="text-align: center; font-size: 9px; font-weight: bold; margin-top: 5px;">
          *Computer Generated Receipt*
        </div>
      </div>
    `;
    
    document.body.appendChild(pdfContent);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Rendering OPTIMIZED PDF canvas...');
    
    // CRITICAL OPTIMIZATION: Use lower scale and JPEG compression
    const canvas = await html2canvas(pdfContent, {
      scale: 1.2, // Reduced from 1.8 to 1.2 (33% reduction)
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 3000,
      removeContainer: false,
      // Optimize rendering
      allowTaint: true,
      useCORS: true,
      // Reduce quality for size
      quality: 0.7 // Lower quality for smaller file
    });
    
    console.log('Optimized canvas created:', canvas.width, 'x', canvas.height);
    
    // Use JPEG with lower quality for SIGNIFICANT size reduction
    const imgData = canvas.toDataURL('image/jpeg', 0.6); // 0.6 quality (40% reduction)
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Compress the image in PDF
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST'); // FAST compression
    
    const pdfBlob = pdf.output('blob');
    
    document.body.removeChild(pdfContent);
    
    console.log('OPTIMIZED PDF generated for WhatsApp:', (pdfBlob.size / 1024).toFixed(2), 'KB');
    
    // Check if PDF is under 5MB
    if (pdfBlob.size > 5 * 1024 * 1024) {
      console.warn('⚠️ PDF still too large. Trying ultra-compression...');
      
      // If still too large, generate an even more compressed version
      return await generateUltraCompressedPDF(jobCardNumber, formattedDate);
    }
    
    return pdfBlob;
  } catch (err) {
    console.error('Error generating optimized PDF for WhatsApp:', err);
    
    // Fallback: Try to generate a simple text-based PDF
    return await generateSimpleTextPDF(jobCardNumber);
  }
};

// EXTREME COMPRESSION VERSION for when regular optimization isn't enough
const generateUltraCompressedPDF = async (jobCardNumber, formattedDate) => {
  console.log('Generating ULTRA-COMPRESSED PDF...');
  
  try {
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '210mm';
    pdfContent.style.minHeight = '297mm';
    pdfContent.style.padding = '5mm';
    pdfContent.style.backgroundColor = '#ffffff';
    pdfContent.style.boxSizing = 'border-box';
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-9999px';
    pdfContent.style.top = '0';
    pdfContent.style.fontFamily = "Arial, sans-serif"; // Simple fonts only
    
    // ULTRA-MINIMAL CONTENT - Only essential information
    pdfContent.innerHTML = `
      <div style="border: 1px solid #000; padding: 3px; height: 100%;">
        <!-- MINIMAL HEADER -->
        <div style="text-align: center; margin-bottom: 2px;">
          <h1 style="font-size: 14px; font-weight: bold; margin: 0;">Sri Ramanar Mobile Service</h1>
          <p style="font-size: 9px; margin: 1px 0;">Tiruvannamalai - 606601</p>
          <p style="font-size: 10px; font-weight: bold; margin: 1px 0;">94430 19097, 94438 11231</p>
        </div>

        <!-- ESSENTIAL INFO ONLY -->
        <div style="font-size: 9px; margin-bottom: 3px;">
          <div><strong>Bill No:</strong> ${jobCardNumber} | <strong>Date:</strong> ${formattedDate}</div>
          <div><strong>Hours:</strong> 9AM-9:30PM | <strong>Holiday:</strong> Tuesday</div>
        </div>

        <hr style="border-top: 1px solid #000; margin: 1px 0;" />

        <!-- CUSTOMER INFO - Minimal -->
        <div style="font-size: 10px; margin-bottom: 3px;">
          <div><strong>Customer:</strong> ${formData.customerName.toUpperCase()}</div>
          <div><strong>Phone:</strong> ${formData.customerPhone}</div>
          ${formData.customerAddress ? `<div><strong>Address:</strong> ${formData.customerAddress}</div>` : ''}
        </div>

        <!-- DEVICE INFO - Minimal -->
        <div style="font-size: 10px; margin-bottom: 3px;">
          <div><strong>Device:</strong> ${formData.device_brand ? formData.device_brand + ' ' : ''}${formData.device_model}</div>
          <div><strong>Issue:</strong> ${formData.reported_issue.toUpperCase()}</div>
        </div>

        <!-- PAYMENT - Minimal -->
        <div style="font-size: 11px; font-weight: bold; border: 1px solid #000; padding: 3px; margin-bottom: 3px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>₹${(formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Advance:</span>
            <span>₹${(formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment)).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 2px;">
            <span>Balance:</span>
            <span>₹${((formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)) - (formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment))).toFixed(2)}</span>
          </div>
        </div>

        <!-- SHORT TERMS -->
        <div style="font-size: 7px; margin-bottom: 3px; line-height: 1.2;">
          <div><strong>Terms:</strong> 1. Not responsible for non-listed parts. 2. Faulty parts not returned. 3. Delivery date may vary. 4. Minimum 2 days for cost estimate.</div>
        </div>

        <!-- SIGNATURE -->
        <div style="font-size: 9px; text-align: center; margin-top: 10px;">
          <div style="margin-bottom: 15px;">I have received my device as described above</div>
          <div>_________________________</div>
          <div>Customer/Agent Signature</div>
        </div>

        <div style="text-align: center; font-size: 7px; margin-top: 5px;">
          *Computer Generated Receipt*
        </div>
      </div>
    `;
    
    document.body.appendChild(pdfContent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('Rendering ultra-compressed canvas...');
    
    const canvas = await html2canvas(pdfContent, {
      scale: 1.0, // Minimum scale
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      quality: 0.5, // Very low quality
      imageTimeout: 2000
    });
    
    // Use JPEG with very low quality
    const imgData = canvas.toDataURL('image/jpeg', 0.4);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
    
    const pdfBlob = pdf.output('blob');
    
    document.body.removeChild(pdfContent);
    
    console.log('ULTRA-COMPRESSED PDF generated:', (pdfBlob.size / 1024).toFixed(2), 'KB');
    
    return pdfBlob;
  } catch (err) {
    console.error('Error generating ultra-compressed PDF:', err);
    return null;
  }
};

// SIMPLE TEXT-ONLY FALLBACK
const generateSimpleTextPDF = async (jobCardNumber) => {
  console.log('Generating SIMPLE TEXT PDF as fallback...');
  
  try {
    const dateObj = new Date();
    const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    
    const pdf = new jsPDF();
    
    // Add text directly to PDF (no images = very small file)
    pdf.setFontSize(16);
    pdf.text('Sri Ramanar Mobile Service', 105, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.text('Tiruvannamalai - 606601 | 94430 19097', 105, 30, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(`Bill No: ${jobCardNumber}`, 20, 45);
    pdf.text(`Date: ${formattedDate}`, 150, 45);
    
    pdf.line(20, 50, 190, 50);
    
    pdf.setFontSize(11);
    pdf.text(`Customer: ${formData.customerName.toUpperCase()}`, 20, 60);
    pdf.text(`Phone: ${formData.customerPhone}`, 20, 70);
    
    pdf.text(`Device: ${formData.device_brand ? formData.device_brand + ' ' : ''}${formData.device_model}`, 20, 85);
    pdf.text(`Issue: ${formData.reported_issue}`, 20, 95);
    
    pdf.setFontSize(12);
    pdf.text(`Total Amount: ₹${(formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)).toFixed(2)}`, 20, 115);
    pdf.text(`Advance: ₹${(formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment)).toFixed(2)}`, 20, 125);
    pdf.text(`Balance: ₹${((formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)) - (formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment))).toFixed(2)}`, 20, 135);
    
    pdf.setFontSize(10);
    pdf.text('Thank you for choosing our service!', 105, 180, { align: 'center' });
    pdf.text('*Computer Generated Receipt*', 105, 190, { align: 'center' });
    
    const pdfBlob = pdf.output('blob');
    console.log('Simple text PDF generated:', (pdfBlob.size / 1024).toFixed(2), 'KB');
    
    return pdfBlob;
  } catch (err) {
    console.error('Error generating simple text PDF:', err);
    return null;
  }
};

  // Function to generate and download PDF (full quality for local)
const generateAndDownloadPDF = async (jobData) => {
  console.log('Generating local PDF for download...');
  
  try {
    const dateObj = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${dateObj.getDate()}/${monthNames[dateObj.getMonth()]}/${dateObj.getFullYear()}`;
    
    const pdfContent = document.createElement('div');
    pdfContent.style.width = '210mm';
    pdfContent.style.minHeight = '297mm';
    pdfContent.style.padding = '10mm';
    pdfContent.style.backgroundColor = '#ffffff';
    pdfContent.style.boxSizing = 'border-box';
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-9999px';
    pdfContent.style.fontFamily = "'Nirmala UI', 'Arial Unicode MS', 'Arial', sans-serif"; 
    
    // Use the SAME detailed content for consistency
    pdfContent.innerHTML = `
      <div style="border: 1px solid #000; padding: 10px; height: 100%; position: relative;">
        <div style="text-align: center; margin-bottom: 5px; position: relative;">
          <div style="position: absolute; top: 0; left: 10px;">
             <img src="${logoImage}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'" />
          </div>
          
          ${photo ? `<div style="position: absolute; top: 0; right: 10px;">
             <img src="${photo}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover;" />
          </div>` : ''}
          
          <h1 style="font-size: 20px; font-weight: bold; margin: 0; padding-top: 5px;">ஸ்ரீ ரமணர் மொபைல் & லேப்டாப் சர்வீஸ் சென்டர்</h1>
          
          <p style="font-size: 12px; margin: 4px 0;">
            1E, கட்டபொம்மன் தெரு, வல்லப விநாயகர் அருகில்,<br/>
            திருவண்ணாமலை - 606601.
          </p>
          <p style="font-size: 13px; font-weight: bold; margin: 4px 0;">
            Mobile : 94430 19097, 94438 11231.
          </p>
          <p style="font-size: 11px; margin: 5px 0;">
            அனைத்து விதமான செல்போன் மற்றும் லேப்டாப் சாதனங்களும் சிறந்த<br/>
            முறையில் பழுது நீக்கி தரப்படும்
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 10px;">
          <div style="width: 40%;">
            <div>வேலை நேரம்</div>
            <div>9.00 a.m. to 9.30 p.m.</div>
            <div style="margin-top: 5px;">செவ்வாய் விடுமுறை</div>
          </div>
          <div style="width: 40%; text-align: right;">
            <div>உணவு இடைவேளை</div>
            <div>1.00 p.m. to 2.30 p.m.</div>
            <div style="margin-top: 5px;">
              <span style="margin-right: 15px;">Bill No.: ${jobData.job_card_number || jobData._id.slice(-4)}</span>
              <span>Date: ${formattedDate}</span>
            </div>
          </div>
        </div>

        <hr style="border-top: 1px solid #000; margin: 0;" />

        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px;">
          <div style="width: 60%;">
            <table style="width: 100%; border: none;">
              <tr>
                <td style="width: 60px; font-weight: bold;">பெயர்</td>
                <td style="font-weight: bold;">: ${formData.customerName.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="vertical-align: top; font-weight: bold;">முகவரி</td>
                <td style="font-weight: bold;">: ${formData.customerAddress || 'T.V.MALAI'}</td>
              </tr>
              ${formData.aadharNumber ? `<tr>
                <td style="font-weight: bold;">ஆதார்</td>
                <td style="font-weight: bold;">: ${formData.aadharNumber}</td>
              </tr>` : ''}
            </table>
          </div>
          <div style="width: 35%;">
             <table style="width: 100%; border: none;">
              <tr>
                <td style="width: 60px; font-weight: bold;">செல்</td>
                <td style="font-weight: bold;">: ${formData.customerPhone}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">இ.மெயில்</td>
                <td>: ${formData.customerEmail || ''}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="margin-bottom: 0;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 13px;">
            <thead>
              <tr style="height: 40px;">
                <th style="border: 1px solid #000; text-align: left; padding: 5px; width: 40%;">Brand & Model</th>
                <th style="border: 1px solid #000; text-align: left; padding: 5px; width: 40%;">Fault</th>
                <th style="border: 1px solid #000; text-align: right; padding: 5px; width: 20%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="height: 50px; vertical-align: top;">
                <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">
                  ${formData.device_brand ? formData.device_brand + ' ' : ''}${formData.device_model}
                </td>
                <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">
                  ${formData.reported_issue.toUpperCase()}
                </td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">
                  ${(formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="border-bottom: 1px solid #000; padding: 10px 5px; font-size: 13px; font-weight: bold;">
          <span style="margin-right: 30px;">Battery : No</span>
          <span style="margin-right: 30px;">MMC : No</span>
          <span>Sim : No</span>
          <div style="margin-top: 5px;">
            பழுது நீக்கவேண்டிய பொருள் யாரால் கொண்டுவரப்பட்டது : <span style="font-weight:normal">${formData.customerName}</span>
          </div>
        </div>

        <div style="padding: 10px 0; font-size: 11px; line-height: 1.4;">
          <div style="font-weight: bold; margin-bottom: 5px;">
            கீழ்கண்ட கட்டுப்பாடுகள் மற்றும் விதிமுறைகளுக்கு உட்பட்டு தங்களுடைய பொருட்கள் பழுது பார்த்தலுக்கு எடுத்துக்கொள்ளப்படும்:
          </div>
          
          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">1.</span>
            <span>Job Cardல் குறிக்கப்படாத உதிரி பாகங்களுக்கு கடை உரிமையாளர் பொறுப்பல்ல</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">2.</span>
            <span>பழுதான உதிரி பாகங்கள் (பேட்டரி உட்பட) திருப்பி கொடுக்கப்படமாட்டாது</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">3.</span>
            <span>பழுதின் கடினத்தைப் பொறுத்தும் உதிரிபாகங்கள் கிடைப்பதைப் பொறுத்தும் திரும்பக்கொடுக்கும் தேதி மாறுபடும்.</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">4.</span>
            <span>பழுதின் செலவினங்களை கணக்கிட்டு சொல்வதற்கு குறைந்தது இரண்டு நாட்கள் தரப்படவேண்டும்.</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">5.</span>
            <span>பழுது பார்க்கும் போது ஏற்கனவே பழுதான பாகங்கள் மேலும் பழுது அடைந்தால் கடை உரிமையாளர்கள் பொறுப்பல்ல</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">6.</span>
            <span>பழுதுபார்த்தலுக்கு தரப்பட்ட பொருட்கள் தொடர்பான தஸ்தாவேஜிகளில் ஏதாவது தவறு இருந்தால் அதற்கு கடை உரிமையாளர் பொறுப்பல்ல.</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">7.</span>
            <span>அறிவிப்பு தேதியில் இருந்து குறைந்தது இரண்டு வாரங்களுக்குள் வாடிக்கையாளர் தமது பொருளை பெற்றுக் கொள்ளாவிட்டால் எந்தவிதமான உரிமை கொண்டாடுவதற்கும் கடை உரிமையாளர் பொறுப்பல்ல.</span>
          </div>

          <div style="display: flex; margin-bottom: 5px;">
            <span style="width: 15px; flex-shrink: 0; font-weight: bold;">8.</span>
            <span>தண்ணீரில் விழுந்த அனைத்துவிதமான செல்போன்களுக்கும் குறைந்தபட்ச பழுது கட்டணமாக ரூ 150 கண்டிப்பாக வசூலிக்கப்படும்.</span>
          </div>
        </div>

        <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 5px; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between;">
          <div>Total Amount: ${(formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)).toFixed(2)}</div>
          <div>Advance: ${(formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment)).toFixed(2)}</div>
          <div>Net Amount: ${((formData.total_amount === '' ? 0 : parseFloat(formData.total_amount)) - (formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment))).toFixed(2)}</div>
        </div>

        <div style="padding: 20px 5px; font-size: 13px; margin-top: 10px;">
           <div style="font-weight: bold; margin-bottom: 30px;">
             நான் எனது பொருளை Job Card ல் கூறப்பட்டுள்ளது போல் நல்ல முறையில் பெற்றுக்கொண்டேன்
           </div>
           
           <div style="display: flex; justify-content: flex-end;">
             <div style="text-align: center;">
               <div style="margin-bottom: 5px;">கையொப்பம்</div>
               <div>பொருளின் உரிமையாளர் அல்லது முகவர்</div>
             </div>
           </div>
        </div>

        <div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: 10px;">
          *Computer Generated Receipt*
        </div>
      </div>
    `;
    
    document.body.appendChild(pdfContent);
    
    const canvas = await html2canvas(pdfContent, {
      scale: 2, // Higher scale for better download quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const filename = `Bill_${jobData.job_card_number || jobData._id}_${formData.customerName}.pdf`;
    pdf.save(filename);
    
    document.body.removeChild(pdfContent);
    
    console.log('Local PDF downloaded:', filename);
  } catch (err) {
    console.error('Error generating local PDF:', err);
    throw err;
  }
};

  // Helper function to convert video blob URL to actual blob
  const getVideoBlob = async (videoBlobUrl) => {
    if (!videoBlobUrl) return null;
    
    try {
      const response = await fetch(videoBlobUrl);
      const blob = await response.blob();
      console.log('Video blob retrieved:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
      return blob;
    } catch (error) {
      console.error('Error fetching video blob:', error);
      return null;
    }
  };

  // Function to reset form after successful submission
  const resetForm = async () => {
    setFormData({
      customerName: '', 
      customerPhone: '', 
      customerEmail: '',
      customerAddress: '',
      aadharNumber: '',
      device_brand: '',
      device_model: '', 
      imei_number: '',
      serial_number: '',
      device_condition: '',
      reported_issue: '', 
      repair_type: 'hardware',
      urgency_level: 'normal',
      estimated_delivery_date: '',
      service_charges: '',
      parts_cost: '',
      advance_payment: '',
      payment_method: 'cash',
      total_amount: '',
      taken_by_worker_id: '',
      job_card_number: ''
    });
    
    setPhoto(null);
    setDeviceVideo(null);
    
    try {
      const nextBillRes = await api.get('/jobs/next-bill-number');
      setFormData(prevData => ({
        ...prevData,
        job_card_number: nextBillRes.data.nextBillNumber
      }));
    } catch (err) {
      console.error('Error fetching next bill number:', err);
    }
  };

  // FIXED: handleSubmit with proper PDF sending
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsProcessing(true);
    setError('');
    setSuccess('');
    setProcessingStatus('Creating job...');
    
    const startTime = Date.now();
    
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        service_charges: formData.service_charges === '' ? 0 : parseFloat(formData.service_charges),
        parts_cost: formData.parts_cost === '' ? 0 : parseFloat(formData.parts_cost),
        advance_payment: formData.advance_payment === '' ? 0 : parseFloat(formData.advance_payment),
        total_amount: formData.total_amount === '' ? 0 : parseFloat(formData.total_amount),
        customer_photo: photo,
        device_video: deviceVideo
      };
      
      console.log('='.repeat(50));
      console.log('STEP 1: Creating job...');
      
      // 1. Create job
      const response = await api.post('/jobs', submitData);
      const jobId = response.data.job._id;
      const jobCardNumber = formData.job_card_number;
      
      console.log('Job created:', jobId, `(${Date.now() - startTime}ms)`);
      setProcessingStatus('Job created. Generating PDF...');
      
      // 2. Generate PDF for WhatsApp FIRST (before download)
      console.log('STEP 2: Generating PDF for WhatsApp...');
      let pdfBlob = null;
      
      try {
        pdfBlob = await generatePDFForWhatsApp(jobCardNumber);
        if (pdfBlob) {
          console.log('PDF for WhatsApp generated:', (pdfBlob.size / 1024).toFixed(2), 'KB', `(${Date.now() - startTime}ms)`);
        } else {
          console.warn('PDF generation returned null');
        }
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
      }
      
      // 3. Download local PDF (parallel with WhatsApp)
      console.log('STEP 3: Starting parallel operations...');
      setProcessingStatus('Downloading PDF & sending WhatsApp...');
      
      // Start PDF download (don't wait)
      const downloadPromise = generateAndDownloadPDF({ 
        job_card_number: jobCardNumber,
        _id: jobId 
      }).then(() => {
        console.log('Local PDF downloaded', `(${Date.now() - startTime}ms)`);
      }).catch(err => {
        console.error('PDF download error:', err);
      });
      
      // 4. Get video blob if exists
      let videoBlobData = null;
      if (deviceVideo) {
        console.log('Getting video blob...');
        videoBlobData = await getVideoBlob(deviceVideo);
      }
      
      // In handleSubmit function:
      console.log('STEP 4: Sending WhatsApp template with PDF...');
      console.log('PDF status:', pdfBlob ? `${(pdfBlob.size / 1024).toFixed(2)}KB` : 'None');

      let whatsappResult = { success: false, message: 'Not attempted' };

      try {
        // ALWAYS try to send with PDF first
        if (pdfBlob) {
          console.log('Calling sendJobIntakeWithMedia for template document...');
          whatsappResult = await WhatsAppService.sendJobIntakeWithMedia(
            jobId,
            pdfBlob // Send only PDF
          );
        } else {
          console.log('No PDF available, falling back to simple notification...');
          whatsappResult = await WhatsAppService.sendJobIntakeNotification(jobId);
        }
        console.log('WhatsApp result:', whatsappResult);
      } catch (whatsappError) {
        console.error('WhatsApp error:', whatsappError);
        whatsappResult = {
          success: false,
          message: whatsappError.message || 'WhatsApp notification failed'
        };
      }
      
      // Wait for PDF download to complete
      await downloadPromise;
      
      // 6. Set success message
      const totalTime = Date.now() - startTime;
      console.log('='.repeat(50));
      console.log(`COMPLETED in ${totalTime}ms`);
      console.log('='.repeat(50));
      
      let successMessage = `✅ Job #${jobCardNumber} created! PDF downloaded.`;
      
      if (whatsappResult?.success) {
        const mediaStatus = [];
        if (whatsappResult.results?.pdf?.sent) mediaStatus.push('PDF');
        if (whatsappResult.results?.photo?.sent) mediaStatus.push('Photo');
        if (whatsappResult.results?.video?.sent) mediaStatus.push('Video');
        
        if (mediaStatus.length > 0) {
          successMessage += ` WhatsApp sent with: ${mediaStatus.join(', ')} ✓`;
        } else if (whatsappResult.results?.template?.sent) {
          successMessage += ' WhatsApp template sent ✓';
        }
      } else if (whatsappResult?.results?.template?.sent) {
        successMessage += ' WhatsApp template sent ✓';
        
        // Show which media failed
        const failed = [];
        if (whatsappResult.results?.pdf?.error) failed.push('PDF');
        if (whatsappResult.results?.photo?.error) failed.push('Photo');
        if (whatsappResult.results?.video?.error) failed.push('Video');
        
        if (failed.length > 0) {
          successMessage += ` (${failed.join(', ')} failed)`;
        }
      } else {
        successMessage += ` (WhatsApp: ${whatsappResult?.message || 'failed'})`;
      }
      
      successMessage += ` [${(totalTime / 1000).toFixed(1)}s]`;
      
      setSuccess(successMessage);
      setProcessingStatus('');
      
      // 7. Reset form
      await resetForm();
      
    } catch (err) {
      console.error('Job creation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create job. Please try again.');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure you have given permission.');
    }
  }, [cameraFacingMode]);
  
  // Capture customer photo from camera
  const captureCustomerPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Use JPEG with good quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Photo captured, size:', (dataUrl.length / 1024).toFixed(2), 'KB');
      
      setPhoto(dataUrl);
      setShowCamera(false);
      setCameraMode('photo');
      
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
  };
  
  // Start device video recording
  const startDeviceVideoRecording = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const mediaStream = videoRef.current.srcObject;
        const recorder = new MediaRecorder(mediaStream, {
          mimeType: 'video/webm;codecs=vp8'
        });
        const chunks = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          console.log('Video recorded, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
          setDeviceVideo(videoUrl);
          setCameraMode('video');
          
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          setRecordingTime(0);
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Error starting recording:', err);
        setError('Could not start recording');
      }
    }
  };
  
  // Stop device video recording
  const stopDeviceVideoRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }
  };
  
  // Switch camera (front/back)
  const switchCamera = () => {
    setCameraFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };
  
  // Remove customer photo
  const removeCustomerPhoto = () => {
    setPhoto(null);
  };
  
  // Remove device video
  const removeDeviceVideo = () => {
    setDeviceVideo(null);
  };
  
  // Open camera for customer photo
  const openCustomerPhotoCamera = () => {
    setCameraMode('photo');
    setShowCamera(true);
  };
  
  // Open camera for device video
  const openDeviceVideoCamera = () => {
    setCameraMode('video');
    setShowCamera(true);
  };
  
  // Close camera
  const closeCamera = () => {
    if (isRecording) {
      stopDeviceVideoRecording();
    }
    setShowCamera(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  };
  
  // Handle camera cancel
  const handleCameraCancel = () => {
    closeCamera();
  };
  
  // Effect to reinitialize camera when facing mode changes
  useEffect(() => {
    if (showCamera) {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      initCamera();
    }
  }, [cameraFacingMode, showCamera, initCamera]);

  // Cleanup camera streams on unmount
  useEffect(() => {
    const videoElement = videoRef.current;
    return () => {
      if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen ml-64 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen ml-64">
      <style>
        {`
          .hide-spinners::-webkit-outer-spin-button,
          .hide-spinners::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .hide-spinners {
            -moz-appearance: textfield;
          }
        `}
      </style>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">New Job Intake</h1>
        <p className="text-gray-600">Create a new repair job</p>
        {isProcessing && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-600">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">{processingStatus || 'Processing...'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error and Success messages */}
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

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Information</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customerName">
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customerPhone">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customerEmail">
                  Email
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customerAddress">
                  Address (City)
                </label>
                <input
                  type="text"
                  id="customerAddress"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g. T.V.MALAI"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="aadharNumber">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  id="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                    setFormData({...formData, aadharNumber: value});
                  }}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="12-digit Aadhar number"
                />
                {formData.aadharNumber && formData.aadharNumber.length < 12 && (
                  <p className="text-red-500 text-xs italic mt-1">Aadhar number must be 12 digits</p>
                )}
              </div>
              
              {/* Customer Photo Capture Section */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Customer Photo
                </label>
                
                {photo ? (
                  <div className="flex items-center space-x-4">
                    <img 
                      src={photo} 
                      alt="Customer" 
                      className="w-24 h-24 object-cover rounded border"
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={removeCustomerPhoto}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openCustomerPhotoCamera}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    📷 Take Customer Photo
                  </button>
                )}
              </div>
              
              {/* Device Video Capture Section */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Device Video
                </label>
                
                {deviceVideo ? (
                  <div className="flex items-center space-x-4">
                    <video 
                      src={deviceVideo} 
                      className="w-24 h-24 object-cover rounded border"
                      controls
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={removeDeviceVideo}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openDeviceVideoCamera}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    🎥 Record Device Video
                  </button>
                )}
              </div>
              
              {/* Camera Modal */}
              {showCamera && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold">{cameraMode === 'photo' ? '📷 Take Customer Photo' : '🎥 Record Device Video'}</h3>
                    </div>
                    <div className="p-4">
                      <div className="relative mb-4">
                        <video 
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted={isRecording}
                          className="w-full h-auto max-h-[50vh] object-contain rounded border bg-black"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        {isRecording && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded flex items-center">
                            <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                            REC {recordingTime}s
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <button
                          type="button"
                          onClick={switchCamera}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex-1"
                        >
                          🔄 {cameraFacingMode === 'user' ? 'Back' : 'Front'} Camera
                        </button>
                        {!isRecording ? (
                          cameraMode === 'photo' ? (
                            <button
                              type="button"
                              onClick={captureCustomerPhoto}
                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex-1"
                            >
                              📷 Capture
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={startDeviceVideoRecording}
                              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex-1"
                            >
                              ⏺️ Start Recording
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={stopDeviceVideoRecording}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex-1"
                          >
                            ⏹️ Stop ({recordingTime}s)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleCameraCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex-1"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Device Information</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="device_brand">
                  Device Brand
                </label>
                <input
                  type="text"
                  id="device_brand"
                  value={formData.device_brand}
                  onChange={(e) => setFormData({...formData, device_brand: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g. 1+"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="device_model">
                  Device Model *
                </label>
                <input
                  type="text"
                  id="device_model"
                  value={formData.device_model}
                  onChange={(e) => setFormData({...formData, device_model: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  placeholder="e.g. NORD CE2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="imei_number">
                  IMEI Number
                </label>
                <input
                  type="text"
                  id="imei_number"
                  value={formData.imei_number}
                  onChange={(e) => setFormData({...formData, imei_number: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="serial_number">
                  Serial Number
                </label>
                <input
                  type="text"
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="device_condition">
                  Device Condition
                </label>
                <textarea
                  id="device_condition"
                  value={formData.device_condition}
                  onChange={(e) => setFormData({...formData, device_condition: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="2"
                  placeholder="Cosmetic damage, screen cracks, etc."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Service Details</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="reported_issue">
                  Fault / Issue *
                </label>
                <textarea
                  id="reported_issue"
                  value={formData.reported_issue}
                  onChange={(e) => setFormData({...formData, reported_issue: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                  required
                  placeholder="e.g. DEAD"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="repair_type">
                  Repair Type
                </label>
                <select
                  id="repair_type"
                  value={formData.repair_type}
                  onChange={(e) => setFormData({...formData, repair_type: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="diagnostics">Diagnostics</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="urgency_level">
                  Urgency Level
                </label>
                <select
                  id="urgency_level"
                  value={formData.urgency_level}
                  onChange={(e) => setFormData({...formData, urgency_level: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="normal">Normal</option>
                  <option value="express">Express</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="estimated_delivery_date">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  id="estimated_delivery_date"
                  value={formData.estimated_delivery_date}
                  onChange={(e) => setFormData({...formData, estimated_delivery_date: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Financial Details</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="total_amount">
                  Total Amount (Rs) *
                </label>
                <input
                  type="number"
                  id="total_amount"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({...formData, total_amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline hide-spinners"
                  min="0"
                  step="0.01"
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="advance_payment">
                  Advance Payment (Rs)
                </label>
                <input
                  type="number"
                  id="advance_payment"
                  value={formData.advance_payment}
                  onChange={(e) => setFormData({...formData, advance_payment: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline hide-spinners"
                  min="0"
                  step="0.01"
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="payment_method">
                  Payment Method
                </label>
                <select
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4 mt-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="taken_by_worker_id">
              Taken By (Worker)
            </label>
            <select
              id="taken_by_worker_id"
              value={formData.taken_by_worker_id}
              onChange={(e) => setFormData({...formData, taken_by_worker_id: e.target.value})}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Select Worker (Optional)</option>
              {workers.map(worker => (
                <option key={worker._id} value={worker._id}>{worker.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="job_card_number">
              Job Card Number (Bill No)
            </label>
            <input
              type="text"
              id="job_card_number"
              value={formData.job_card_number}
              onChange={(e) => setFormData({...formData, job_card_number: e.target.value})}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              type="submit"
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  📄 Create Job, Download PDF & Send WhatsApp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobIntake;