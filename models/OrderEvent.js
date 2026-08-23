// models/OrderEvent.js
//
// Persistent (Mongo-backed) idempotency guard for post-checkout side effects
// (stock decrement, order emails). A Stripe checkout session can be confirmed
// more than once from the client (page refresh, retry after a transient
// error) and the server can restart between those calls, so an in-memory
// Set isn't safe here — the first successful insert for a given sessionId
// is the one request allowed to run the side effects.
const mongoose = require('mongoose');

const OrderEventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, index: true, required: true },
    decrementedAt: { type: Date, default: null },
    emailedAt: { type: Date, default: null },
  },
  { collection: 'order_events', timestamps: true }
);

module.exports = mongoose.models.OrderEvent || mongoose.model('OrderEvent', OrderEventSchema);
