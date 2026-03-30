const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  code: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: String, required: true }
});

const progressSchema = new mongoose.Schema({
  category: { type: String, required: true },
  title: { type: String, required: true },
  image: { type: String }, // optional image path
  items: [itemSchema]
}, { timestamps: true });

module.exports = mongoose.model("Progress", progressSchema);
