import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

const REFERRAL_BONUS_DAYS = 30;

/** Generate a 6-character alphanumeric referral code */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Get or create a referral code for a firm */
export async function getOrCreateReferralCode(firmId: string): Promise<string> {
  const firmRef = doc(db, 'firms', firmId);
  const firmDoc = await getDoc(firmRef);

  if (!firmDoc.exists()) throw new Error('Firm not found');

  const existing = firmDoc.data()?.referralCode;
  if (existing) return existing;

  // Generate unique code (retry if collision)
  let code = generateReferralCode();
  let found = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    const snap = await getDocs(
      query(collection(db, 'firms'), where('referralCode', '==', code))
    );
    if (snap.empty) {
      found = true;
      break;
    }
    code = generateReferralCode();
  }

  if (!found) throw new Error('Failed to generate unique referral code');

  await updateDoc(firmRef, { referralCode: code });
  return code;
}

/** Look up a firm by referral code */
export async function lookupReferralCode(code: string): Promise<{ firmId: string; firmName: string } | null> {
  const upperCode = code.toUpperCase().trim();
  if (upperCode.length !== 6) return null;

  const snapshot = await getDocs(
    query(collection(db, 'firms'), where('referralCode', '==', upperCode))
  );

  if (snapshot.empty) return null;

  const firmDoc = snapshot.docs[0];
  return {
    firmId: firmDoc.id,
    firmName: firmDoc.data().name || 'Unknown Firm',
  };
}

/** Record a referral when a new firm is created with a referral code */
export async function recordReferral(
  referrerFirmId: string,
  refereeFirmId: string,
  refereeUserId: string,
): Promise<void> {
  await addDoc(collection(db, 'referrals'), {
    referrerFirmId,
    refereeFirmId,
    refereeUserId,
    status: 'pending', // Becomes 'rewarded' when referee subscribes
    createdAt: serverTimestamp(),
  });

  // Store referrer info on the new firm
  await updateDoc(doc(db, 'firms', refereeFirmId), {
    referredBy: referrerFirmId,
  });
}

/** Get referral stats for a firm */
export async function getReferralStats(firmId: string): Promise<{
  totalReferrals: number;
  rewardedReferrals: number;
  bonusDaysEarned: number;
}> {
  const snapshot = await getDocs(
    query(collection(db, 'referrals'), where('referrerFirmId', '==', firmId))
  );

  let rewarded = 0;
  snapshot.docs.forEach((doc) => {
    if (doc.data().status === 'rewarded') rewarded++;
  });

  return {
    totalReferrals: snapshot.size,
    rewardedReferrals: rewarded,
    bonusDaysEarned: rewarded * REFERRAL_BONUS_DAYS,
  };
}

export { REFERRAL_BONUS_DAYS };
