const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const {
  listLectureFavorites,
  listBookFavorites,
  addLectureFavorite,
  removeLectureFavorite,
  addBookFavorite,
  removeBookFavorite,
} = require("../controllers/favoriteController");
const { listMyOrders } = require("../controllers/orderController");

const router = express.Router();

router.get("/favorites/lectures", requireAuth, listLectureFavorites);
router.get("/favorites/books", requireAuth, listBookFavorites);
router.get("/orders", requireAuth, listMyOrders);
router.post("/favorites/lectures/:lectureId", requireAuth, addLectureFavorite);
router.delete("/favorites/lectures/:lectureId", requireAuth, removeLectureFavorite);
router.post("/favorites/books/:bookId", requireAuth, addBookFavorite);
router.delete("/favorites/books/:bookId", requireAuth, removeBookFavorite);

module.exports = router;
