const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  code: String,
  description: String,
  quantity: String
});

const progressSchema = new mongoose.Schema({
  category: { type: String, required: true },
  title: { type: String, required: true },
  image: { type: String }, // store filename or path
  items: [itemSchema]
});

module.exports = mongoose.model("Progress", progressSchema);
