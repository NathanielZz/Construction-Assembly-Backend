const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Progress = require("./models/Progress.js");

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
    console.error("Error in GET /progress:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create new entry
app.post("/progress", requireAuth, async (req, res) => {
  try {
    let items = [];
    try {
      items = JSON.parse(req.body.items);
    } catch (parseErr) {
      console.error("Items parse error:", parseErr);
      return res.status(400).json({ error: "Invalid items JSON" });
    }

    const newLog = new Progress({
      category: req.body.category,
      title: req.body.title,
      items,
    });

    await newLog.save();
    res.json(newLog);
  } catch (err) {
    console.error("Error in POST /progress:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update entry
app.put("/progress/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Progress.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Entry not found" });

    let items = [];
    try {
      items = JSON.parse(req.body.items);
    } catch (parseErr) {
      console.error("Items parse error:", parseErr);
      return res.status(400).json({ error: "Invalid items JSON" });
    }

    const updatedLog = await Progress.findByIdAndUpdate(
      req.params.id,
      {
        category: req.body.category,
        title: req.body.title,
        items,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedLog);
  } catch (err) {
    console.error("Error in PUT /progress:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete entry
app.delete("/progress/:id", requireAuth, async (req, res) => {
  try {
    const deletedLog = await Progress.findByIdAndDelete(req.params.id);
    if (!deletedLog) return res.status(404).json({ error: "Entry not found" });

    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    console.error("Error in DELETE /progress:", err);
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
    console.error("Error in SEARCH /progress:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Download entries as plain text
app.get("/progress/download", requireAuth, async (req, res) => {
  try {
    const logs = await Progress.find().sort({ category: 1, title: 1 });

    let output = "Materials List\n\n";
    logs.forEach(log => {
      output += `Title: ${log.title}\nCategory: ${log.category}\n`;
      log.items.forEach(item => {
        output += `  - Code: ${item.code}, Quantity: ${item.quantity}, Description: ${item.description}\n`;
      });
      output += "\n";
    });

    res.setHeader("Content-Disposition", "attachment; filename=materials.txt");
    res.setHeader("Content-Type", "text/plain");
    res.send(output);
  } catch (err) {
    console.error("Error in DOWNLOAD /progress:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
