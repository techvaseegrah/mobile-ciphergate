const mongoose = require('mongoose');
const { Batch } = require('../models/Schemas');

// MongoDB connection
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/repairshop';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB Connected');
  
  // Check all batches
  console.log('Collection name:', Batch.collection.name);
  console.log('Database name:', Batch.db.name);
  const batches = await Batch.find();
  console.log('All batches in database:');
  console.log(JSON.stringify(batches, null, 2));
  
  mongoose.connection.close();
})
.catch(err => console.log(err));