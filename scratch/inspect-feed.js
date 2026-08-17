const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load .env manually
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.replace(/\\n/g, '\n');
  }
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID || 'lifeholics-a12c2',
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY
  })
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('landing_feed').get();
  console.log("Current landing_feed data in Firestore:");
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}

run().catch(console.error);
