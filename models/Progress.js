const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  code: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: String, required: false } // Now optional
});



const progressSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true }, // ✅ camelCase category
  title: { type: String, required: true, trim: true },
  items: [itemSchema],
  image: { type: String, default: "" }, // Cloudinary image URL
  hidden: { type: Boolean, default: false } // For hiding cards
}, { timestamps: true });

module.exports = mongoose.model("Progress", progressSchema);
