export function getAuthUser() {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 로그인 상태이며 JWT에 실린 역할이 admin인지(로컬 authUser 기준) */
export function isAdminSession() {
  const token = localStorage.getItem("authToken");
  if (!token) return false;
  const user = getAuthUser();
  return user?.user_role === "admin";
}
