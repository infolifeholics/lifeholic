const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load .env file manually
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

async function run() {
  console.log("Fetching session_slots...");
  const slotsSnap = await db.collection("session_slots").limit(5).get();
  slotsSnap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });

  console.log("\nFetching services...");
  const servicesSnap = await db.collection("services").limit(2).get();
  servicesSnap.forEach(doc => {
    console.log(doc.id, "=>", doc.data().title, "duration:", doc.data().duration_minutes);
  });
}

run().catch(console.error);
