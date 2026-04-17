const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');

// POST /bom/export
// Body: { assemblies: [{ id: <progressId>, quantity: <number> }, ...] }
router.post('/export', async (req, res) => {
  try {
    const { assemblies } = req.body;
    if (!Array.isArray(assemblies) || assemblies.length === 0) {
      return res.status(400).json({ error: 'No assemblies provided' });
    }
    // Fetch all selected assemblies
    const ids = assemblies.map(a => a.id);
    const progressDocs = await Progress.find({ _id: { $in: ids } });
    // Map id to quantity
    const qtyMap = Object.fromEntries(assemblies.map(a => [a.id, a.quantity]));
    // Aggregate combined BOM by material name/description only
    const combined = {};
    progressDocs.forEach(doc => {
      const qty = Number(qtyMap[doc._id]) || 1;
      doc.items.forEach(item => {
        // Use trimmed, lowercased description as key for true merging
        const key = (item.description || "").trim().toLowerCase();
        if (!combined[key]) {
          combined[key] = {
            description: item.description || "(No Name)",
            quantity: 0
          };
        }
        combined[key].quantity += (Number(item.quantity) || 1) * qty;
      });
    });
    // Prepare per-assembly details
    const assembliesDetails = progressDocs.map(doc => ({
      id: doc._id,
      title: doc.title,
      image: doc.image,
      items: doc.items
    }));
    res.json({
      combined: Object.values(combined),
      assemblies: assembliesDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
