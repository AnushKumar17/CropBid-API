const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
  },
  productname: {
    type: String,
    required: true,
    // trim: true
  },
  location: {
    type: String,
    required: true,
    // trim: true
  },
  quality: {
    type: String,
    required: true,
    // trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    // trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  contact: {
    type: String,
    required: true,
    // match: [/^\+?[0-9\s\-]{7,15}$/, 'Please provide a valid contact number']
  },
  sold: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Product", productSchema);
