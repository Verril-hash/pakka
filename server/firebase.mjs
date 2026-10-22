// Firebase Admin: verifies sign-in tokens from the web app (Google or phone sign-in), and gives the store Firestore.
// Locally it uses the service-account file; on Cloud Run there is no file, so it uses the service's own identity.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'pakka-552af';
const keyPath = resolve(process.env.FIREBASE_SERVICE_ACCOUNT ?? './firebase-service-account.json');
const credential = existsSync(keyPath) ? cert(JSON.parse(readFileSync(keyPath, 'utf8'))) : applicationDefault();

export const app = initializeApp({ credential, projectId: PROJECT_ID });
const auth = getAuth(app);

/** Returns the verified token claims, or throws. Revoked or disabled accounts are rejected. */
export function verifyIdToken(idToken) {
  return auth.verifyIdToken(String(idToken ?? ''), true);
}
