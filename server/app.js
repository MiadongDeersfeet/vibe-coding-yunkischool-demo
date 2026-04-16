const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions =
  isProduction && allowedOrigins.length > 0
    ? {
        origin(origin, callback) {
          // Allow server-to-server and health checks without Origin header.
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error("Not allowed by CORS"));
        },
      }
    : undefined;

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

// Heroku root URL (no /api) is often opened in browser; avoid noisy 404 in console.
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "Noor Tour API",
    health: "/api/health",
  });
});

app.use("/api", routes);

module.exports = app;
