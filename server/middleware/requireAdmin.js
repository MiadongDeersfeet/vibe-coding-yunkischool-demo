const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Authorization: Bearer JWT 검증 후 DB에서 user_role === "admin" 재확인
 */
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  const token = authHeader.slice(7).trim();
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: "서버 인증 설정이 없습니다." });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ message: "유효하지 않거나 만료된 토큰입니다." });
  }

  if (payload.user_role !== "admin") {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }

  try {
    const user = await User.findById(payload.sub).select("user_role");
    if (!user || user.user_role !== "admin") {
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }
  } catch {
    return res.status(500).json({ message: "권한 확인에 실패했습니다." });
  }

  req.adminUserId = payload.sub;
  next();
}

module.exports = requireAdmin;
