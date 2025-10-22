// scripts/updateStock.js
require('dotenv').config();
const mongoose = require('mongoose');


(async () => {
const [,, skuArg, deltaArg] = process.argv;
if (!skuArg || !deltaArg) {
console.error('Usage: node scripts/updateStock.js <sku> <delta>');
process.exit(1);
}
const delta = Number(deltaArg);
if (!Number.isFinite(delta)) {
console.error('Delta must be a number');
process.exit(1);
}


const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const MONGO_DB = process.env.MONGO_DB || 'akoshop';
await mongoose.connect(MONGO_URL, { dbName: MONGO_DB });


const Inventory = require('../models/Inventory');
const res = await Inventory.updateOne({ sku: skuArg }, { $inc: { stock: delta } });
console.log('updated:', res);


const doc = await Inventory.findOne({ sku: skuArg });
console.log('now:', doc ? { sku: doc.sku, stock: doc.stock } : 'not found');


await mongoose.disconnect();
})();