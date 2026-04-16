const express = require("express");
const {
  createLecture,
  getLectures,
  getLectureById,
  updateLecture,
  deleteLecture,
} = require("../controllers/lectureController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/", requireAdmin, createLecture);
router.get("/", getLectures);
router.get("/:id", getLectureById);
router.put("/:id", requireAdmin, updateLecture);
router.delete("/:id", requireAdmin, deleteLecture);

module.exports = router;
