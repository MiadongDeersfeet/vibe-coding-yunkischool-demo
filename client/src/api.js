const base = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const raw = `${base}${p}`;
  return raw.replace(/\/api\/api(?=\/|$)/g, "/api");
}
