const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 회원가입: 비밀번호 해시 후 유저 생성
const SIGNUP_ROLES = ["student", "teacher"];

const createUser = async (req, res) => {
  try {
    const { password, user_role: roleFromBody, ...rest } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const user_role = SIGNUP_ROLES.includes(roleFromBody) ? roleFromBody : "student";

    // 평문 비밀번호를 저장하지 않도록 해시 처리
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      ...rest,
      user_role,
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
  getUserById,
  updateUser,
  deleteUser,
};
