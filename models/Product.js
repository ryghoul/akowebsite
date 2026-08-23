// models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    // SKU prefix, e.g. "shirt|V1", "tote|Black", "bandana|MORE TEA".
    // Full sku = `${productKey}|${size}`. Immutable after creation.
    productKey: {
      type: String,
      unique: true,
      index: true,
      required: true,
      validate: {
        validator: (v) => typeof v === 'string' && v.trim().length > 0,
        message: 'productKey must be a non-empty string',
      },
    },

    // "shirts" | "bags" | "bandanas" | staff-defined custom sections.
    section: { type: String, required: true, trim: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Path like "Pictures/merch/shirt4.png" — staff uploads the file to the
    // repo the same way they do today; no file-upload/object-store here.
    image: { type: String, default: '' },

    price: { type: Number, required: true, min: 0 }, // cents

    // e.g. ["S","M","L","XL"] or ["NOSIZE"]
    sizes: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.every(s => typeof s === 'string' && s.trim() && !s.includes('|')),
        message: 'sizes must be a non-empty list of non-empty strings that do not contain "|"',
      },
    },

    tagLabel: { type: String, default: '' },  // shirts' colorway tag, e.g. "Faded Bone"
    colorHex: { type: String, default: '' },  // bags' color-strip / bandanas' bg hex
    accentHex: { type: String, default: '' }, // bandanas' diamond accent hex
    specs: { type: String, default: '' },     // shirts' spec paragraph

    presale: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { collection: 'products', timestamps: true }
);

ProductSchema.pre('validate', function (next) {
  if (typeof this.productKey === 'string') this.productKey = this.productKey.trim();
  if (Array.isArray(this.sizes)) {
    const seen = new Set();
    this.sizes = this.sizes
      .map(s => String(s).trim())
      .filter(s => {
        if (!s || seen.has(s)) return false;
        seen.add(s);
        return true;
      });
  }
  next();
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
