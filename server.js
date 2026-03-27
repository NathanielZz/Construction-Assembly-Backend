const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
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

// Get all entries (with optional filter)
app.get("/progress", async (req, res) => {
  try {
    const { category } = req.query;
    const query = category && category !== "all" ? { category } : {};
    const logs = await Progress.find(query).sort({ category: 1, title: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new entry
app.post("/progress", async (req, res) => {
  try {
    const newLog = new Progress(req.body);
    await newLog.save();
    res.json(newLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update an entry by ID
app.put("/progress/:id", async (req, res) => {
  try {
    const updatedLog = await Progress.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedLog) return res.status(404).json({ error: "Entry not found" });
    res.json(updatedLog);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete an entry by ID
app.delete("/progress/:id", async (req, res) => {
  try {
    const deletedLog = await Progress.findByIdAndDelete(req.params.id);
    if (!deletedLog) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Universal search across all fields
app.get("/progress/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Search query (q) is required" });
    }

    const regex = new RegExp(q, "i"); // case-insensitive

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
