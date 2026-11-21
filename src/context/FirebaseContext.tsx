import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
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
  getLocalSession,
  loginLocalAdmin,
  logoutLocalAdmin,
  setupLocalPasscode,
} from '../services/localMediaService';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../types';

export type AdminSessionMode = 'firebase' | 'local';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  adminCheckLoading: boolean;
  isConfigured: boolean;
  connectionOffline: boolean;
  authError: string | null;
  // Local Server Mode (No Firebase Required)
  localAuthenticated: boolean;
  localHasPasscode: boolean;
  localSessionReady: boolean;
  activeAdminMode: AdminSessionMode | null;
  signInWithGoogle: () => Promise<void>;
  signOutAdmin: () => Promise<void>;
  setupLocalAdmin: (passcode: string) => Promise<void>;
  signInLocalAdmin: (passcode: string) => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [connectionOffline, setConnectionOffline] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [localAuthenticated, setLocalAuthenticated] = useState(false);
  const [localHasPasscode, setLocalHasPasscode] = useState(false);
  const [localSessionReady, setLocalSessionReady] = useState(false);

  useEffect(() => {
    getLocalSession()
      .then((s) => {
        setLocalAuthenticated(s.authenticated);
        setLocalHasPasscode(s.hasPasscodeConfigured);
      })
      .finally(() => setLocalSessionReady(true));
  }, []);

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

      if (!nextUser) {
        setIsAdmin(false);
        setAdminCheckLoading(false);
        return;
      }

      setAdminCheckLoading(true);
      try {
        if (
          nextUser.emailVerified &&
          nextUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
        ) {
          setIsAdmin(true);
          setAdminCheckLoading(false);
          return;
        }

        const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdmin(adminDoc.exists() && nextUser.emailVerified);
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminCheckLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      setAuthError('Firebase configuration is missing. Use Local Server Mode or configure Firebase.');
      return;
    }
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(message);
    }
  };

  const setupLocalAdmin = async (passcode: string) => {
    setAuthError(null);
    try {
      await setupLocalPasscode(passcode);
      setLocalAuthenticated(true);
      setLocalHasPasscode(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to set up local passcode.');
      throw err;
    }
  };

  const signInLocalAdmin = async (passcode: string) => {
    setAuthError(null);
    try {
      await loginLocalAdmin(passcode);
      setLocalAuthenticated(true);
      setLocalHasPasscode(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid administrator passcode.');
      throw err;
    }
  };

  const signOutAdmin = async () => {
    setAuthError(null);
    if (localAuthenticated) {
      await logoutLocalAdmin();
      setLocalAuthenticated(false);
    }
    if (isFirebaseConfigured && auth?.currentUser) {
      await signOut(auth);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const activeAdminMode: AdminSessionMode | null =
    user && isAdmin ? 'firebase' : localAuthenticated ? 'local' : null;

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        adminCheckLoading,
        isConfigured: isFirebaseConfigured,
        connectionOffline,
        authError,
        localAuthenticated,
        localHasPasscode,
        localSessionReady,
        activeAdminMode,
        signInWithGoogle,
        signOutAdmin,
        setupLocalAdmin,
        signInLocalAdmin,
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
