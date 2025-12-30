const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please add a username'],
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      default: 'admin',
    },
    // Location settings for attendance restriction
    locationSettings: {
      enabled: {
        type: Boolean,
        default: false
      },
      latitude: {
        type: Number,
        default: 0
      },
      longitude: {
        type: Number,
        default: 0
      },
      radius: {
        type: Number,
        default: 100 // in meters
      }
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Admin', adminSchema);