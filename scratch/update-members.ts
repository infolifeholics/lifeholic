import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

async function updateExistingMembers() {
  try {
    const snap = await getDocs(collection(db, 'profiles'));
    const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort by created_at or fallback index
    let index = 1;
    for (const m of members as any[]) {
      // Avoid overwriting if they already have an LH ID assigned
      if (m.member_id && m.member_id.startsWith('LH')) {
        continue;
      }
      
      const padded = String(index).padStart(3, '0');
      const memberId = `LH${padded}`;
      
      await setDoc(doc(db, 'profiles', m.id), { member_id: memberId }, { merge: true });
      console.log(`Updated user ${m.full_name || m.email || m.id} with ID ${memberId}`);
      index++;
    }
    console.log('All existing profiles updated successfully!');
  } catch (err) {
    console.error('Update error:', err);
  }
}

updateExistingMembers();
