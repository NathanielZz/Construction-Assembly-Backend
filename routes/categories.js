const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

const categoriesFile = path.join(__dirname, '../data/categories.json');
const progressFile = path.join(__dirname, '../models/Progress.js');

// Helper to read categories
function readCategories() {
  if (!fs.existsSync(categoriesFile)) return [];
  return JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));
}

// Helper to write categories
function writeCategories(categories) {
  fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2));
}

// GET all categories (sorted by order if present)
router.get('/', (req, res) => {
  const cats = readCategories();
  cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(cats);
});

// ADD a new category
router.post('/', (req, res) => {
  const { key, label, order } = req.body;
  if (!key || !label) return res.status(400).json({ error: 'Key and label required' });
  const categories = readCategories();
  if (categories.find(c => c.key === key)) return res.status(400).json({ error: 'Key already exists' });
  categories.push({ key, label, order: typeof order === 'number' ? order : categories.length });
  writeCategories(categories);
  res.json({ success: true, categories });
});

// EDIT a category (can update order)
router.put('/:key', (req, res) => {
  const { label, newKey, order } = req.body;
  const { key } = req.params;
  let categories = readCategories();
  const idx = categories.findIndex(c => c.key === key);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  if (newKey && newKey !== key && categories.find(c => c.key === newKey)) {
    return res.status(400).json({ error: 'New key already exists' });
  }
  categories[idx] = {
    key: newKey || key,
    label: label || categories[idx].label,
    order: typeof order === 'number' ? order : categories[idx].order ?? idx
  };
  // After any edit, always re-number all orders to match their array index
  categories = categories
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((cat, i) => ({ ...cat, order: i }));
  writeCategories(categories);
  res.json({ success: true, categories });
});

// DELETE a category (only if not in use)
router.delete('/:key', async (req, res) => {
  const { key } = req.params;
  let categories = readCategories();
  const idx = categories.findIndex(c => c.key === key);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });

  // Check if any entry uses this category
  const Progress = require('../models/Progress');
  const inUse = await Progress.findOne({ category: key });
  if (inUse) return res.status(400).json({ error: 'Category in use' });

  categories.splice(idx, 1);
  writeCategories(categories);
  res.json({ success: true, categories });
});

module.exports = router;
