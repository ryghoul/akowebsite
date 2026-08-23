// scripts/seedProducts.js
//
// One-time migration: seeds the `products` collection with the 7 items
// currently hardcoded in public/shop.html, using their exact current
// values, so the storefront renders identically once shop.html/shop.js
// switch to reading from the DB. Safe to re-run (upsert by productKey).
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
  const MONGO_DB = process.env.MONGO_DB || 'akoshop';
  await mongoose.connect(MONGO_URL, { dbName: MONGO_DB });
  console.log('[mongo] connected', mongoose.connection.host, mongoose.connection.name);

  const Product = require('../models/Product');

  const SHIRT_SPECS = 'Wide neck ribbing · Garment dyed · Side seamed\nShoulder-to-shoulder tape · Double needle hems · Preshrunk\n7.1 oz · 16 Singles · 100% carded cotton · Relaxed fit';

  const up = (doc) =>
    Product.updateOne(
      { productKey: doc.productKey },
      { $set: doc },
      { upsert: true }
    );

  await Promise.all([
    // Shirts
    up({
      productKey: 'shirt|V1',
      section: 'shirts',
      name: '"Oh no, my matcha!" Boxy Tee V.1',
      description: '',
      image: 'Pictures/merch/shirt4.png',
      price: 3000,
      sizes: ['S', 'M', 'L', 'XL'],
      tagLabel: 'Faded Bone',
      specs: SHIRT_SPECS,
      order: 0,
    }),
    up({
      productKey: 'shirt|V2',
      section: 'shirts',
      name: '"Oh no, my matcha!" Boxy Tee V.2',
      description: '',
      image: 'Pictures/merch/shirt5.png',
      price: 3000,
      sizes: ['S', 'M', 'L', 'XL'],
      tagLabel: 'Faded Bone',
      specs: SHIRT_SPECS,
      order: 1,
    }),

    // Bags
    up({
      productKey: 'tote|Black',
      section: 'bags',
      name: 'AKO* Tea Bag',
      description: 'Black colorway. Reinforced shoulder straps, one large main compartment, 3 external pockets. One size — 19.69" × 15.75", gusset 11.8", strap 23.62". 9.4 oz, 100% cotton canvas.',
      image: 'Pictures/merch/blacktote.png',
      price: 3500,
      sizes: ['NOSIZE'],
      colorHex: '#1a1a1a',
      order: 0,
    }),
    up({
      productKey: 'tote|Green',
      section: 'bags',
      name: 'AKO* Tea Bag',
      description: 'Green colorway. Reinforced shoulder straps, one large main compartment, 3 external pockets. One size — 19.69" × 15.75", gusset 11.8", strap 23.62". 9.4 oz, 100% cotton canvas.',
      image: 'Pictures/merch/greentote.png',
      price: 3500,
      sizes: ['NOSIZE'],
      colorHex: '#2d4a2d',
      order: 1,
    }),

    // Bandanas
    up({
      productKey: 'bandana|MORE TEA',
      section: 'bandanas',
      name: 'MORE TEA',
      description: 'AKO* Bandana S.2 — Black colorway. 22" × 22".',
      image: 'Pictures/merch/moretea.png',
      price: 2000,
      sizes: ['NOSIZE'],
      colorHex: '#e8e0d4',
      accentHex: '#1a1a1a',
      presale: true,
      order: 0,
    }),
    up({
      productKey: 'bandana|PERFORMATIVE',
      section: 'bandanas',
      name: 'PERFORMATIVE',
      description: 'AKO* Bandana S.2 — Matcha design. 22" × 22".',
      image: 'Pictures/merch/performative.png',
      price: 2000,
      sizes: ['NOSIZE'],
      colorHex: '#550b14',
      accentHex: '#cbc0b2',
      presale: true,
      order: 1,
    }),
    up({
      productKey: 'bandana|REACH',
      section: 'bandanas',
      name: 'REACH',
      description: 'AKO* Bandana S.2 — Hand design. 22" × 22".',
      image: 'Pictures/merch/reach.png',
      price: 2000,
      sizes: ['NOSIZE'],
      colorHex: '#cbc0b2',
      accentHex: '#550b14',
      presale: true,
      order: 2,
    }),
  ]);

  console.log('seeded products');
  await mongoose.disconnect();
})();
