const mongoose = require("mongoose");

const bookPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookPurchaseSchema.index({ userId: 1, bookId: 1 });
bookPurchaseSchema.index({ userId: 1, bookId: 1, revokedAt: 1 });

module.exports = mongoose.model("BookPurchase", bookPurchaseSchema);
