const express = require("express");
const userRoutes = require("./users");
const lectureRoutes = require("./lectures");
const bookRoutes = require("./books");
const meRoutes = require("./me");
const orderRoutes = require("./orders");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Server is running.",
  });
});

router.use("/users", userRoutes);
router.use("/lectures", lectureRoutes);
router.use("/books", bookRoutes);
router.use("/me", meRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
