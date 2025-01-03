const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    // match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  bought: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product" 
  }],
  selling: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product" 
  }]
});

module.exports = mongoose.model("User", userSchema);
