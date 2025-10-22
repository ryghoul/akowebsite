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
    up("shirt|Black|XS", 2500, 8),
    up("shirt|Black|S", 2500, 8),
    up("shirt|Black|M", 2500, 8),
    up("shirt|Black|L", 2500, 8),
    up("shirt|Black|XL", 2500, 8),

    up("shirt|White|XS", 2500, 8),
    up("shirt|White|S", 2500, 8),
    up("shirt|White|M", 2500, 8),
    up("shirt|White|L", 2500, 8),
    up("shirt|White|XL", 2500, 8),

    up("shirt|FNF|XS", 2500, 8),
    up("shirt|FNF|S", 2500, 8),
    up("shirt|FNF|M", 2500, 8),
    up("shirt|FNF|L", 2500, 8),
    up("shirt|FNF|XL", 2500, 8),

    up("shirt|V1|XS", 3000, 8),
    up("shirt|V1|S", 3000, 8),
    up("shirt|V1|M", 3000, 8),
    up("shirt|V1|L", 3000, 8),
    up("shirt|V1|XL", 3000, 8),

    up("shirt|V2|XS", 3000, 8),
    up("shirt|V2|S", 3000, 8),
    up("shirt|V2|M", 3000, 8),
    up("shirt|V2|L", 3000, 8),
    up("shirt|V2|XL", 3000, 8),

    /* Totes */
    up("tote|Black|NOSIZE", 3500, 12),
    up("tote|Green|NOSIZE", 3500, 12),

    /* Bandanas */
    up("bandana|Green Tea|NOSIZE", 2000, 30),
    up("bandana|MORE TEA|NOSIZE", 2000, 30),
    up("bandana|PERFORMATIVE|NOSIZE", 2000, 30),
    up("bandana|REACH|NOSIZE", 2000, 30),

    /* Sticky Rice */
    up("stickyrice|STICKY RICE|NOSIZE", 800, 50),

    /* Lychee */
    up("lychee|lychee|NOSIZE", 800, 50),
  ]);

  console.log("seeded");
  process.exit(0);
})().catch(e => { console.error("seed error:", e); process.exit(1); });
