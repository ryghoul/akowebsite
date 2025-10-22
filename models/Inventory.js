// models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  sku: { type: String, unique: true, index: true },
  stock: { type: Number, default: 0, min: 0 },
  price: { type: Number, default: 0 } // optional, but handy
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
