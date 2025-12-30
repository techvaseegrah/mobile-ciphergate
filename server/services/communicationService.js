const sendCustomerNotification = async (type, jobDetails, customerPhone) => {
  // Placeholder for Twilio SDK
  console.log(`[COMM-SERVICE] Trigger: ${type}`);
  console.log(`[COMM-SERVICE] To: ${customerPhone}`);
  
  let message = "";
  if (type === 'INTAKE') {
    message = `Your device ${jobDetails.device_model} has been received at RepairShop. Job ID: ${jobDetails._id}.`;
  } else if (type === 'DONE') {
    message = `Your device ${jobDetails.device_model} repair is complete! Final Price: ${jobDetails.final_customer_price}.`;
  }
  
  console.log(`[SMS SENT]: ${message}`);
  // await twilioClient.messages.create({ ... })
};

module.exports = { sendCustomerNotification };