const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const payment = require("./payment");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/payment/request", (req, res) => {
  try {
    const result = payment.createPayment(
      req.body.plan,
      req.body.reference
    );
    res.json({ success: true, payment: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/payments", (req, res) => {
  if (!process.env.ADMIN_PASSWORD ||
      req.headers["x-admin-password"] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json(payment.readDB().payments);
});

app.post("/api/admin/approve/:id", (req, res) => {
  if (!process.env.ADMIN_PASSWORD ||
      req.headers["x-admin-password"] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = payment.approvePayment(req.params.id);
    res.json({ success: true, key: result.key });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json({ name: "MVP SAFE", status: "ONLINE" });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("MVP SAFE running on port 3000");
});
