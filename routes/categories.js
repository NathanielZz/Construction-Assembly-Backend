

const express = require('express');
const router = express.Router();

const Category = require('../models/Category');
const Progress = require('../models/Progress');

// ...existing code...

// BULK SAVE categories (replace all)
router.post('/bulk-save', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'Categories array required' });
    // Remove all existing categories
    await Category.deleteMany({});
    // Insert all new categories
    await Category.insertMany(categories.map((cat, i) => ({
      key: cat.key,
      label: cat.label,
      order: typeof cat.order === 'number' ? cat.order : i,
      hidden: !!cat.hidden
    })));
    const cats = await Category.find().sort({ order: 1 });
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all categories (sorted by order)
router.get('/', async (req, res) => {
  try {
    const cats = await Category.find().sort({ order: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ADD a new category
router.post('/', async (req, res) => {
  try {
    const { key, label, order } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'Key and label required' });
    const exists = await Category.findOne({ key });
    if (exists) return res.status(400).json({ error: 'Key already exists' });
    const count = await Category.countDocuments();
    const newCat = new Category({ key, label, order: typeof order === 'number' ? order : count });
    await newCat.save();
    const cats = await Category.find().sort({ order: 1 });
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// EDIT a category (can update order)
router.put('/:key', async (req, res) => {
  try {
    const { label, newKey, order, hidden } = req.body;
    const { key } = req.params;
    const cat = await Category.findOne({ key });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    if (newKey && newKey !== key) {
      const exists = await Category.findOne({ key: newKey });
      if (exists) return res.status(400).json({ error: 'New key already exists' });
      cat.key = newKey;
    }
    if (label) cat.label = label;
    if (typeof order === 'number') cat.order = order;
    if (typeof hidden === 'boolean') cat.hidden = hidden;
    await cat.save();
    // Re-number all orders to match their array index
    const all = await Category.find().sort({ order: 1 });
    for (let i = 0; i < all.length; i++) {
      all[i].order = i;
      await all[i].save();
    }
    const cats = await Category.find().sort({ order: 1 });
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE a category (only if not in use)
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const cat = await Category.findOne({ key });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    // Check if any entry uses this category
    const inUse = await Progress.findOne({ category: key });
    if (inUse) return res.status(400).json({ error: 'Category in use' });
    await cat.deleteOne();
    const cats = await Category.find().sort({ order: 1 });
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
