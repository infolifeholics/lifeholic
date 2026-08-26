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

// Batch delete helper
async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteNonAdminProfiles() {
  const allSnap = await db.collection('profiles').get();
  const batch = db.batch();
  let deleteCount = 0;
  allSnap.forEach(doc => {
    const data = doc.data();
    if (data.is_admin !== true) {
      batch.delete(doc.ref);
      deleteCount++;
    }
  });
  if (deleteCount > 0) {
    await batch.commit();
  }
  console.log(`- profiles (non-admin): deleted ${deleteCount} documents`);
}

const collectionsToDelete = [
  'bookings',
  'orders',
  'workshopRegistrations',
  'payments',
  'somatic_packages',
  'recentVisits',
  'notifications',
  'notification_logs',
  'failed_notifications',
  'whatsappLogs',
  'error_logs',
  'audit_logs',
  'session_locks',
  'free_call_bookings',
  'community_applications',
  'workshopFeedback',
  'blog_comments',
  'product_reviews',
  'newsletter'
];

async function cleanup() {
  console.log("Starting database cleanup for project:", projectId);
  
  for (const colName of collectionsToDelete) {
    const countSnap = await db.collection(colName).count().get();
    const countBefore = countSnap.data().count;
    
    await deleteCollection(colName);
    
    const countSnapAfter = await db.collection(colName).count().get();
    const countAfter = countSnapAfter.data().count;
    
    console.log(`- ${colName}: deleted ${countBefore} documents (Remaining: ${countAfter})`);
  }
  
  await deleteNonAdminProfiles();
  
  console.log("Cleanup complete!");
}

cleanup().catch(err => {
  console.error("Error during cleanup:", err);
  process.exit(1);
});
