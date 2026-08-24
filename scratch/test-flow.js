const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load env
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUnpaidBooking() {
  console.log("=== STARTING TEST 1: UNPAID BOOKING ===");

  // Create a booking via API POST
  const start_time = "2026-08-27T12:45:00+05:30"; // Thursday 12:45 IST
  const end_time = "2026-08-27T13:15:00+05:30";   // Thursday 13:15 IST
  
  const payload = {
    service_id: "deep-transformation-program",
    client_name: "Test Unpaid User",
    client_email: "test-unpaid@example.com",
    client_phone: "919999999999",
    client_timezone: "Asia/Kolkata",
    start_time,
    end_time,
    notes: "Diagnostic Test 1",
  };

  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
  
  console.log("Creating booking via API...");
  const createRes = await fetch("http://localhost:3001/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json();
  if (!createData.ok) {
    console.error("Booking creation failed:", createData);
    return;
  }

  const bookingId = createData.id;
  console.log(`Booking created successfully! ID: ${bookingId}`);

  // Fetch Firestore doc immediately after creation
  let doc = await db.collection("bookings").doc(bookingId).get();
  let data = doc.data();
  console.log("\n[STATE BEFORE RAZORPAY]");
  console.log({
    bookingId,
    status: data.status,
    payment_status: data.payment_status,
    razorpay_order_id: data.order_id,
    razorpay_payment_id: data.razorpay_payment_id || null,
    payment_verified: data.payment_verified || false,
  });

  // Simulate create-order call (Frontend calls this to get order ID from Razorpay)
  console.log("\nSimulating Razorpay order creation...");
  const orderRes = await fetch("http://localhost:3001/api/bookings/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const orderData = await orderRes.json();
  console.log("Order Creation API Response:", orderData);

  // Fetch doc after order creation
  doc = await db.collection("bookings").doc(bookingId).get();
  data = doc.data();
  console.log("\n[STATE AFTER RAZORPAY ORDER CREATION]");
  console.log({
    bookingId,
    status: data.status,
    payment_status: data.payment_status,
    razorpay_order_id: data.order_id,
    razorpay_payment_id: data.razorpay_payment_id || null,
    payment_verified: data.payment_verified || false,
  });

  // Simulate payment cancel/dismiss (Updates Firestore directly)
  console.log("\nSimulating payment cancellation...");
  await db.collection("bookings").doc(bookingId).update({
    status: "pending",
    payment_status: "unpaid",
  });

  // Fetch doc after cancellation
  doc = await db.collection("bookings").doc(bookingId).get();
  data = doc.data();
  console.log("\n[STATE AFTER RAZORPAY CANCELLATION]");
  console.log({
    bookingId,
    status: data.status,
    payment_status: data.payment_status,
    razorpay_order_id: data.order_id,
    razorpay_payment_id: data.razorpay_payment_id || null,
    payment_verified: data.payment_verified || false,
  });

  // Check notification logs for this bookingId
  console.log("\nWaiting 5 seconds for background notification jobs to complete...");
  await delay(5000);

  console.log("\nChecking notification_logs in Firestore...");
  const logsSnap = await db.collection("notification_logs").where("bookingId", "==", bookingId).get();
  if (logsSnap.empty) {
    console.log("No notification logs found in DB for this booking.");
  } else {
    logsSnap.forEach(logDoc => {
      console.log("Log ID:", logDoc.id, "=>", logDoc.data());
    });
  }

  console.log("\nChecking whatsappLogs in Firestore...");
  const waSnap = await db.collection("whatsappLogs").orderBy("timestamp", "desc").limit(5).get();
  waSnap.forEach(waDoc => {
    const waData = waDoc.data();
    if (JSON.stringify(waData).includes(bookingId) || JSON.stringify(waData).includes("Test Unpaid")) {
      console.log("WhatsApp Log ID:", waDoc.id, "=>", waData);
    }
  });

  // Delete booking doc to clean up
  console.log("\nCleaning up test booking...");
  await db.collection("bookings").doc(bookingId).delete();
  await db.collection("session_locks").doc("2026-08-27_12-45").delete();
  console.log("Test 1 completed.");
}

async function testPaidBooking() {
  console.log("\n=== STARTING TEST 2: SUCCESSFUL PAYMENT ===");

  const start_time = "2026-08-27T12:45:00+05:30";
  const end_time = "2026-08-27T13:15:00+05:30";
  
  const payload = {
    service_id: "deep-transformation-program",
    client_name: "Test Paid User",
    client_email: "test-paid@example.com",
    client_phone: "919999999999",
    client_timezone: "Asia/Kolkata",
    start_time,
    end_time,
    notes: "Diagnostic Test 2",
  };

  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
  
  console.log("Creating booking via API...");
  const createRes = await fetch("http://localhost:3001/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json();
  const bookingId = createData.id;
  console.log(`Booking created successfully! ID: ${bookingId}`);

  // Simulate order creation
  console.log("Creating Razorpay order...");
  const orderRes = await fetch("http://localhost:3001/api/bookings/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const orderData = await orderRes.json();
  const orderId = orderData.order_id;
  console.log(`Order ID: ${orderId}`);

  // Verify payment (mock checkout success)
  console.log("\nSimulating /api/bookings/verify-payment POST request...");
  const verifyRes = await fetch("http://localhost:3001/api/bookings/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_payment_id: "pay_mock_" + bookingId,
      razorpay_order_id: orderId,
      razorpay_signature: "sig_mock_" + bookingId, // Signature check bypassed for mock payments
      booking_id: bookingId,
    }),
  });

  const verifyData = await verifyRes.json();
  console.log("Verify Payment API Response:", verifyData);

  // Fetch Firestore state after payment verification
  const doc = await db.collection("bookings").doc(bookingId).get();
  const data = doc.data();
  console.log("\n[STATE AFTER SUCCESSFUL PAYMENT VERIFICATION]");
  console.log({
    bookingId,
    status: data.status,
    payment_status: data.payment_status,
    razorpay_order_id: data.order_id,
    razorpay_payment_id: "pay_mock_" + bookingId,
    payment_verified: data.payment_verified || false,
    updated_at: data.updated_at,
  });

  // Check notification logs for this bookingId
  console.log("\nWaiting 5 seconds for background notification jobs to complete...");
  await delay(5000);

  console.log("\nChecking notification_logs in Firestore...");
  const logsSnap = await db.collection("notification_logs").where("bookingId", "==", bookingId).get();
  if (logsSnap.empty) {
    console.log("No notification logs found in DB for this booking.");
  } else {
    logsSnap.forEach(logDoc => {
      console.log("Log ID:", logDoc.id, "=>", logDoc.data());
    });
  }

  // Cleanup
  console.log("\nCleaning up test booking...");
  await db.collection("bookings").doc(bookingId).delete();
  await db.collection("session_locks").doc("2026-08-27_12-45").delete();
  console.log("Test 2 completed.");
}

async function main() {
  await testUnpaidBooking();
  await testPaidBooking();
}

main().catch(console.error);
