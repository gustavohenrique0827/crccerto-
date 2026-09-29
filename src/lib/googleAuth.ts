import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events'
];

export const TOKEN_STORAGE_KEY = 'google_calendar_access_token';
export const TOKEN_EXPIRY_KEY = 'google_calendar_token_expires_at';

const provider = new GoogleAuthProvider();
CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null);

export const isAccessTokenValid = (): boolean => {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return false;
  const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (expiresAt) {
    const exp = parseInt(expiresAt, 10);
    // 60-second safety margin
    if (!isNaN(exp) && Date.now() >= exp - 60000) {
      return false;
    }
  }
  return true;
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
};

export const saveAccessToken = (token: string, expiresInSeconds = 3500) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
    window.dispatchEvent(new CustomEvent('crm_google_token_updated', { detail: token }));
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (isAccessTokenValid()) {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, storedToken);
          return;
        }
      } else {
        clearCachedAccessToken();
      }
      if (onAuthFailure) onAuthFailure();
    } else {
      clearCachedAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso da autenticação Google.');
    }

    saveAccessToken(credential.accessToken, 3500);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Erro na autenticação com Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!isAccessTokenValid()) {
    clearCachedAccessToken();
    return null;
  }
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return null;
};

export const setCachedAccessToken = (token: string | null, expiresInSeconds = 3500) => {
  if (token) {
    saveAccessToken(token, expiresInSeconds);
  } else {
    clearCachedAccessToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_google_token_expired'));
    }
  }
};

export const getGoogleUser = (): User | null => {
  return auth.currentUser;
};

export const googleLogout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  clearCachedAccessToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm_google_logged_out'));
  }
};
