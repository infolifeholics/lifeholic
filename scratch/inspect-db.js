const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse .env file manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!privateKey || !clientEmail || !projectId) {
  console.error("Missing Firebase credentials in .env file!");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function inspect() {
  console.log("Connecting to Firestore database:", projectId);
  
  // List all collections
  const collections = await db.listCollections();
  console.log(`Found ${collections.length} collections.\n`);
  
  const report = [];
  
  for (const col of collections) {
    const colName = col.id;
    const snap = await db.collection(colName).limit(5).get();
    const countSnap = await db.collection(colName).count().get();
    const count = countSnap.data().count;
    
    // Sample document IDs and brief summary
    const samples = [];
    snap.forEach(doc => {
      samples.push({ id: doc.id, keys: Object.keys(doc.data()) });
    });
    
    report.push({
      collection: colName,
      count,
      samples
    });
  }
  
  console.log(JSON.stringify(report, null, 2));
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
