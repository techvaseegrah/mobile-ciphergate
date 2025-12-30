const mongoose = require('mongoose');
const { Batch } = require('../models/Schemas');

// MongoDB connection
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/repairshop';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Connected');
  seedBatches();
})
.catch(err => console.log(err));

// Initial batch data
const initialBatches = [
  {
    name: 'Morning Shift',
    workingTime: { from: '08:00', to: '17:00' },
    lunchTime: { from: '12:00', to: '13:00', enabled: true },
    breakTime: { from: '15:00', to: '15:15', enabled: true },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Evening Shift',
    workingTime: { from: '16:00', to: '01:00' },
    lunchTime: { from: '20:00', to: '21:00', enabled: true },
    breakTime: { from: '22:00', to: '22:15', enabled: false },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Night Shift',
    workingTime: { from: '22:00', to: '07:00' },
    lunchTime: { from: '02:00', to: '03:00', enabled: true },
    breakTime: { from: '05:00', to: '05:15', enabled: true },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const seedBatches = async () => {
  try {
    // Clear existing batches
    await Batch.deleteMany({});
    
    // Insert initial batches
    await Batch.insertMany(initialBatches);
    console.log('Initial batches seeded successfully');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding batches:', error);
    mongoose.connection.close();
  }
};