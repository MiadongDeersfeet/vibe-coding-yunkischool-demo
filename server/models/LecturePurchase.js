const mongoose = require("mongoose");

const lecturePurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

lecturePurchaseSchema.index({ userId: 1, lectureId: 1 });
lecturePurchaseSchema.index({ userId: 1, lectureId: 1, revokedAt: 1 });

module.exports = mongoose.model("LecturePurchase", lecturePurchaseSchema);
