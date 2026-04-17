const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const {
  createUser,
  loginUser,
  getUsers,
  getStudentSchemaForAdmin,
  getStudentUsersForAdmin,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const router = express.Router();

router.post("/", createUser);
router.post("/login", loginUser);
router.get("/", getUsers);
router.get("/students/schema", requireAdmin, getStudentSchemaForAdmin);
router.get("/students", requireAdmin, getStudentUsersForAdmin);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
