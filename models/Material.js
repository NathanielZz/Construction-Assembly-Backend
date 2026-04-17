const mongoose = require('mongoose');


const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  unitOfMeasure: { type: String, required: true, trim: true, default: 'Unit/s' }
});

module.exports = mongoose.model('Material', MaterialSchema);
