import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  auth,
  db,
  isFirebaseConfigured,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  changeLocalPasscode,
  getLocalSession,
  loginLocalAdmin,
  logoutLocalAdmin,
  recoverLocalPasscode,
  rotateLocalRecoveryKey,
  setupLocalPasscode,
} from '../services/localMediaService';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../types';

export type AdminSessionMode = 'firebase' | 'local';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isBootstrappedAdmin: boolean;
  adminCheckLoading: boolean;
  isConfigured: boolean;
  connectionOffline: boolean;
  authError: string | null;
  authErrorCode: string | null;
  // Local Server Mode (No Firebase / No Google Required)
  localAuthenticated: boolean;
  localHasPasscode: boolean;
  localHasRecoveryKey: boolean;
  localEnvControlled: boolean;
  localServerAvailable: boolean;
  localSessionReady: boolean;
  newRecoveryKeyBanner: string | null;
  activeAdminMode: AdminSessionMode | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthSession: () => Promise<void>;
  signOutAdmin: () => Promise<void>;
  setupLocalAdmin: (passcode: string) => Promise<void>;
  signInLocalAdmin: (passcode: string) => Promise<void>;
  recoverLocalAdmin: (recoveryKey: string, newPasscode: string) => Promise<void>;
  updateLocalPasscode: (currentPasscode: string, newPasscode: string) => Promise<void>;
  regenerateLocalRecoveryKey: () => Promise<string>;
  dismissRecoveryKeyBanner: () => void;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

