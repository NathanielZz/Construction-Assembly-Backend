// --- Materials model ---
const Material = require("./models/Material.js");

// --- Materials API ---
// Get all materials (public)
app.get("/materials", async (req, res) => {
  try {
    const materials = await Material.find().sort({ name: 1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new material (auth required)
app.post("/materials", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    const exists = await Material.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ error: "Material already exists" });
    const material = new Material({ name: name.trim() });
    await material.save();
    res.json(material);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a material (auth required)
app.put("/materials/:id", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ error: "Material not found" });
    res.json(material);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a material (auth required)
app.delete("/materials/:id", requireAuth, async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ error: "Material not found" });
    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- All requires at the top ---
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Progress = require("./models/Progress.js");
const upload = require("./config/multer");

// --- Initialize app ---
const app = express();

// --- Middleware ---
app.use(cors({
  origin: [
    "https://construction-assembly.vercel.app",
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(express.json());

// --- Categories management route ---
const categoriesRoute = require("./routes/categories");
// Register categories API
// GET /categories is public, others require auth
app.use("/categories", (req, res, next) => {
  if (req.method === "GET") return categoriesRoute(req, res, next);
  return requireAuth(req, res, () => categoriesRoute(req, res, next));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message, err.stack, err);
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

// ✅ Public get entries (no auth)
app.get("/public/progress", async (req, res) => {
  try {
    const { category, showHidden } = req.query;
    const query = category && category !== "all" ? { category } : {};
    if (!showHidden) query.hidden = { $ne: true };
    const logs = await Progress.find(query).sort({ category: 1, title: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get entries (public)
app.get("/progress", async (req, res) => {
  try {
    const { category, showHidden } = req.query;
    const query = category && category !== "all" ? { category } : {};
    if (!showHidden) query.hidden = { $ne: true };
    const logs = await Progress.find(query).sort({ category: 1, title: 1 });
    res.json(logs);
  } catch (err) {
    console.error("Error in GET /progress:", err.message, err.stack, err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ Create new entry with image
app.post("/progress", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { category, title, items } = req.body;
    let parsedItems = items;
    if (typeof items === "string") {
      parsedItems = JSON.parse(items);
    }
    const imageUrl = req.file ? req.file.path : "";
    const newLog = new Progress({
      category,
      title,
      items: parsedItems,
      image: imageUrl
    });
    await newLog.save();
    res.json(newLog);
  } catch (err) {
    console.error("Error in POST /progress:", err.message, err.stack, err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ Update entry with image
app.put("/progress/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const existing = await Progress.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Entry not found" });

    const { category, title, items } = req.body;
    let parsedItems = items;
    if (typeof items === "string") {
      parsedItems = JSON.parse(items);
    }
    let imageUrl = existing.image;
    if (req.file) {
      imageUrl = req.file.path;
    }

    const updatedLog = await Progress.findByIdAndUpdate(
      req.params.id,
      {
        category,
        title,
        items: parsedItems,
        image: imageUrl
      },
      { new: true, runValidators: true }
    );

    res.json(updatedLog);
  } catch (err) {
    console.error("Error in PUT /progress:", err.message, err.stack, err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ Remove image from entry
app.put("/progress/:id/remove-image", requireAuth, async (req, res) => {
  try {
    const updated = await Progress.findByIdAndUpdate(
      req.params.id,
      { image: "" },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Error in REMOVE-IMAGE /progress:", err.message, err.stack, err);
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
    console.error("Error in DELETE /progress:", err.message, err.stack, err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Search entries (public)
app.get("/progress/search", async (req, res) => {
  try {
    const { q, filter } = req.query;
    if (!q) return res.status(400).json({ error: "Search query (q) is required" });
    const regex = new RegExp(q, "i");
    let searchCond = {};
    if (filter === "title") {
      searchCond = { title: regex };
    } else if (filter === "code") {
      searchCond = { items: { $elemMatch: { code: regex } } };
    } else if (filter === "description") {
      searchCond = { items: { $elemMatch: { description: regex } } };
    } else if (filter === "all" || !filter) {
      searchCond = {
        $or: [
          { title: regex },
          { items: { $elemMatch: { code: regex } } },
          { items: { $elemMatch: { description: regex } } }
        ]
      };
    } else {
      // fallback: search all
      searchCond = {
        $or: [
          { title: regex },
          { items: { $elemMatch: { code: regex } } },
          { items: { $elemMatch: { description: regex } } }
        ]
      };
    }
    console.log('SEARCH /progress:', { filter, q, searchCond });
    const results = await Progress.find(searchCond).sort({ category: 1, title: 1 });
    res.json(results);
  } catch (err) {
    console.error("Error in SEARCH /progress:", err.message, err.stack, err);
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
    console.error("Error in DOWNLOAD /progress:", err.message, err.stack, err);
    res.status(500).json({ error: err.message });
  }
});

// --- Place these routes after all middleware and before app.listen ---

// Duplicate an entry (deep copy, new _id, new timestamps)
app.post("/progress/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const orig = await Progress.findById(req.params.id);
    if (!orig) return res.status(404).json({ error: "Entry not found" });
    const copy = new Progress({
      category: orig.category,
      title: orig.title + " (Copy)",
      items: JSON.parse(JSON.stringify(orig.items)),
      image: orig.image,
      hidden: false
    });
    await copy.save();
    res.json(copy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hide/unhide an entry
app.put("/progress/:id/hide", requireAuth, async (req, res) => {
  try {
    const { hide } = req.body;
    const updated = await Progress.findByIdAndUpdate(
      req.params.id,
      { hidden: !!hide },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
