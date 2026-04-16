const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");
const { checkout, getOrderById, listAllOrderItemsForAdmin } = require("../controllers/orderController");

const router = express.Router();

router.post("/checkout", requireAuth, checkout);
router.get("/admin/items", requireAdmin, listAllOrderItemsForAdmin);
router.get("/:id", requireAuth, getOrderById);

module.exports = router;
