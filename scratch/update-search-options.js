const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('Could not read .env file:', e.message);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!privateKey || !clientEmail || !projectId) {
  console.error('Firebase Admin credentials are not fully configured in environment variables.');
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

async function run() {
  console.log('Fetching search options settings doc via Admin SDK...');
  const docRef = db.collection('settings').doc('search_options');
  const snap = await docRef.get();
  if (!snap.exists) {
    console.error('search_options document does not exist in settings collection.');
    process.exit(1);
  }

  const data = snap.data();
  const categories = data.categories || [];
  
  // Find finances category
  const finances = categories.find(c => c.id === 'finances');
  if (!finances) {
    console.error('Finances category not found in settings/search_options document.');
    process.exit(1);
  }

  // Check if Career subcategory already exists
  let careerSub = finances.subs.find(s => s.name === 'Career');
  
  const careerProblems = [
    'Career stagnation',
    'Frequent job changes',
    'Difficulty finding the right career',
    'Unemployment or long gaps between jobs',
    'Lack of growth or promotions',
    'Feeling stuck in the same position',
    'Lack of recognition at work',
    'Salary or income not increasing',
    'Difficulty attracting good opportunities',
    'Repeated career setbacks',
    'Workplace conflicts',
    'Difficulties with colleagues or seniors',
    'Job insecurity',
    'Fear of losing a job',
    'Lack of motivation at work',
    'Feeling unfulfilled by your career',
    'Confusion about career direction',
    'Difficulty starting a business',
    'Business growth getting stuck',
    'Repeated failures in professional ventures',
    'Difficulty getting clients or projects',
    'Lack of visibility or recognition',
    'Not being able to use your full potential',
    'Career opportunities coming but not materialising',
    'Feeling that hard work is not giving proportionate results',
    'Difficulty balancing career and personal life',
    'Sudden disruptions in career plans',
    'Difficulty returning to work after a career break',
    'Feeling unsupported in professional growth',
    'Repeatedly missing out on desired opportunities',
    'Feeling energetically or emotionally drained by work'
  ];

  if (!careerSub) {
    console.log('Career subcategory not found. Adding it...');
    finances.subs.push({
      name: 'Career',
      problems: careerProblems
    });
  } else {
    console.log('Career subcategory found. Merging problems...');
    careerSub.problems = careerProblems;
  }

  await docRef.set({ categories });
  console.log('Successfully updated settings/search_options document in Firestore!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error running admin update script:', err);
  process.exit(1);
});
