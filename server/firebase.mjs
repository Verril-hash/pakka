// Firebase Admin: verifies sign-in tokens from the web app (Google or phone sign-in).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const keyPath = resolve(process.env.FIREBASE_SERVICE_ACCOUNT ?? './firebase-service-account.json');
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const auth = getAuth(app);

/** Returns the verified token claims, or throws. Revoked or disabled accounts are rejected. */
export function verifyIdToken(idToken) {
  return auth.verifyIdToken(String(idToken ?? ''), true);
}
