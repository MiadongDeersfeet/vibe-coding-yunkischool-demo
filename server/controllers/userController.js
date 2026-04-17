const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 회원가입: 비밀번호 해시 후 유저 생성
const SIGNUP_ROLES = ["student", "teacher"];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskEmail(email = "") {
  const [localPart = "", domain = ""] = String(email).split("@");
  if (!domain) return "-";
  if (localPart.length <= 2) return `${localPart[0] || "*"}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function toFieldLabel(key) {
  const labels = {
    _id: "회원 ID",
    name: "이름",
    email: "이메일",
    user_role: "권한",
    createdAt: "가입일",
    updatedAt: "수정일",
  };
  return labels[key] || key;
}

const createUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    // 평문 비밀번호를 저장하지 않도록 해시 처리
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      ...rest,
      user_role: "student",
      password: hashedPassword,
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to create user." });
  }
};

// 전체 유저 조회: 최신 생성 순 정렬
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

// 관리자 회원 스키마 조회: 민감정보는 마스킹/제외 메타데이터로 전달
const getStudentSchemaForAdmin = async (_req, res) => {
  try {
    const rawPaths = User.schema.paths || {};
    const allowedKeys = ["_id", "name", "email", "user_role", "createdAt", "updatedAt"];
    const sensitiveKeys = ["password"];

    const fields = allowedKeys
      .filter((key) => rawPaths[key])
      .map((key) => {
        const schemaType = rawPaths[key];
        return {
          key,
          label: toFieldLabel(key),
          type: schemaType.instance || "Mixed",
          required: Boolean(schemaType.options?.required),
          enum: Array.isArray(schemaType.options?.enum) ? schemaType.options.enum : [],
          searchable: key === "_id" || key === "name",
          masked: key === "email",
        };
      });

    res.status(200).json({
      collection: "users",
      fields,
      hiddenSensitiveFields: sensitiveKeys,
    });
  } catch (error) {
    res.status(500).json({ message: "회원 스키마를 불러오지 못했습니다." });
  }
};

// 관리자 수강생 조회: 민감정보(password, raw email) 제외 + 이름/ID 검색
const getStudentUsersForAdmin = async (req, res) => {
  try {
    const keyword = String(req.query.q || "").trim();
    const requestedRole = String(req.query.role || "all").trim().toLowerCase();
    const allowedRoles = ["student", "teacher", "admin"];
    const filter =
      requestedRole === "all"
        ? {}
        : allowedRoles.includes(requestedRole)
          ? { user_role: requestedRole }
          : {};

    if (keyword) {
      const nameFilter = { name: { $regex: escapeRegex(keyword), $options: "i" } };
      if (mongoose.Types.ObjectId.isValid(keyword)) {
        filter.$or = [{ _id: keyword }, nameFilter];
      } else {
        filter.$or = [nameFilter];
      }
    }

    const users = await User.find(filter)
      .select("_id name email user_role createdAt")
      .sort({ createdAt: -1 });

    const items = users.map((user) => ({
      _id: user._id.toString(),
      name: user.name || "이름없음",
      email: maskEmail(user.email),
      user_role: user.user_role,
      createdAt: user.createdAt,
    }));
    res.status(200).json({
      items,
      total: items.length,
      role: requestedRole === "all" ? "all" : filter.user_role || "all",
    });
  } catch (error) {
    res.status(500).json({ message: "수강생 목록을 불러오지 못했습니다." });
  }
};

// 로그인: 이메일/비밀번호 검증 후 JWT 발급
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 필수 입력값 검증
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // 이메일 표준화 후 사용자 조회
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // 해시된 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // JWT 시크릿이 없으면 토큰 발급을 중단
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is not configured." });
    }

    // 인증 성공 시 토큰 발급
    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        user_role: user.user_role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "로그인 성공",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        user_role: user.user_role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to login." });
  }
};

// 단일 유저 조회: id 유효성 검사 후 조회
const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user." });
  }
};

// 유저 수정: id 기준 업데이트 + 검증 실행
const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const payload = { ...req.body };
    if (payload.user_role !== undefined && !SIGNUP_ROLES.includes(payload.user_role)) {
      delete payload.user_role;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to update user." });
  }
};

// 유저 삭제: id 유효성 검사 후 삭제
const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user." });
  }
};

module.exports = {
  createUser,
  loginUser,
  getUsers,
  getStudentSchemaForAdmin,
  getStudentUsersForAdmin,
  getUserById,
  updateUser,
  deleteUser,
};
