const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
require("dotenv").config();

const Progress = require("./models/Progress.js");

// ✅ Cloudinary setup using CLOUDINARY_URL
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary will automatically read CLOUDINARY_URL from .env
cloudinary.config({ secure: true });

// ✅ Use Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "progress_images", // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// 🔓 Login route
app.post("/auth/login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.SECRET_KEY) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  const token = jwt.sign({ access: true }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

// 🔒 Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ✅ Get entries
app.get("/progress", requireAuth, async (req, res) => {
  try {
    const { category } = req.query;
    const query = category && category !== "all" ? { category } : {};
    const logs = await Progress.find(query).sort({ category: 1, title: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create new entry with Cloudinary upload
app.post("/progress", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const newLog = new Progress({
      category: req.body.category, // ✅ camelCase category
      title: req.body.title,
      items: JSON.parse(req.body.items),
      image: req.file ? req.file.path : null,       // ✅ Cloudinary URL
      publicId: req.file ? req.file.filename : null // ✅ Cloudinary public_id
    });
    await newLog.save();
    res.json(newLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Update entry with Cloudinary upload (delete old image if replaced)
app.put("/progress/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const existing = await Progress.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Entry not found" });

    let imageUrl = existing.image;
    let publicId = existing.publicId;

    if (req.file) {
      if (existing.publicId) {
        await cloudinary.uploader.destroy(existing.publicId);
      }
      imageUrl = req.file.path;      // ✅ Cloudinary URL
      publicId = req.file.filename;  // ✅ Cloudinary public_id
    }

    const updatedLog = await Progress.findByIdAndUpdate(
      req.params.id,
      {
        category: req.body.category,
        title: req.body.title,
        items: JSON.parse(req.body.items),
        image: imageUrl,
        publicId: publicId
      },
      { new: true, runValidators: true }
    );

    res.json(updatedLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete entry and its Cloudinary image
app.delete("/progress/:id", requireAuth, async (req, res) => {
  try {
    const deletedLog = await Progress.findByIdAndDelete(req.params.id);
    if (!deletedLog) return res.status(404).json({ error: "Entry not found" });

    if (deletedLog.publicId) {
      await cloudinary.uploader.destroy(deletedLog.publicId);
    }

    res.json({ message: "Entry and image deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Search entries
app.get("/progress/search", requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query (q) is required" });
    const regex = new RegExp(q, "i");
    const results = await Progress.find({
      $or: [
        { title: regex },
        { category: regex },
        { items: { $elemMatch: { code: regex } } },
        { items: { $elemMatch: { description: regex } } },
        { items: { $elemMatch: { quantity: regex } } }
      ]
    }).sort({ category: 1, title: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
