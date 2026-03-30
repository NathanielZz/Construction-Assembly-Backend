const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  code: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: String, required: true }
});

const progressSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true }, // ✅ camelCase category
  title: { type: String, required: true, trim: true },
  image: { type: String },     // Cloudinary URL
  publicId: { type: String },  // Cloudinary public_id for deletion
  items: [itemSchema]
}, { timestamps: true });

module.exports = mongoose.model("Progress", progressSchema);
