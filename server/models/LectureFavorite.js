const mongoose = require("mongoose");

const lectureFavoriteSchema = new mongoose.Schema(
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
    },
  },
  { timestamps: true }
);

lectureFavoriteSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model("LectureFavorite", lectureFavoriteSchema);
