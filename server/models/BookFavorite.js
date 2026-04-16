const mongoose = require("mongoose");

const bookFavoriteSchema = new mongoose.Schema(
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
    },
  },
  { timestamps: true }
);

bookFavoriteSchema.index({ userId: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.model("BookFavorite", bookFavoriteSchema);