function translateFirebaseAuthError(err: unknown, fallback: string): { code: string | null; message: string } {
  const code = (err as { code?: string })?.code ?? null;
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return {
      code,
      message: `Domain "${host}" is not yet authorized for OAuth popups in Firebase Authentication. Either sign in with Email & Password / Workshop Passcode above, or add this domain under Firebase Console → Authentication → Settings → Authorized domains.`,
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message:
        'Email/Password sign-in is not enabled yet in Firebase Authentication. Open Firebase Console → Authentication → Sign-in method and enable "Email/Password".',
    };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return {
      code,
      message:
        'Incorrect email or password. If this email was previously used with Google Sign-In, use "Set / Reset Password" to create a direct password.',
    };
  }
  if (code === 'auth/email-already-in-use') {
    return {
      code,
      message:
        'An account with this email already exists (for example via Google). Switch to "Sign In" or click "Set / Reset Password" to set a direct password.',
    };
  }
  if (code === 'auth/weak-password') {
    return {
      code,
      message: 'Please choose a stronger password (at least 6 characters).',
    };
  }
  if (code === 'auth/invalid-email') {
    return {
      code,
      message: 'Please enter a valid email address.',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      code,
      message: 'Too many attempts. Wait a couple of minutes or reset your password.',
    };
  }
  if (code === 'auth/popup-blocked') {
    return {
      code,
      message:
        'Your browser blocked the Google sign-in popup. Allow popups or sign in directly using Email & Password without Google.',
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      message: 'Google sign-in popup was closed before completing login.',
    };
  }
  return {
    code,
    message: err instanceof Error ? err.message : fallback,
  };
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBootstrappedAdmin, setIsBootstrappedAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [connectionOffline, setConnectionOffline] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);

  const [localAuthenticated, setLocalAuthenticated] = useState(false);
  const [localHasPasscode, setLocalHasPasscode] = useState(false);
  const [localHasRecoveryKey, setLocalHasRecoveryKey] = useState(false);
  const [localEnvControlled, setLocalEnvControlled] = useState(false);
  const [localServerAvailable, setLocalServerAvailable] = useState(false);
  const [localSessionReady, setLocalSessionReady] = useState(false);
  const [newRecoveryKeyBanner, setNewRecoveryKeyBanner] = useState<string | null>(null);

  useEffect(() => {
    getLocalSession()
      .then((s) => {
        setLocalAuthenticated(s.authenticated);
        setLocalHasPasscode(s.hasPasscodeConfigured);
        setLocalHasRecoveryKey(s.hasRecoveryKey);
        setLocalEnvControlled(s.envControlled);
        setLocalServerAvailable(s.available);
      })
      .finally(() => setLocalSessionReady(true));
  }, []);

  const evaluateAdminRole = async (targetUser: User | null) => {
    if (!targetUser) {
      setIsAdmin(false);
      setIsBootstrappedAdmin(false);
      setAdminCheckLoading(false);
      return;
    }

    setAdminCheckLoading(true);
    try {
      const bootstrapped = Boolean(
        targetUser.emailVerified &&
          targetUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
      );
      if (bootstrapped) {
        setIsBootstrappedAdmin(true);
        setIsAdmin(true);
        setAdminCheckLoading(false);
        return;
      }

      setIsBootstrappedAdmin(false);
      if (!targetUser.emailVerified) {
        setIsAdmin(false);
        setAdminCheckLoading(false);
        return;
      }

      const adminDoc = await getDoc(doc(db, 'admins', targetUser.uid));
      setIsAdmin(adminDoc.exists());
    } catch {
      setIsBootstrappedAdmin(false);
      setIsAdmin(false);
    } finally {
      setAdminCheckLoading(false);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthReady(true);
      setAdminCheckLoading(false);
      return;
    }

    testFirestoreConnection().then((res) => {
      if (res.offline) {
        setConnectionOffline(true);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      await evaluateAdminRole(nextUser);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      setAuthErrorCode('auth/not-configured');
      setAuthError('Firebase configuration is missing. Use Workshop Passcode Mode or configure Firebase.');
      return;
    }
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      const translated = translateFirebaseAuthError(err, 'Unable to sign in with Google.');
      setAuthErrorCode(translated.code);
      setAuthError(translated.message);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      setAuthErrorCode('auth/not-configured');
      setAuthError('Firebase configuration is missing. Use Workshop Passcode Mode.');
      throw new Error('Firebase configuration is missing.');
    }
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const translated = translateFirebaseAuthError(err, 'Unable to sign in with email and password.');
      setAuthErrorCode(translated.code);
      setAuthError(translated.message);
      throw err;
    }
  };

  const registerWithEmail = async (displayName: string, email: string, password: string) => {
    if (!isFirebaseConfigured) {
      setAuthErrorCode('auth/not-configured');
      setAuthError('Firebase configuration is missing.');
      throw new Error('Firebase configuration is missing.');
    }
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      await sendEmailVerification(cred.user);
      setUser({ ...cred.user } as User);
    } catch (err) {
      const translated = translateFirebaseAuthError(err, 'Unable to create administrator account.');
      setAuthErrorCode(translated.code);
      setAuthError(translated.message);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase configuration is missing.');
    }
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const translated = translateFirebaseAuthError(err, 'Unable to send password reset email.');
      setAuthErrorCode(translated.code);
      setAuthError(translated.message);
      throw new Error(translated.message);
    }
  };

  const resendVerificationEmail = async () => {
    if (!isFirebaseConfigured || !auth?.currentUser) {
      throw new Error('Sign in first to resend verification email.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      const translated = translateFirebaseAuthError(err, 'Unable to resend verification email.');
      throw new Error(translated.message);
    }
  };

  const refreshAuthSession = async () => {
    if (!isFirebaseConfigured || !auth?.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshed = auth.currentUser;
    setUser(refreshed ? ({ ...refreshed } as User) : null);
    await evaluateAdminRole(refreshed);
  };

  const setupLocalAdmin = async (passcode: string) => {
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const res = await setupLocalPasscode(passcode);
      setLocalAuthenticated(true);
      setLocalHasPasscode(true);
      setLocalHasRecoveryKey(true);
      setLocalEnvControlled(false);
      if (res.recoveryKey) {
        setNewRecoveryKeyBanner(res.recoveryKey);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to set up local passcode.');
      throw err;
    }
  };

  const signInLocalAdmin = async (passcode: string) => {
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const res = await loginLocalAdmin(passcode);
      setLocalAuthenticated(true);
      setLocalHasPasscode(true);
      setLocalHasRecoveryKey(res.hasRecoveryKey);
      setLocalEnvControlled(res.envControlled);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid administrator passcode.');
      throw err;
    }
  };

  const recoverLocalAdmin = async (recoveryKey: string, newPasscode: string) => {
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const res = await recoverLocalPasscode(recoveryKey, newPasscode);
      setLocalAuthenticated(true);
      setLocalHasPasscode(true);
      setLocalHasRecoveryKey(true);
      if (res.recoveryKey) {
        setNewRecoveryKeyBanner(res.recoveryKey);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to recover passcode.');
      throw err;
    }
  };

  const updateLocalPasscode = async (currentPasscode: string, newPasscode: string) => {
    await changeLocalPasscode(currentPasscode, newPasscode);
  };

  const regenerateLocalRecoveryKey = async (): Promise<string> => {
    const key = await rotateLocalRecoveryKey();
    setLocalHasRecoveryKey(true);
    setNewRecoveryKeyBanner(key);
    return key;
  };

  const dismissRecoveryKeyBanner = () => {
    setNewRecoveryKeyBanner(null);
  };

  const signOutAdmin = async () => {
    setAuthError(null);
    setAuthErrorCode(null);
    setNewRecoveryKeyBanner(null);
    if (localAuthenticated) {
      await logoutLocalAdmin();
      setLocalAuthenticated(false);
    }
    if (isFirebaseConfigured && auth?.currentUser) {
      await signOut(auth);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorCode(null);
  };

  const activeAdminMode: AdminSessionMode | null =
    user && isAdmin ? 'firebase' : localAuthenticated ? 'local' : null;

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        isBootstrappedAdmin,
        adminCheckLoading,
        isConfigured: isFirebaseConfigured,
        connectionOffline,
        authError,
        authErrorCode,
        localAuthenticated,
        localHasPasscode,
        localHasRecoveryKey,
        localEnvControlled,
        localServerAvailable,
        localSessionReady,
        newRecoveryKeyBanner,
        activeAdminMode,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshAuthSession,
        signOutAdmin,
        setupLocalAdmin,
        signInLocalAdmin,
        recoverLocalAdmin,
        updateLocalPasscode,
        regenerateLocalRecoveryKey,
        dismissRecoveryKeyBanner,
        clearAuthError,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
