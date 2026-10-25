import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  getDocFromServer,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore (pass explicit databaseId if specified in config)
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

// Test Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or connecting...");
    }
    return false;
  }
}

// Automatically initiate connection check
testFirestoreConnection();

// Authentication helpers
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      // Sync basic user document in Firestore
      await syncUserToFirestore(result.user);
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

export async function syncUserToFirestore(user: FirebaseUser): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Citizen',
      photoURL: user.photoURL || '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error("Error syncing user document:", err);
  }
}

// Saved Schemes / Bookmarks Persistence in Firestore
export interface SavedSchemeData {
  id: string;
  title: string;
  name?: string;
  category: string;
  state?: string;
  benefitSummary?: string;
  benefits?: string;
  eligibility?: string;
  applyUrl?: string;
  savedAt: string | number;
}

export async function saveScheme(userId: string, scheme: SavedSchemeData): Promise<void> {
  try {
    const schemeRef = doc(db, 'users', userId, 'savedSchemes', scheme.id);
    await setDoc(schemeRef, {
      ...scheme,
      savedAt: scheme.savedAt || new Date().toISOString()
    });
  } catch (err) {
    console.error("Error saving scheme to Firestore:", err);
    throw err;
  }
}

export async function removeScheme(userId: string, schemeId: string): Promise<void> {
  try {
    const schemeRef = doc(db, 'users', userId, 'savedSchemes', schemeId);
    await deleteDoc(schemeRef);
  } catch (err) {
    console.error("Error removing scheme from Firestore:", err);
    throw err;
  }
}

export async function fetchSavedSchemes(userId: string): Promise<SavedSchemeData[]> {
  try {
    const collRef = collection(db, 'users', userId, 'savedSchemes');
    const snapshot = await getDocs(collRef);
    const list: SavedSchemeData[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as SavedSchemeData);
    });
    return list;
  } catch (err) {
    console.error("Error fetching saved schemes from Firestore:", err);
    return [];
  }
}

// Chat Session Persistence in Firestore
export interface StoredChatSession {
  id: string;
  userId: string;
  title: string;
  lastUpdated: string;
  messageCount: number;
  messages: any[];
}

export async function persistChatSession(
  userId: string, 
  messages: any[],
  modelTier?: string,
  sessionId?: string, 
  title?: string
): Promise<void> {
  try {
    const currentSessionId = sessionId || 'latest-consultation';
    const firstUserMsg = messages.find(m => m.role === 'user')?.content?.slice(0, 50);
    const sessionTitle = title || (firstUserMsg ? `${firstUserMsg}...` : `Consultation (${modelTier || 'AI'})`);
    const sessionRef = doc(db, 'users', userId, 'chatSessions', currentSessionId);
    await setDoc(sessionRef, {
      id: currentSessionId,
      userId,
      modelTier: modelTier || 'gemini-3.8-flash',
      title: sessionTitle,
      lastUpdated: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content || '',
        translatedContent: m.translatedContent || null,
        timestamp: new Date().toISOString()
      }))
    }, { merge: true });
  } catch (err) {
    console.error("Error saving chat session to Firestore:", err);
  }
}

export async function fetchUserChatSessions(userId: string): Promise<StoredChatSession[]> {
  try {
    const collRef = collection(db, 'users', userId, 'chatSessions');
    const q = query(collRef, limit(10));
    const snapshot = await getDocs(q);
    const sessions: StoredChatSession[] = [];
    snapshot.forEach(d => {
      sessions.push(d.data() as StoredChatSession);
    });
    return sessions;
  } catch (err) {
    console.error("Error fetching user chat sessions:", err);
    return [];
  }
}
