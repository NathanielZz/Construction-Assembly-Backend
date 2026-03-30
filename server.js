const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer"); // for file uploads
const path = require("path");
require("dotenv").config();

const Progress = require("./models/Progress.js");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// 🔓 Login route — validates password and returns a token
app.post("/auth/login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.SECRET_KEY) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  const token = jwt.sign({ access: true }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

// 🔒 Auth middleware — protects all /progress routes
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

// ✅ Create new entry with image upload
app.post("/progress", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const newLog = new Progress({
      category: req.body.category,
      title: req.body.title,
      items: JSON.parse(req.body.items),
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });
    await newLog.save();
    res.json(newLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Update entry with image upload
app.put("/progress/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const updatedLog = await Progress.findByIdAndUpdate(
      req.params.id,
      {
        category: req.body.category,
        title: req.body.title,
        items: JSON.parse(req.body.items),
        image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
      },
      { new: true, runValidators: true }
    );
    if (!updatedLog) return res.status(404).json({ error: "Entry not found" });
    res.json(updatedLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/progress/:id", requireAuth, async (req, res) => {
  try {
    const deletedLog = await Progress.findByIdAndDelete(req.params.id);
    if (!deletedLog) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
