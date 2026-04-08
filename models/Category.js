const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  order: { type: Number, required: true }
});

module.exports = mongoose.model('Category', CategorySchema);