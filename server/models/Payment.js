const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["card", "bank_transfer", "kakaopay", "naverpay"],
      default: "card",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "KRW",
      trim: true,
      uppercase: true,
    },
    provider: {
      type: String,
      trim: true,
      default: "",
    },
    providerPaymentId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "succeeded", "failed", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
