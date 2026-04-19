import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Background Audio Upload using Firebase Storage
export const uploadAudioToStorageSafe = async (blob: Blob, pathPrefix: string = 'music'): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null; // Fallback to local url if not logged in
  
  try {
    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.m4a`;
    const storageRef = ref(storage, `users/${user.uid}/${pathPrefix}/${fileName}`);
    
    // Attempt upload
    await uploadBytesResumable(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error("Firebase Storage Upload Error:", error);
    return null; // Return null to fallback to local parsing
  }
};

// Auth Helpers
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    // Throw a cleaner error message up to the UI
    const errorMessage = error.code ? `[${error.code}] ${error.message}` : String(error);
    throw new Error(errorMessage);
  }
};

export const logout = () => signOut(auth);

// User Profile Sync
export const syncUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error syncing user profile:", error);
  }
};
