const express = require("express");
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require("../controllers/bookController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/", requireAdmin, createBook);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.put("/:id", requireAdmin, updateBook);
router.delete("/:id", requireAdmin, deleteBook);

module.exports = router;
