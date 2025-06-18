import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Error state for better error handling

  async function signup(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: displayName });
    
    // Create user document in Firestore with createdAt field
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName,
      createdAt: new Date() // Add creation date
    });

    return userCredential.user;
  } catch (error) {
    setError(error.message);
    throw error;
  }
}

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // New function to update user's display name in the auth object
  async function updateUserDisplayName(displayName) {
    if (!currentUser) throw new Error('No user is logged in');
    
    await updateProfile(currentUser, { displayName });
    
    // Update our local state to reflect the changes immediately
    // This ensures components using currentUser will re-render with new value
    setCurrentUser(prev => {
      // Create a new object to ensure React detects the change
      return { ...prev, displayName };
    });
    
    return currentUser;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserDisplayName, // Add the new function to the context
    error // Expose the error state to other components
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}