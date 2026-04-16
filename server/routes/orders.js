const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");
const {
  checkout,
  precheckCheckout,
  getOrderById,
  listAllOrderItemsForAdmin,
  handlePortOneWebhook,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/precheck", requireAuth, precheckCheckout);
router.post("/checkout", requireAuth, checkout);
router.post("/webhook/portone", handlePortOneWebhook);
router.get("/admin/items", requireAdmin, listAllOrderItemsForAdmin);
router.get("/:id", requireAuth, getOrderById);

module.exports = router;
