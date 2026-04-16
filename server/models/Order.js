const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      required: true,
      enum: ["lecture", "book"],
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      default: null,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    paymentMethod: {
      type: String,
      required: true,
      enum: ["card", "bank_transfer", "kakaopay", "naverpay"],
      default: "card",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(arr) => Array.isArray(arr) && arr.length > 0, "Order must contain at least one line item."],
    },
    currency: {
      type: String,
      required: true,
      default: "KRW",
      trim: true,
      uppercase: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    paymentGateway: {
      impUid: {
        type: String,
        trim: true,
        default: "",
      },
      merchantUid: {
        type: String,
        trim: true,
        default: "",
      },
      paidAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      status: {
        type: String,
        trim: true,
        default: "",
      },
      raw: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    shippingInfo: {
      recipientName: {
        type: String,
        trim: true,
        default: "",
      },
      contact: {
        type: String,
        trim: true,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
      addressDetail: {
        type: String,
        trim: true,
        default: "",
      },
      postalCode: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function () {
  const hasBookLine = (this.items || []).some((item) => item.itemType === "book");
  for (const item of this.items || []) {
    if (item.itemType === "lecture" && !item.lectureId) {
      throw new Error("Lecture order lines require lectureId.");
    }
    if (item.itemType === "book" && !item.bookId) {
      throw new Error("Book order lines require bookId.");
    }
  }
  if (hasBookLine) {
    const s = this.shippingInfo || {};
    if (
      !String(s.recipientName || "").trim() ||
      !String(s.contact || "").trim() ||
      !String(s.address || "").trim() ||
      !String(s.addressDetail || "").trim() ||
      !String(s.postalCode || "").trim()
    ) {
      throw new Error("Book orders require complete shipping information.");
    }
  }
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ "paymentGateway.impUid": 1 });

module.exports = mongoose.model("Order", orderSchema);
