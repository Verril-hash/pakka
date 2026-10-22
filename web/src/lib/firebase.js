import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase web config is public by design: it identifies the project, it doesn't grant access.
// Access is enforced by Firebase Auth and by the Pakka server verifying every ID token.
const firebaseConfig = {
  apiKey: 'AIzaSyBR9FqKNxpWRmoUbv-kyK-ZbkEEAbwTvR0',
  authDomain: 'pakka-552af.firebaseapp.com',
  projectId: 'pakka-552af',
  storageBucket: 'pakka-552af.firebasestorage.app',
  messagingSenderId: '785936219462',
  appId: '1:785936219462:web:e96fda1582eb6a1224b947',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
auth.useDeviceLanguage();
