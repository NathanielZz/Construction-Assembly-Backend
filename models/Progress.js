const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  code: String,
  description: String,
  quantity: String
});

const progressSchema = new mongoose.Schema({
  category: { type: String, required: true },
  title: { type: String, required: true },
<<<<<<< HEAD
  image: { type: String }, // store filename or path
=======
>>>>>>> 0717a872c9ab295f7f562b812a436909297bb605
  items: [itemSchema]
});

module.exports = mongoose.model("Progress", progressSchema);
