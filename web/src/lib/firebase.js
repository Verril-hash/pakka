import { initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';

// Firebase web config is public by design: it identifies the project, it doesn't grant access.
// Access is enforced by Firebase Auth, App Check, and the Pakka server verifying every token.
const firebaseConfig = {
  apiKey: 'AIzaSyBR9FqKNxpWRmoUbv-kyK-ZbkEEAbwTvR0',
  authDomain: 'pakka-552af.firebaseapp.com',
  projectId: 'pakka-552af',
  storageBucket: 'pakka-552af.firebasestorage.app',
  messagingSenderId: '785936219462',
  appId: '1:785936219462:web:e96fda1582eb6a1224b947',
};

export const firebaseApp = initializeApp(firebaseConfig);

// App Check proves a request comes from this website (reCAPTCHA Enterprise scores the browser), so scripts
// that call Firebase or the Pakka API directly, even with the public key above, are refused.
const appCheck = initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaEnterpriseProvider('6LcIovstAAAAAM_5-5wVkxk5SNtISD8Dhao8YXqp'),
  isTokenAutoRefreshEnabled: true,
});

/** A current App Check token for the Pakka API, or null if the browser couldn't get one. */
export async function appCheckToken() {
  try {
    return (await getToken(appCheck)).token;
  } catch {
    return null;
  }
}

export const auth = getAuth(firebaseApp);
auth.useDeviceLanguage();
