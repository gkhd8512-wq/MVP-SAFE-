
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB = path.join(__dirname, "data", "database.json");

const plans = {
  "2 Days": { price: 199, days: 2 },
  "5 Days": { price: 399, days: 5 },
  "10 Days": { price: 599, days: 10 },
  "20 Days": { price: 899, days: 20 },
  "30 Days": { price: 1199, days: 30 },
  "Permanent": { price: 2499, days: null }
};

function readDB() {
  if (!fs.existsSync(DB)) {
    fs.mkdirSync(path.dirname(DB), { recursive: true });
    fs.writeFileSync(DB, JSON.stringify({
      payments: [],
      customers: []
    }, null, 2));
  }

  const db = JSON.parse(fs.readFileSync(DB, "utf8"));
  db.payments ||= [];
  db.customers ||= [];
  return db;
}

function saveDB(db) {
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}

function createPayment(plan, reference) {
  if (!plans[plan]) throw new Error("Invalid plan");

  reference = String(reference || "").trim();

  if (reference.length < 6) {
    throw new Error("Invalid transaction reference");
  }

  const db = readDB();

  if (db.payments.some(p =>
    p.reference.toLowerCase() === reference.toLowerCase()
  )) {
    throw new Error("Reference already submitted");
  }

  const payment = {
    id: crypto.randomUUID(),
    plan,
    amount: plans[plan].price,
    reference,
    status: "PENDING",
    key: null,
    createdAt: new Date().toISOString()
  };

  db.payments.unshift(payment);
  saveDB(db);
  return payment;
}

function approvePayment(id) {
  const db = readDB();
  const payment = db.payments.find(p => p.id === id);

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "PENDING") {
    throw new Error("Payment already processed");
  }

  payment.status = "APPROVED";
  payment.key = "MVP-" +
    crypto.randomBytes(12).toString("hex").toUpperCase();

  db.customers.push({
    key: payment.key,
    plan: payment.plan,
    used: false,
    active: false,
    activatedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString()
  });

  saveDB(db);
  return payment;
}

function activateKey(key) {
  key = String(key || "").trim().toUpperCase();

  const db = readDB();
  const customer = db.customers.find(c => c.key === key);

  if (!customer) throw new Error("Invalid KEY");
  if (customer.used) throw new Error("KEY already used");

  const plan = plans[customer.plan];
  if (!plan) throw new Error("Invalid membership plan");

  const now = Date.now();

  customer.used = true;
  customer.active = true;
  customer.activatedAt = new Date(now).toISOString();

  customer.expiresAt = plan.days === null
    ? null
    : new Date(now + plan.days * 24 * 60 * 60 * 1000).toISOString();

  saveDB(db);

  return {
    success: true,
    active: true,
    plan: customer.plan,
    expiresAt: customer.expiresAt,
    message: "KEY activated successfully"
  };
}

function checkAccess(key) {
  key = String(key || "").trim().toUpperCase();

  const db = readDB();
  const customer = db.customers.find(c => c.key === key);

  if (!customer) {
    return { active: false, message: "Invalid KEY" };
  }

  if (!customer.used || !customer.active) {
    return { active: false, message: "KEY not activated" };
  }

  if (customer.expiresAt &&
      Date.now() >= new Date(customer.expiresAt).getTime()) {
    customer.active = false;
    saveDB(db);

    return {
      active: false,
      expired: true,
      message: "Membership expired"
    };
  }

  return {
    active: true,
    plan: customer.plan,
    activatedAt: customer.activatedAt,
    expiresAt: customer.expiresAt,
    permanent: customer.expiresAt === null,
    message: "Membership active"
  };
}

module.exports = {
  createPayment,
  approvePayment,
  activateKey,
  checkAccess,
  readDB
};

