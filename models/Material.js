const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }
});

module.exports = mongoose.model('Material', MaterialSchema);
