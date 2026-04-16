const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", routes);

module.exports = app;
