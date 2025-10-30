const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Firebase initialization
const serviceAccount = require("./serviceAccountKey.json"); // Ensure this exists
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// Razorpay initialization
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1️⃣ Create Razorpay order
app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const options = { amount, currency, receipt: `rcpt_${Date.now()}` };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// 2️⃣ Save prebooking to Firebase
app.post("/save-prebooking", async (req, res) => {
  try {
    const data = req.body;
    const ref = db.ref("prebookings");
    const newBookingRef = ref.push();
    await newBookingRef.set({
      ...data,
      orderTime: new Date().toISOString()
    });
    res.json({ message: "Prebooking saved successfully" });
  } catch (err) {
    console.error("Error saving prebooking:", err);
    res.status(500).json({ error: "Failed to save prebooking" });
  }
});

// console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
// console.log("Razorpay Secret:", process.env.RAZORPAY_SECRET);

// ---------------- CREATE ORDER ----------------
app.post("/create-order", async (req, res) => {
  const { amount, currency, receipt } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency: currency || "INR",
      receipt: receipt || `receipt_order_${Date.now()}`,
      payment_capture: 1
    });

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------- SAVE ORDER TO FIREBASE ----------------
app.post("/save-order", async (req, res) => {
  const { name, phone, address, productId, amount, paymentId, status } = req.body;

  if (!name || !phone || !address || !productId || !amount || !paymentId) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const orderRef = db.ref("orders").push();
    await orderRef.set({
      name,
      phone,
      address,
      productId,
      amount,
      paymentId,
      status: status || "Pending",
      orderTime: new Date().toISOString()
    });

    res.status(200).json({ success: true, message: "Order saved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

