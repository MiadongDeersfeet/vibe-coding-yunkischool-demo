const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  const token = authHeader.slice(7).trim();
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: "서버 인증 설정이 없습니다." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload.sub) {
      return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
    }
    req.userId = payload.sub;
    req.userRole = payload.user_role;
    next();
  } catch {
    return res.status(401).json({ message: "유효하지 않거나 만료된 토큰입니다." });
  }
}

module.exports = requireAuth;
