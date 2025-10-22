// seed.js
require('dotenv').config();
const mongoose = require('mongoose');


(async () => {
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const MONGO_DB = process.env.MONGO_DB || 'akoshop';
await mongoose.connect(MONGO_URL, { dbName: MONGO_DB });
console.log('[mongo] connected', mongoose.connection.host, mongoose.connection.name);


const Inventory = require('./models/Inventory');


const up = (sku, price, stock, active = true) =>
Inventory.updateOne(
{ sku },
{ $set: { price, stock, active } },
{ upsert: true }
);


await Promise.all([
// Hoodies
up('hoodie|Porcelain Blue|Small', 4500, 8),
up('hoodie|Porcelain Blue|Medium', 4500, 8),
up('hoodie|Porcelain Blue|Large', 4500, 8),


up('hoodie|Charcoal Grey|Small', 4500, 8),
up('hoodie|Charcoal Grey|Medium', 4500, 8),
up('hoodie|Charcoal Grey|Large', 4500, 8),


up('hoodie|Forest Green|Small', 4500, 8),
up('hoodie|Forest Green|Medium', 4500, 8),
up('hoodie|Forest Green|Large', 4500, 8),


// Shirts
up('shirt|Black|XS', 2500, 8),
up('shirt|Black|S', 2500, 8),
up('shirt|Black|M', 2500, 8),
up('shirt|Black|L', 2500, 8),
up('shirt|Black|XL', 2500, 8),


up('shirt|White|XS', 2500, 8),
up('shirt|White|S', 2500, 8),
up('shirt|White|M', 2500, 8),
up('shirt|White|L', 2500, 8),
up('shirt|White|XL', 2500, 8),


up('shirt|FNF|XS', 2500, 8),
up('shirt|FNF|S', 2500, 8),
up('shirt|FNF|M', 2500, 8),
up('shirt|FNF|L', 2500, 8),
up('shirt|FNF|XL', 2500, 8),


up('shirt|V1|XS', 3000, 8),
up('shirt|V1|S', 3000, 8),
up('shirt|V1|M', 3000, 8),
up('shirt|V1|L', 3000, 8),
up('shirt|V1|XL', 3000, 8),


up('shirt|V2|XS', 3000, 8),
up('shirt|V2|S', 3000, 8),
up('shirt|V2|M', 3000, 8),
up('shirt|V2|L', 3000, 8),
up('shirt|V2|XL', 3000, 8),


// Totes
up('tote|Black|NOSIZE', 3500, 12),
up('tote|Green|NOSIZE', 3500, 12),


// Bandanas
up('bandana|Green Tea|NOSIZE', 2000, 30),
up('bandana|MORE TEA|NOSIZE', 2000, 30),
up('bandana|PERFORMATIVE|NOSIZE',2000, 30),
up('bandana|REACH|NOSIZE', 2000, 30),


// Teas (single-size)
up('sticky-rice', 800, 50),
up('lychee', 800, 50),
]);


console.log('seeded');
await mongoose.disconnect();
})();