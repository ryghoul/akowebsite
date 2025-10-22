// scripts/updateStock.js
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const [,, sku, stockOrDelta, mode = 'set'] = process.argv; // mode: 'set' | 'inc'
  if (!sku || !stockOrDelta) {
    console.log('Usage: node scripts/updateStock.js "<sku>" <number> [set|inc]');
    process.exit(1);
  }
  const n = Number(stockOrDelta);
  await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.MONGO_DB || 'akoshop' });

  const Inv = mongoose.model('Inventory', new mongoose.Schema({
    sku: { type: String, unique: true }, stock: Number, price: Number
  }));

  if (mode === 'inc') {
    await Inv.updateOne({ sku }, { $inc: { stock: n } }, { upsert: true });
  } else {
    await Inv.updateOne({ sku }, { $set: { stock: n } }, { upsert: true });
  }

  console.log('done');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
