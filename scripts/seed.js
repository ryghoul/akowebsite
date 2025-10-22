require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.MONGO_DB || "akoshop" });

  const Inventory = mongoose.model(
    "Inventory",
    new mongoose.Schema({ sku: { type: String, unique: true }, stock: Number, price: Number })
  );

  const up = (sku, price, stock) =>
    Inventory.updateOne({ sku }, { $set: { price }, $setOnInsert: { stock } }, { upsert: true });

  await Promise.all([
    /* Hoodies */
    up("hoodie|Porcelain Blue|Small", 4500, 8),
    up("hoodie|Porcelain Blue|Medium", 4500, 8),
    up("hoodie|Porcelain Blue|Large", 4500, 8),

    up("hoodie|Charcoal Gray|Small", 4500, 8),
    up("hoodie|Charcoal Gray|Medium", 4500, 8),
    up("hoodie|Charcoal Gray|Large", 4500, 8),

    up("hoodie|Forest Green|Small", 4500, 8),
    up("hoodie|Forest Green|Medium", 4500, 8),
    up("hoodie|Forest Green|Large", 4500, 8),

    /* Shirts */
    up("hoodie|Forest Green|Small", 4500, 8),
    up("hoodie|Forest Green|Medium", 4500, 8),
    up("hoodie|Forest Green|Large", 4500, 8),


    /* Totes */
    up("tote|Black|NOSIZE", 3500, 12),

    /* Bandanas */
    up("bandana|Green Tea|NOSIZE", 2000, 30),

    /* Sticky Rice */
    up("stickyrice|STICKY RICE|NOSIZE", 800, 50),

    /* Lychee */
    up("lychee|lychee|NOSIZE", 800, 50),
  ]);

  console.log("seeded");
  process.exit(0);
})().catch(e => { console.error("seed error:", e); process.exit(1); });
